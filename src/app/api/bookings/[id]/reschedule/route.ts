import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  SLOT_TAKEN_MESSAGE,
  calculateEndTime,
  isSlotAvailable,
} from "@/lib/bookings";
import { formatDateTime, getDayOfWeek, normalizeTimeValue } from "@/lib/utils/date";
import type { ApiResponse, AvailabilitySlot, Booking, Profile } from "@/types";

interface RescheduleBookingRequest {
  scheduledDate: string;
  startTime: string;
}

interface RescheduleBookingData {
  success: boolean;
}

interface BookingRow {
  consultant_id: string;
  customer_id: string;
  id: string;
  listing_id: string;
  payment_status: Booking["payment_status"];
  status: Booking["status"];
}

interface ListingRow {
  duration_minutes: number;
  title: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiResponse<RescheduleBookingData>>(
      {
        data: null,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  const { id } = await params;
  let body: RescheduleBookingRequest;

  try {
    body = (await request.json()) as RescheduleBookingRequest;
  } catch {
    return NextResponse.json<ApiResponse<RescheduleBookingData>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 400 }
    );
  }

  if (!body.scheduledDate || !body.startTime) {
    return NextResponse.json<ApiResponse<RescheduleBookingData>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 400 }
    );
  }

  const [{ data: booking }, { data: profile }] = await Promise.all([
    adminClient
      .from("bookings")
      .select("consultant_id, customer_id, id, listing_id, payment_status, status")
      .eq("id", id)
      .eq("customer_id", user.id)
      .maybeSingle<BookingRow>(),
    adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle<Pick<Profile, "full_name">>(),
  ]);

  if (!booking || booking.status !== "pending" || booking.payment_status !== "paid") {
    return NextResponse.json<ApiResponse<RescheduleBookingData>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 400 }
    );
  }

  const [{ data: listing }, { data: availability }, { data: existingBookings }] = await Promise.all([
    adminClient
      .from("listings")
      .select("duration_minutes, title")
      .eq("id", booking.listing_id)
      .maybeSingle<ListingRow>(),
    adminClient
      .from("availability_slots")
      .select("day_of_week, start_time, end_time")
      .eq("consultant_id", booking.consultant_id)
      .eq("day_of_week", getDayOfWeek(body.scheduledDate))
      .eq("is_active", true)
      .order("start_time", { ascending: true }),
    adminClient
      .from("bookings")
      .select("id, scheduled_date, start_time, end_time, status")
      .eq("consultant_id", booking.consultant_id)
      .eq("scheduled_date", body.scheduledDate)
      .in("status", ["pending", "approved"]),
  ]);

  if (!listing) {
    return NextResponse.json<ApiResponse<RescheduleBookingData>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 400 }
    );
  }

  const normalizedStartTime = normalizeTimeValue(body.startTime);
  const slotIsAvailable = isSlotAvailable({
    availability: (availability ?? []) as Pick<
      AvailabilitySlot,
      "day_of_week" | "end_time" | "start_time"
    >[],
    bookings: (existingBookings ?? []) as Pick<
      Booking,
      "end_time" | "id" | "scheduled_date" | "start_time" | "status"
    >[],
    durationMinutes: listing.duration_minutes,
    excludeBookingId: booking.id,
    scheduledDate: body.scheduledDate,
    startTime: normalizedStartTime,
  });

  if (!slotIsAvailable) {
    return NextResponse.json<ApiResponse<RescheduleBookingData>>(
      {
        data: null,
        error: SLOT_TAKEN_MESSAGE,
      },
      { status: 409 }
    );
  }

  const endTime = calculateEndTime(normalizedStartTime, listing.duration_minutes);
  const { error: updateError } = await adminClient
    .from("bookings")
    .update({
      end_time: endTime,
      scheduled_date: body.scheduledDate,
      start_time: normalizedStartTime,
    })
    .eq("id", booking.id)
    .eq("customer_id", user.id)
    .eq("status", "pending");

  if (updateError) {
    console.error(updateError);
    return NextResponse.json<ApiResponse<RescheduleBookingData>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }

  await adminClient.from("notifications").insert({
    body: `${profile?.full_name ?? "A customer"} rescheduled ${listing.title} to ${formatDateTime(
      body.scheduledDate,
      normalizedStartTime
    )}.`,
    related_booking_id: booking.id,
    title: "Booking rescheduled",
    type: "booking_created",
    user_id: booking.consultant_id,
  });

  return NextResponse.json<ApiResponse<RescheduleBookingData>>({
    data: {
      success: true,
    },
    error: null,
  });
}
