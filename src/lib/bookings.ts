import {
  addDays,
  getDayOfWeek,
  getTodayInWAT,
  isPast,
  normalizeTimeValue,
} from "@/lib/utils/date";
import type {
  AvailabilitySlot,
  Booking,
  BookingStatus,
  ConsultationType,
  PaymentStatus,
} from "@/types";
import type { AvailableBookingDate, AvailableBookingSlot } from "@/types";

export const BOOKABLE_WINDOW_DAYS = 21;
export const SLOT_TAKEN_MESSAGE =
  "This time slot is no longer available. Please choose another.";
export const PAYMENT_INCOMPLETE_MESSAGE =
  "Payment was not completed. No charge was made.";

type ActiveBookingStatus = Extract<BookingStatus, "pending" | "approved">;

interface BuildAvailableBookingDatesArgs {
  availability: Pick<AvailabilitySlot, "day_of_week" | "end_time" | "start_time">[];
  bookings: Pick<Booking, "end_time" | "id" | "scheduled_date" | "start_time" | "status">[];
  durationMinutes: number;
  excludeBookingId?: string;
  maxDays?: number;
}

interface SlotAvailabilityArgs extends BuildAvailableBookingDatesArgs {
  scheduledDate: string;
  startTime: string;
}

const ACTIVE_BOOKING_STATUSES: ActiveBookingStatus[] = ["pending", "approved"];

function timeToMinutes(time: string) {
  const [hours, minutes] = normalizeTimeValue(time).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function overlaps(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  return timeToMinutes(leftStart) < timeToMinutes(rightEnd) &&
    timeToMinutes(leftEnd) > timeToMinutes(rightStart);
}

function buildSlotsForWindow(
  startTime: string,
  endTime: string,
  durationMinutes: number
): AvailableBookingSlot[] {
  const slots: AvailableBookingSlot[] = [];
  let currentMinutes = timeToMinutes(startTime);
  const windowEnd = timeToMinutes(endTime);

  while (currentMinutes + durationMinutes <= windowEnd) {
    const slotStart = minutesToTime(currentMinutes);
    const slotEnd = minutesToTime(currentMinutes + durationMinutes);
    slots.push({
      endTime: slotEnd,
      startTime: slotStart,
    });
    currentMinutes += durationMinutes;
  }

  return slots;
}

export function calculateEndTime(startTime: string, durationMinutes: number) {
  return minutesToTime(timeToMinutes(startTime) + durationMinutes);
}

export function buildBookingReference(bookingId: string) {
  return `CL-${bookingId.replace(/-/g, "")}`;
}

export function getAllowedConsultationTypes(
  consultationType: ConsultationType
): Array<"physical" | "virtual"> {
  if (consultationType === "both") {
    return ["physical", "virtual"];
  }

  return [consultationType];
}

export function isValidConsultationTypeSelection(
  listingType: ConsultationType,
  selectedType: "physical" | "virtual"
) {
  return getAllowedConsultationTypes(listingType).includes(selectedType);
}

export function buildAvailableBookingDates({
  availability,
  bookings,
  durationMinutes,
  excludeBookingId,
  maxDays = BOOKABLE_WINDOW_DAYS,
}: BuildAvailableBookingDatesArgs): AvailableBookingDate[] {
  const today = getTodayInWAT();
  const filteredBookings = bookings.filter(
    (booking) =>
      ACTIVE_BOOKING_STATUSES.includes(booking.status as ActiveBookingStatus) &&
      booking.id !== excludeBookingId
  );
  const availableDates: AvailableBookingDate[] = [];

  for (let index = 0; index < maxDays; index += 1) {
    const currentDate = addDays(today, index);
    const currentDay = getDayOfWeek(currentDate);
    const dayWindows = availability.filter((slot) => slot.day_of_week === currentDay);

    if (dayWindows.length === 0) {
      continue;
    }

    const dayBookings = filteredBookings.filter(
      (booking) => booking.scheduled_date === currentDate
    );
    const daySlots = dayWindows.flatMap((slot) =>
      buildSlotsForWindow(slot.start_time, slot.end_time, durationMinutes).filter(
        (candidate) =>
          !isPast(currentDate, candidate.startTime) &&
          !dayBookings.some((booking) =>
            overlaps(
              candidate.startTime,
              candidate.endTime,
              booking.start_time,
              booking.end_time
            )
          )
      )
    );

    if (daySlots.length > 0) {
      availableDates.push({
        date: currentDate,
        slots: daySlots,
      });
    }
  }

  return availableDates;
}

export function isSlotAvailable({
  availability,
  bookings,
  durationMinutes,
  excludeBookingId,
  scheduledDate,
  startTime,
}: SlotAvailabilityArgs) {
  const availableDates = buildAvailableBookingDates({
    availability,
    bookings,
    durationMinutes,
    excludeBookingId,
    maxDays: BOOKABLE_WINDOW_DAYS,
  });
  const normalizedStartTime = normalizeTimeValue(startTime);

  return availableDates.some(
    (dateOption) =>
      dateOption.date === scheduledDate &&
      dateOption.slots.some((slot) => slot.startTime === normalizedStartTime)
  );
}

export function getBookingStatusLabel(status: BookingStatus) {
  switch (status) {
    case "pending":
      return "Awaiting Approval";
    case "approved":
      return "Confirmed";
    case "rejected":
      return "Rejected - Refund Initiated";
    case "expired":
      return "Session Expired - Refund Initiated";
    case "completed":
      return "Completed";
    case "refunded":
      return "Refunded";
    case "initiated":
    default:
      return "Payment In Progress";
  }
}

export function getBookingStatusVariant(status: BookingStatus) {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
    case "expired":
      return "rejected";
    case "completed":
    case "refunded":
      return "completed";
    case "initiated":
    case "pending":
    default:
      return "pending";
  }
}

export function getPaymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case "paid":
      return "Paid";
    case "refunded":
      return "Refunded";
    case "unpaid":
    default:
      return "Unpaid";
  }
}
