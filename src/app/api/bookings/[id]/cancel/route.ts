import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

interface CancelBookingData {
  cancelled: boolean;
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
    return NextResponse.json<ApiResponse<CancelBookingData>>(
      {
        data: null,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  const { id } = await params;

  const { error } = await adminClient
    .from("bookings")
    .delete()
    .eq("id", id)
    .eq("customer_id", user.id)
    .eq("status", "initiated")
    .eq("payment_status", "unpaid");

  if (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<CancelBookingData>>(
      {
        data: null,
        error: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<CancelBookingData>>({
    data: {
      cancelled: true,
    },
    error: null,
  });
}
