import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse, Notification } from "@/types";

interface SaveMeetingLinkBody {
  meetLink?: string;
}

interface SaveMeetingLinkData {
  success: boolean;
}

interface BookingRow {
  consultation_type: "physical" | "virtual";
  customer_id: string;
  id: string;
  status: string;
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
    return NextResponse.json<ApiResponse<SaveMeetingLinkData>>(
      { data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: SaveMeetingLinkBody;

  try {
    body = (await request.json()) as SaveMeetingLinkBody;
  } catch {
    return NextResponse.json<ApiResponse<SaveMeetingLinkData>>(
      { data: null, error: "Something went wrong. Please try again." },
      { status: 400 }
    );
  }

  const meetLink = body.meetLink?.trim();

  if (!meetLink) {
    return NextResponse.json<ApiResponse<SaveMeetingLinkData>>(
      { data: null, error: "Please enter a meeting link." },
      { status: 400 }
    );
  }

  try {
    new URL(meetLink);
  } catch {
    return NextResponse.json<ApiResponse<SaveMeetingLinkData>>(
      { data: null, error: "Please enter a valid meeting link." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const { data: booking } = await adminClient
    .from("bookings")
    .select("consultation_type, customer_id, id, status")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .maybeSingle<BookingRow>();

  if (!booking || booking.consultation_type !== "virtual" || booking.status !== "approved") {
    return NextResponse.json<ApiResponse<SaveMeetingLinkData>>(
      { data: null, error: "Meeting link cannot be saved for this booking." },
      { status: 400 }
    );
  }

  const { error: updateError } = await adminClient
    .from("bookings")
    .update({
      meet_link: meetLink,
      meeting_link_status: "available",
    })
    .eq("id", booking.id);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json<ApiResponse<SaveMeetingLinkData>>(
      { data: null, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  const { error: notificationError } = await adminClient.from("notifications").insert({
    body: "Your meeting link is now available on the booking detail page.",
    related_booking_id: booking.id,
    title: "Meeting link added",
    type: "booking_approved",
    user_id: booking.customer_id,
  } satisfies Partial<Notification>);

  if (notificationError) {
    console.error(notificationError);
  }

  return NextResponse.json<ApiResponse<SaveMeetingLinkData>>({
    data: { success: true },
    error: null,
  });
}
