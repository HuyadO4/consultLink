import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { isValidPaystackSignature } from "@/lib/paystack";
import type { ApiResponse, Booking, Listing, Notification, PaymentStatus } from "@/types";

interface PaystackWebhookPayload {
  data?: {
    amount?: number;
    paid_at?: string | null;
    reference?: string;
    status?: string;
  };
  event?: string;
}

interface BookingRow {
  consultant_id: string;
  customer_id: string;
  id: string;
  listing: Pick<Listing, "price" | "title"> | null;
  payment_status: PaymentStatus;
  status: Booking["status"];
}

function getApprovalDeadline() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!isValidPaystackSignature(rawBody, signature)) {
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: "Invalid signature.",
      },
      { status: 400 }
    );
  }

  let payload: PaystackWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as PaystackWebhookPayload;
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: "Invalid payload.",
      },
      { status: 400 }
    );
  }

  if (payload.event !== "charge.success" || !payload.data?.reference || payload.data.status !== "success") {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: null,
    });
  }

  const { data: booking } = await adminClient
    .from("bookings")
    .select("consultant_id, customer_id, id, payment_status, status, listing:listings(price, title)")
    .eq("payment_reference", payload.data.reference)
    .maybeSingle<BookingRow>();

  if (!booking) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: null,
    });
  }

  if (booking.payment_status === "paid" && booking.status === "pending") {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: null,
    });
  }

  if (!booking.listing || booking.listing.price !== payload.data.amount) {
    console.error("Paystack webhook amount mismatch", {
      bookingId: booking.id,
      expectedAmount: booking.listing?.price,
      receivedAmount: payload.data.amount,
      reference: payload.data.reference,
    });

    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: null,
    });
  }

  const { error: updateError } = await adminClient
    .from("bookings")
    .update({
      amount_paid: payload.data.amount,
      approval_deadline: getApprovalDeadline(),
      payment_status: "paid",
      status: "pending",
    })
    .eq("id", booking.id)
    .eq("status", "initiated");

  if (updateError) {
    console.error(updateError);
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }

  const notifications: Partial<Notification>[] = [
    {
      body: `You have a new booking request for ${booking.listing.title}.`,
      related_booking_id: booking.id,
      title: "New booking request",
      type: "booking_created",
      user_id: booking.consultant_id,
    },
    {
      body: "Payment received - awaiting approval.",
      related_booking_id: booking.id,
      title: "Payment received",
      type: "payment_success",
      user_id: booking.customer_id,
    },
  ];

  const { error: notificationError } = await adminClient.from("notifications").insert(notifications);

  if (notificationError) {
    console.error(notificationError);
  }

  return NextResponse.json<ApiResponse<null>>({
    data: null,
    error: null,
  });
}
