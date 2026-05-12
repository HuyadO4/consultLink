import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { tryGenerateMeetingLink } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, Booking, Notification } from "@/types";

interface ApproveBookingData {
  success: boolean;
}

interface BookingRow {
  consultation_type: Booking["consultation_type"];
  customer_id: string;
  id: string;
  listing: {
    title: string;
  } | null;
  payment_status: Booking["payment_status"];
  scheduled_date: string;
  start_time: string;
  status: Booking["status"];
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiResponse<ApproveBookingData>>(
      { data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const { data: booking } = await adminClient
    .from("bookings")
    .select(
      "id, customer_id, consultation_type, payment_status, scheduled_date, start_time, status, listing:listings(title)"
    )
    .eq("id", id)
    .eq("consultant_id", user.id)
    .maybeSingle<BookingRow>();

  if (!booking || booking.status !== "pending" || booking.payment_status !== "paid") {
    return NextResponse.json<ApiResponse<ApproveBookingData>>(
      { data: null, error: "Booking not found or cannot be approved." },
      { status: 400 }
    );
  }

  const meetLink =
    booking.consultation_type === "virtual" ? tryGenerateMeetingLink(booking.id) : null;
  const meetingLinkStatus =
    booking.consultation_type === "virtual"
      ? meetLink
        ? "available"
        : "manual_required"
      : "not_required";

  const { error: updateError } = await adminClient
    .from("bookings")
    .update({
      meet_link: meetLink,
      meeting_link_status: meetingLinkStatus,
      rejection_reason: null,
      status: "approved",
    })
    .eq("id", booking.id)
    .eq("status", "pending");

  if (updateError) {
    console.error(updateError);
    return NextResponse.json<ApiResponse<ApproveBookingData>>(
      { data: null, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  const notifications: Partial<Notification>[] = [
    {
      body: meetLink
        ? "Your booking has been confirmed and your meeting link is ready."
        : "Your booking has been confirmed.",
      related_booking_id: booking.id,
      title: "Your booking has been confirmed.",
      type: "booking_approved",
      user_id: booking.customer_id,
    },
  ];

  if (booking.consultation_type === "virtual" && !meetLink) {
    notifications.push({
      body: `Meeting link could not be generated automatically for ${booking.listing?.title ?? "this booking"}. Please add your link manually.`,
      related_booking_id: booking.id,
      title: "Meeting link could not be generated automatically. Please add your link manually.",
      type: "meeting_link_manual_required",
      user_id: user.id,
    });
  }

  const { error: notificationError } = await adminClient.from("notifications").insert(notifications);

  if (notificationError) {
    console.error(notificationError);
  }

  return NextResponse.json<ApiResponse<ApproveBookingData>>({
    data: { success: true },
    error: null,
  });
}
