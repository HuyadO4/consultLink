import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  PAYMENT_INCOMPLETE_MESSAGE,
  SLOT_TAKEN_MESSAGE,
  buildBookingReference,
  calculateEndTime,
  isSlotAvailable,
  isValidConsultationTypeSelection,
} from "@/lib/bookings";
import { getDayOfWeek, getTodayInWAT, normalizeTimeValue } from "@/lib/utils/date";
import { initializePaystackTransaction } from "@/lib/paystack";
import type {
  ApiResponse,
  AvailabilitySlot,
  Booking,
  ConsultationType,
  Profile,
} from "@/types";

interface InitiateBookingRequest {
  consultationType: "physical" | "virtual";
  listingId: string;
  scheduledDate: string;
  startTime: string;
}

interface InitiateBookingData {
  accessCode: string;
  bookingId: string;
  reference: string;
}

interface ListingRow {
  consultant_id: string;
  consultation_type: ConsultationType;
  duration_minutes: number;
  id: string;
  price: number;
  title: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiResponse<InitiateBookingData>>(
      {
        data: null,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  let body: InitiateBookingRequest;

  try {
    body = (await request.json()) as InitiateBookingRequest;
  } catch {
    return NextResponse.json<ApiResponse<InitiateBookingData>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 400 }
    );
  }

  if (
    !body.listingId ||
    !body.scheduledDate ||
    !body.startTime ||
    !["physical", "virtual"].includes(body.consultationType)
  ) {
    return NextResponse.json<ApiResponse<InitiateBookingData>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 400 }
    );
  }

  const [{ data: profile }, { data: listing }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle<Pick<Profile, "full_name">>(),
    adminClient
      .from("listings")
      .select("id, consultant_id, consultation_type, duration_minutes, price, title")
      .eq("id", body.listingId)
      .eq("status", "approved")
      .maybeSingle<ListingRow>(),
  ]);

  if (!listing || !user.email) {
    return NextResponse.json<ApiResponse<InitiateBookingData>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 400 }
    );
  }

  if (!isValidConsultationTypeSelection(listing.consultation_type, body.consultationType)) {
    return NextResponse.json<ApiResponse<InitiateBookingData>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 400 }
    );
  }

  const requestedDay = getDayOfWeek(body.scheduledDate);
  const normalizedStartTime = normalizeTimeValue(body.startTime);
  const today = getTodayInWAT();

  if (body.scheduledDate < today) {
    return NextResponse.json<ApiResponse<InitiateBookingData>>(
      {
        data: null,
        error: SLOT_TAKEN_MESSAGE,
      },
      { status: 409 }
    );
  }

  const [{ data: availability }, { data: bookings }] = await Promise.all([
    adminClient
      .from("availability_slots")
      .select("day_of_week, start_time, end_time")
      .eq("consultant_id", listing.consultant_id)
      .eq("day_of_week", requestedDay)
      .eq("is_active", true)
      .order("start_time", { ascending: true }),
    adminClient
      .from("bookings")
      .select("id, scheduled_date, start_time, end_time, status")
      .eq("consultant_id", listing.consultant_id)
      .eq("scheduled_date", body.scheduledDate)
      .in("status", ["pending", "approved"]),
  ]);

  const slotIsAvailable = isSlotAvailable({
    availability: (availability ?? []) as Pick<
      AvailabilitySlot,
      "day_of_week" | "end_time" | "start_time"
    >[],
    bookings: (bookings ?? []) as Pick<
      Booking,
      "end_time" | "id" | "scheduled_date" | "start_time" | "status"
    >[],
    durationMinutes: listing.duration_minutes,
    scheduledDate: body.scheduledDate,
    startTime: normalizedStartTime,
  });

  if (!slotIsAvailable) {
    return NextResponse.json<ApiResponse<InitiateBookingData>>(
      {
        data: null,
        error: SLOT_TAKEN_MESSAGE,
      },
      { status: 409 }
    );
  }

  const bookingId = crypto.randomUUID();
  const paymentReference = buildBookingReference(bookingId);
  const endTime = calculateEndTime(normalizedStartTime, listing.duration_minutes);

  const { error: insertError } = await adminClient.from("bookings").insert({
    amount_paid: null,
    consultant_id: listing.consultant_id,
    consultation_type: body.consultationType,
    customer_id: user.id,
    end_time: endTime,
    id: bookingId,
    listing_id: listing.id,
    payment_reference: paymentReference,
    payment_status: "unpaid",
    scheduled_date: body.scheduledDate,
    start_time: normalizedStartTime,
    status: "initiated",
  });

  if (insertError) {
    console.error(insertError);
    return NextResponse.json<ApiResponse<InitiateBookingData>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }

  try {
    const callbackUrl = `${new URL(request.url).origin}/user/bookings/${bookingId}`;
    const paystackTransaction = await initializePaystackTransaction({
      amount: listing.price,
      callbackUrl,
      email: user.email,
      metadata: {
        bookingId,
        consultantName: profile?.full_name ?? "",
        listingTitle: listing.title,
      },
      reference: paymentReference,
    });

    if (paystackTransaction.reference !== paymentReference) {
      await adminClient
        .from("bookings")
        .update({
          payment_reference: paystackTransaction.reference,
        })
        .eq("id", bookingId);
    }

    return NextResponse.json<ApiResponse<InitiateBookingData>>({
      data: {
        accessCode: paystackTransaction.access_code,
        bookingId,
        reference: paystackTransaction.reference,
      },
      error: null,
    });
  } catch (error) {
    console.error(error);

    await adminClient
      .from("bookings")
      .delete()
      .eq("id", bookingId)
      .eq("customer_id", user.id)
      .eq("status", "initiated")
      .eq("payment_status", "unpaid");

    return NextResponse.json<ApiResponse<InitiateBookingData>>(
      {
        data: null,
        error: PAYMENT_INCOMPLETE_MESSAGE,
      },
      { status: 500 }
    );
  }
}
