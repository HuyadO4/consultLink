import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BOOKABLE_WINDOW_DAYS, buildAvailableBookingDates } from "@/lib/bookings";
import { addDays, getTodayInWAT } from "@/lib/utils/date";
import type { ApiResponse, AvailabilitySlot, Booking, ConsultationType } from "@/types";
import type { AvailableBookingDate } from "@/types";

interface ListingAvailabilityData {
  availableDates: AvailableBookingDate[];
  consultationType: ConsultationType;
  durationMinutes: number;
}

interface ListingRow {
  consultant_id: string;
  consultation_type: ConsultationType;
  duration_minutes: number;
  status: "approved" | "pending" | "rejected";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiResponse<ListingAvailabilityData>>(
      {
        data: null,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  const { id } = await params;
  const { data: listing } = await adminClient
    .from("listings")
    .select("consultant_id, consultation_type, duration_minutes, status")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle<ListingRow>();

  if (!listing) {
    return NextResponse.json<ApiResponse<ListingAvailabilityData>>(
      {
        data: null,
        error: "Listing not found.",
      },
      { status: 404 }
    );
  }

  const today = getTodayInWAT();
  const lastBookableDate = addDays(today, BOOKABLE_WINDOW_DAYS - 1);

  const [{ data: availability }, { data: bookings }] = await Promise.all([
    adminClient
      .from("availability_slots")
      .select("day_of_week, start_time, end_time")
      .eq("consultant_id", listing.consultant_id)
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
    adminClient
      .from("bookings")
      .select("id, scheduled_date, start_time, end_time, status")
      .eq("consultant_id", listing.consultant_id)
      .in("status", ["pending", "approved"])
      .gte("scheduled_date", today)
      .lte("scheduled_date", lastBookableDate),
  ]);

  const availableDates = buildAvailableBookingDates({
    availability: (availability ?? []) as Pick<
      AvailabilitySlot,
      "day_of_week" | "end_time" | "start_time"
    >[],
    bookings: (bookings ?? []) as Pick<
      Booking,
      "end_time" | "id" | "scheduled_date" | "start_time" | "status"
    >[],
    durationMinutes: listing.duration_minutes,
  });

  return NextResponse.json<ApiResponse<ListingAvailabilityData>>({
    data: {
      availableDates,
      consultationType: listing.consultation_type,
      durationMinutes: listing.duration_minutes,
    },
    error: null,
  });
}
