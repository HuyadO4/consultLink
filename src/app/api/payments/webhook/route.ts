import { NextResponse } from "next/server";
import { finalizeBookingPayment } from "@/lib/payments";
import { isValidPaystackSignature } from "@/lib/paystack";
import type { ApiResponse } from "@/types";

interface PaystackWebhookPayload {
  data?: {
    amount?: number;
    paid_at?: string | null;
    reference?: string;
    status?: string;
  };
  event?: string;
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

  if (
    payload.event !== "charge.success" ||
    !payload.data?.reference ||
    typeof payload.data.amount !== "number" ||
    payload.data.status !== "success"
  ) {
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      error: null,
    });
  }

  try {
    await finalizeBookingPayment({
      amount: payload.data.amount,
      paymentReference: payload.data.reference,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<null>>({
    data: null,
    error: null,
  });
}
