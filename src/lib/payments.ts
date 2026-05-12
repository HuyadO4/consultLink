import { adminClient } from "@/lib/supabase/admin";
import { verifyPaystackTransaction } from "@/lib/paystack";
import type { Booking, Listing, Notification, PaymentStatus } from "@/types";

interface BookingPaymentRow {
  consultant_id: string;
  customer_id: string;
  id: string;
  listing: Pick<Listing, "price" | "title"> | Array<Pick<Listing, "price" | "title">> | null;
  payment_status: PaymentStatus;
  status: Booking["status"];
}

interface FinalizeBookingPaymentArgs {
  amount: number;
  bookingId?: string;
  paymentReference?: string;
}

interface FinalizeBookingPaymentResult {
  bookingId: string | null;
  confirmed: boolean;
  reason: "amount_mismatch" | "booking_not_found" | "not_initiated" | null;
}

interface RepairPaidInitiatedBookingsArgs {
  consultantId?: string;
  customerId?: string;
}

interface InitiatedBookingVerificationRow {
  id: string;
  payment_reference: string | null;
}

function getApprovalDeadline() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function getEmbeddedListing(
  listing: BookingPaymentRow["listing"]
): Pick<Listing, "price" | "title"> | null {
  if (!listing) {
    return null;
  }

  return Array.isArray(listing) ? (listing[0] ?? null) : listing;
}

export async function finalizeBookingPayment({
  amount,
  bookingId,
  paymentReference,
}: FinalizeBookingPaymentArgs): Promise<FinalizeBookingPaymentResult> {
  let query = adminClient
    .from("bookings")
    .select("consultant_id, customer_id, id, payment_status, status, listing:listings(price, title)");

  if (bookingId) {
    query = query.eq("id", bookingId);
  } else if (paymentReference) {
    query = query.eq("payment_reference", paymentReference);
  } else {
    return {
      bookingId: null,
      confirmed: false,
      reason: "booking_not_found",
    };
  }

  const { data: booking } = await query.maybeSingle<BookingPaymentRow>();

  if (!booking) {
    return {
      bookingId: null,
      confirmed: false,
      reason: "booking_not_found",
    };
  }

  if (booking.payment_status === "paid" && booking.status === "pending") {
    return {
      bookingId: booking.id,
      confirmed: true,
      reason: null,
    };
  }

  const listing = getEmbeddedListing(booking.listing);

  if (!listing || listing.price !== amount) {
    console.error("Paystack payment amount mismatch", {
      bookingId: booking.id,
      expectedAmount: listing?.price,
      receivedAmount: amount,
      paymentReference,
      relationShape: Array.isArray(booking.listing) ? "array" : typeof booking.listing,
    });

    return {
      bookingId: booking.id,
      confirmed: false,
      reason: "amount_mismatch",
    };
  }

  const { data: updatedRows, error: updateError } = await adminClient
    .from("bookings")
    .update({
      amount_paid: amount,
      approval_deadline: getApprovalDeadline(),
      payment_status: "paid",
      status: "pending",
    })
    .eq("id", booking.id)
    .eq("status", "initiated")
    .select("id");

  if (updateError) {
    throw updateError;
  }

  if ((updatedRows ?? []).length === 0) {
    const { data: currentBooking } = await adminClient
      .from("bookings")
      .select("id, payment_status, status")
      .eq("id", booking.id)
      .maybeSingle<Pick<Booking, "id" | "payment_status" | "status">>();

    return {
      bookingId: booking.id,
      confirmed:
        currentBooking?.payment_status === "paid" && currentBooking?.status === "pending",
      reason: "not_initiated",
    };
  }

  const notifications: Partial<Notification>[] = [
    {
      body: `You have a new booking request for ${listing.title}.`,
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

  return {
    bookingId: booking.id,
    confirmed: true,
    reason: null,
  };
}

export async function repairPaidInitiatedBookings({
  consultantId,
  customerId,
}: RepairPaidInitiatedBookingsArgs) {
  if (!consultantId && !customerId) {
    return 0;
  }

  let repaired = 0;

  let initiatedVerificationQuery = adminClient
    .from("bookings")
    .select("id, payment_reference")
    .eq("status", "initiated")
    .eq("payment_status", "unpaid")
    .not("payment_reference", "is", null);

  if (consultantId) {
    initiatedVerificationQuery = initiatedVerificationQuery.eq("consultant_id", consultantId);
  }

  if (customerId) {
    initiatedVerificationQuery = initiatedVerificationQuery.eq("customer_id", customerId);
  }

  const { data: initiatedBookings, error: initiatedBookingsError } =
    await initiatedVerificationQuery;

  if (initiatedBookingsError) {
    console.error(initiatedBookingsError);
  } else {
    for (const booking of (initiatedBookings ?? []) as InitiatedBookingVerificationRow[]) {
      if (!booking.payment_reference) {
        continue;
      }

      try {
        const transaction = await verifyPaystackTransaction(booking.payment_reference);

        if (transaction.status !== "success" || typeof transaction.amount !== "number") {
          continue;
        }

        const finalization = await finalizeBookingPayment({
          amount: transaction.amount,
          bookingId: booking.id,
          paymentReference: booking.payment_reference,
        });

        if (finalization.confirmed) {
          repaired += 1;
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  let query = adminClient
    .from("bookings")
    .update({
      approval_deadline: getApprovalDeadline(),
      status: "pending",
    })
    .eq("status", "initiated")
    .eq("payment_status", "paid");

  if (consultantId) {
    query = query.eq("consultant_id", consultantId);
  }

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  const { data, error } = await query.select("id");

  if (error) {
    console.error(error);
    return repaired;
  }

  return repaired + (data ?? []).length;
}
