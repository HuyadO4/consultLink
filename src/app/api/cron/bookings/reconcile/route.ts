import { NextResponse } from "next/server";
import { refundPaystackTransaction } from "@/lib/paystack";
import { adminClient } from "@/lib/supabase/admin";
import { formatDateTime, getTodayInWAT, isPast } from "@/lib/utils/date";
import type { ApiResponse, Booking, Notification } from "@/types";

interface ReconcileData {
  completed: number;
  expired: number;
  reminded: number;
}

interface PendingBookingRow {
  amount_paid: number | null;
  approval_deadline: string | null;
  consultant_id: string;
  customer_id: string;
  id: string;
  listing: Array<{
    title: string;
  }>;
  payment_reference: string | null;
  payment_status: Booking["payment_status"];
  status: Booking["status"];
}

interface ApprovedBookingRow {
  consultation_type: Booking["consultation_type"];
  consultant_id: string;
  customer_id: string;
  id: string;
  listing: Array<{
    title: string;
  }>;
  meet_link: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: Booking["status"];
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");

  if (!cronSecret || !providedSecret) {
    return false;
  }

  return cronSecret === providedSecret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json<ApiResponse<ReconcileData>>(
      { data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const now = new Date();
  const today = getTodayInWAT();

  const [{ data: pendingBookings }, { data: approvedBookings }] = await Promise.all([
    adminClient
      .from("bookings")
      .select(
        "amount_paid, approval_deadline, consultant_id, customer_id, id, payment_reference, payment_status, status, listing:listings(title)"
      )
      .eq("status", "pending"),
    adminClient
      .from("bookings")
      .select(
        "consultation_type, consultant_id, customer_id, end_time, id, listing:listings(title), meet_link, scheduled_date, start_time, status"
      )
      .eq("status", "approved"),
  ]);

  let expired = 0;
  let completed = 0;
  let reminded = 0;

  for (const booking of (pendingBookings ?? []) as PendingBookingRow[]) {
    if (!booking.approval_deadline || new Date(booking.approval_deadline).getTime() > now.getTime()) {
      continue;
    }

    if (booking.payment_reference) {
      try {
        await refundPaystackTransaction({
          amount: booking.amount_paid ?? undefined,
          reference: booking.payment_reference,
          reason: "Booking expired without consultant response.",
        });
      } catch (error) {
        console.error(error);
        continue;
      }
    }

    const { error: updateError } = await adminClient
      .from("bookings")
      .update({
        payment_status: "refunded",
        rejection_reason: "Booking expired without consultant response.",
        status: "expired",
      })
      .eq("id", booking.id)
      .eq("status", "pending");

    if (updateError) {
      console.error(updateError);
      continue;
    }

    expired += 1;

    await adminClient.from("notifications").insert([
      {
        body: `Your booking for ${booking.listing[0]?.title ?? "this consultation"} expired and has been refunded.`,
        related_booking_id: booking.id,
        title: "Booking request expired",
        type: "booking_expired",
        user_id: booking.customer_id,
      },
      {
        body: `A booking request for ${booking.listing[0]?.title ?? "a consultation"} expired after 24 hours without a response.`,
        related_booking_id: booking.id,
        title: "Booking request expired",
        type: "booking_expired",
        user_id: booking.consultant_id,
      },
      {
        body: "Your refund has been initiated.",
        related_booking_id: booking.id,
        title: "Refund processed",
        type: "payment_refunded",
        user_id: booking.customer_id,
      },
    ] satisfies Partial<Notification>[]);
  }

  for (const booking of (approvedBookings ?? []) as ApprovedBookingRow[]) {
    if (isPast(booking.scheduled_date, booking.end_time)) {
      const { error } = await adminClient
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", booking.id)
        .eq("status", "approved");

      if (!error) {
        completed += 1;
      } else {
        console.error(error);
      }

      continue;
    }

    if (booking.scheduled_date < today) {
      continue;
    }

    const sessionTimestamp = new Date(`${booking.scheduled_date}T${booking.start_time}+01:00`).getTime();
    const hoursUntilSession = sessionTimestamp - now.getTime();

    if (hoursUntilSession < 0 || hoursUntilSession > 12 * 60 * 60 * 1000) {
      continue;
    }

    const { data: existingReminders } = await adminClient
      .from("notifications")
      .select("id")
      .eq("related_booking_id", booking.id)
      .eq("type", "session_reminder");

    if ((existingReminders ?? []).length >= 2) {
      continue;
    }

    const reminderBody = `Reminder: your session is scheduled for ${formatDateTime(
      booking.scheduled_date,
      booking.start_time
    )}${booking.consultation_type === "virtual" && booking.meet_link ? `. Join here: ${booking.meet_link}` : "."}`;

    await adminClient.from("notifications").insert([
      {
        body: reminderBody,
        related_booking_id: booking.id,
        title: "Upcoming session reminder",
        type: "session_reminder",
        user_id: booking.customer_id,
      },
      {
        body: reminderBody,
        related_booking_id: booking.id,
        title: "Upcoming session reminder",
        type: "session_reminder",
        user_id: booking.consultant_id,
      },
    ] satisfies Partial<Notification>[]);

    reminded += 2;
  }

  return NextResponse.json<ApiResponse<ReconcileData>>({
    data: {
      completed,
      expired,
      reminded,
    },
    error: null,
  });
}
