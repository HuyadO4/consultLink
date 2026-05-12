import type { NotificationType, UserRole } from "@/types";

export function getNotificationBookingPath(role: UserRole, bookingId: string | null) {
  if (!bookingId) {
    return null;
  }

  if (role === "consultant") {
    return `/consultant/bookings/${bookingId}`;
  }

  if (role === "admin") {
    return "/admin/bookings";
  }

  return `/user/bookings/${bookingId}`;
}

export function getNotificationTitle(type: NotificationType) {
  switch (type) {
    case "booking_approved":
      return "Booking confirmed";
    case "booking_rejected":
      return "Booking rejected";
    case "booking_rescheduled":
      return "Booking rescheduled";
    case "booking_expired":
      return "Booking expired";
    case "payment_success":
      return "Payment received";
    case "payment_refunded":
      return "Refund processed";
    case "meeting_link_manual_required":
      return "Meeting link needed";
    case "session_reminder":
      return "Session reminder";
    case "booking_created":
    default:
      return "Booking update";
  }
}
