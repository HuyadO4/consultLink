import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isPast } from "@/lib/utils/date";
import type { ApiResponse, Booking } from "@/types";

interface CreateReviewBody {
  bookingId?: string;
  comment?: string;
  rating?: number;
}

interface CreateReviewData {
  success: boolean;
}

interface BookingRow {
  consultant_id: string;
  customer_id: string;
  id: string;
  listing_id: string;
  scheduled_date: string;
  status: Booking["status"];
  end_time: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiResponse<CreateReviewData>>(
      { data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: CreateReviewBody;

  try {
    body = (await request.json()) as CreateReviewBody;
  } catch {
    return NextResponse.json<ApiResponse<CreateReviewData>>(
      { data: null, error: "Something went wrong. Please try again." },
      { status: 400 }
    );
  }

  if (!body.bookingId || typeof body.rating !== "number" || body.rating < 1 || body.rating > 5) {
    return NextResponse.json<ApiResponse<CreateReviewData>>(
      { data: null, error: "Please provide a rating between 1 and 5." },
      { status: 400 }
    );
  }

  const { data: booking } = await adminClient
    .from("bookings")
    .select("consultant_id, customer_id, end_time, id, listing_id, scheduled_date, status")
    .eq("id", body.bookingId)
    .eq("customer_id", user.id)
    .maybeSingle<BookingRow>();

  if (
    !booking ||
    !["approved", "completed"].includes(booking.status) ||
    !isPast(booking.scheduled_date, booking.end_time)
  ) {
    return NextResponse.json<ApiResponse<CreateReviewData>>(
      { data: null, error: "This booking is not eligible for a review yet." },
      { status: 400 }
    );
  }

  const { data: existingReview } = await adminClient
    .from("reviews")
    .select("id")
    .eq("booking_id", booking.id)
    .maybeSingle();

  if (existingReview) {
    return NextResponse.json<ApiResponse<CreateReviewData>>(
      { data: null, error: "You have already reviewed this booking." },
      { status: 400 }
    );
  }

  const { error } = await adminClient.from("reviews").insert({
    booking_id: booking.id,
    comment: body.comment?.trim() || null,
    consultant_id: booking.consultant_id,
    customer_id: booking.customer_id,
    listing_id: booking.listing_id,
    rating: body.rating,
  });

  if (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<CreateReviewData>>(
      { data: null, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<CreateReviewData>>({
    data: { success: true },
    error: null,
  });
}
