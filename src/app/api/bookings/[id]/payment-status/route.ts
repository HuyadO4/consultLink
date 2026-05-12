import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_INCOMPLETE_MESSAGE } from "@/lib/bookings";
import { finalizeBookingPayment } from "@/lib/payments";
import { verifyPaystackTransaction } from "@/lib/paystack";
import type { ApiResponse, Booking, Listing, PaymentStatus } from "@/types";

interface PaymentStatusData {
  message: string | null;
  state: "confirmed" | "failed" | "processing";
}

interface BookingRow {
  id: string;
  listing: Array<Pick<Listing, "price">>;
  payment_reference: string | null;
  payment_status: PaymentStatus;
  status: Booking["status"];
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
    return NextResponse.json<ApiResponse<PaymentStatusData>>(
      {
        data: null,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  const { id } = await params;
  const { data: booking } = await adminClient
    .from("bookings")
    .select("id, listing:listings(price), payment_reference, payment_status, status")
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle<BookingRow>();

  if (!booking) {
    return NextResponse.json<ApiResponse<PaymentStatusData>>(
      {
        data: null,
        error: "Booking not found.",
      },
      { status: 404 }
    );
  }

  if (booking.status === "pending" && booking.payment_status === "paid") {
    return NextResponse.json<ApiResponse<PaymentStatusData>>({
      data: {
        message: null,
        state: "confirmed",
      },
      error: null,
    });
  }

  if (booking.status !== "initiated" || !booking.payment_reference) {
    return NextResponse.json<ApiResponse<PaymentStatusData>>({
      data: {
        message: null,
        state: "processing",
      },
      error: null,
    });
  }

  try {
    const paymentReference = booking.payment_reference;
    const transaction = await verifyPaystackTransaction(paymentReference);

    if (transaction.status === "success" && typeof transaction.amount === "number") {
      const finalization = await finalizeBookingPayment({
        amount: transaction.amount,
        bookingId: booking.id,
        paymentReference,
      });

      if (finalization.confirmed) {
        return NextResponse.json<ApiResponse<PaymentStatusData>>({
          data: {
            message: null,
            state: "confirmed",
          },
          error: null,
        });
      }
    }

    if (["abandoned", "failed", "reversed"].includes(transaction.status)) {
      await adminClient
        .from("bookings")
        .delete()
        .eq("id", booking.id)
        .eq("customer_id", user.id)
        .eq("status", "initiated")
        .eq("payment_status", "unpaid");

      return NextResponse.json<ApiResponse<PaymentStatusData>>({
        data: {
          message: PAYMENT_INCOMPLETE_MESSAGE,
          state: "failed",
        },
        error: null,
      });
    }
  } catch (error) {
    console.error(error);
  }

  return NextResponse.json<ApiResponse<PaymentStatusData>>({
    data: {
      message: null,
      state: "processing",
    },
    error: null,
  });
}
