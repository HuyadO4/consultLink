import { NextResponse } from "next/server";
import { refundPaystackTransaction } from "@/lib/paystack";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, Booking, Notification } from "@/types";

interface RejectBookingBody {
  reason?: string;
}

interface RejectBookingData {
  success: boolean;
}

interface BookingRow {
  amount_paid: number | null;
  customer_id: string;
  id: string;
  listing: {
    title: string;
  } | null;
  payment_reference: string | null;
  payment_status: Booking["payment_status"];
  status: Booking["status"];
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
    return NextResponse.json<ApiResponse<RejectBookingData>>(
      { data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: RejectBookingBody = {};

  try {
    body = (await request.json()) as RejectBookingBody;
  } catch {}

  const { id } = await params;
  const { data: booking } = await adminClient
    .from("bookings")
    .select("amount_paid, customer_id, id, payment_reference, payment_status, status, listing:listings(title)")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .maybeSingle<BookingRow>();

  if (!booking || booking.status !== "pending" || booking.payment_status !== "paid") {
    return NextResponse.json<ApiResponse<RejectBookingData>>(
      { data: null, error: "Booking not found or cannot be rejected." },
      { status: 400 }
    );
  }

  try {
    if (booking.payment_reference) {
      await refundPaystackTransaction({
        amount: booking.amount_paid ?? undefined,
        reason: body.reason?.trim(),
        reference: booking.payment_reference,
      });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<RejectBookingData>>(
      { data: null, error: "Unable to trigger refund right now. Please try again." },
      { status: 502 }
    );
  }

  const rejectionReason = body.reason?.trim() || null;
  const { error: updateError } = await adminClient
    .from("bookings")
    .update({
      consultant_notes: rejectionReason,
      meeting_link_status: "not_required",
      payment_status: "refunded",
      rejection_reason: rejectionReason,
      status: "rejected",
    })
    .eq("id", booking.id)
    .eq("status", "pending");

  if (updateError) {
    console.error(updateError);
    return NextResponse.json<ApiResponse<RejectBookingData>>(
      { data: null, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  const { error: notificationError } = await adminClient.from("notifications").insert([
    {
      body: rejectionReason
        ? `Your booking for ${booking.listing?.title ?? "this consultation"} was rejected. Reason: ${rejectionReason}`
        : `Your booking for ${booking.listing?.title ?? "this consultation"} was rejected and refunded.`,
      related_booking_id: booking.id,
      title: "Your booking could not be fulfilled.",
      type: "booking_rejected",
      user_id: booking.customer_id,
    },
    {
      body: "Your refund has been initiated.",
      related_booking_id: booking.id,
      title: "Refund processed",
      type: "payment_refunded",
      user_id: booking.customer_id,
    },
  ] satisfies Partial<Notification>[]);

  if (notificationError) {
    console.error(notificationError);
  }

  return NextResponse.json<ApiResponse<RejectBookingData>>({
    data: { success: true },
    error: null,
  });
}
