"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookingSlotSelector } from "@/components/bookings/BookingSlotSelector/BookingSlotSelector";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import type { ApiResponse, AvailableBookingDate } from "@/types";
import styles from "./RescheduleBooking.module.css";

interface RescheduleBookingProps {
  bookingId: string;
  listingId: string;
}

interface AvailabilityResponseData {
  availableDates: AvailableBookingDate[];
}

interface RescheduleBookingData {
  success: boolean;
}

export function RescheduleBooking({ bookingId, listingId }: RescheduleBookingProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availableDates, setAvailableDates] = useState<AvailableBookingDate[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function syncSelection(nextAvailableDates: AvailableBookingDate[]) {
    if (nextAvailableDates.length === 0) {
      setSelectedDate("");
      setSelectedStartTime("");
      return;
    }

    const nextDate = nextAvailableDates.some((option) => option.date === selectedDate)
      ? selectedDate
      : nextAvailableDates[0].date;
    const nextSlots = nextAvailableDates.find((option) => option.date === nextDate)?.slots ?? [];
    const nextTime = nextSlots.some((slot) => slot.startTime === selectedStartTime)
      ? selectedStartTime
      : (nextSlots[0]?.startTime ?? "");

    setSelectedDate(nextDate);
    setSelectedStartTime(nextTime);
  }

  function handleDateChange(nextDate: string) {
    const nextSlots = availableDates.find((option) => option.date === nextDate)?.slots ?? [];
    const nextTime = nextSlots.some((slot) => slot.startTime === selectedStartTime)
      ? selectedStartTime
      : (nextSlots[0]?.startTime ?? "");

    setSelectedDate(nextDate);
    setSelectedStartTime(nextTime);
  }

  async function loadAvailability() {
    setIsLoadingAvailability(true);
    setError("");

    try {
      const response = await fetch(`/api/listings/${listingId}/availability`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<AvailabilityResponseData>;

      if (!response.ok || !payload.data) {
        setError(payload.error ?? "Something went wrong. Please try again.");
        return;
      }

      setAvailableDates(payload.data.availableDates);
      syncSelection(payload.data.availableDates);
    } catch (requestError) {
      console.error(requestError);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoadingAvailability(false);
    }
  }

  async function handleSave() {
    if (!selectedDate || !selectedStartTime) {
      setError("Please choose a date and time.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        body: JSON.stringify({
          scheduledDate: selectedDate,
          startTime: selectedStartTime,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse<RescheduleBookingData>;

      if (!response.ok || !payload.data?.success) {
        setError(payload.error ?? "Something went wrong. Please try again.");
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch (requestError) {
      console.error(requestError);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => {
        setIsOpen(true);
        void loadAvailability();
      }} variant="secondary">
        Reschedule
      </Button>

      <Modal
        body={
          <div className={styles.modalBody}>
            {isLoadingAvailability ? (
              <p className={styles.metaText}>Loading available slots...</p>
            ) : (
              <BookingSlotSelector
                availableDates={availableDates}
                emptyMessage="No alternative slots are available right now."
                onDateChange={handleDateChange}
                onStartTimeChange={setSelectedStartTime}
                selectedDate={selectedDate}
                selectedStartTime={selectedStartTime}
              />
            )}
            {error ? <p className={styles.errorText}>{error}</p> : null}
          </div>
        }
        footer={
          <div className={styles.footer}>
            <Button onClick={() => setIsOpen(false)} variant="ghost">
              Close
            </Button>
            <Button
              disabled={!selectedDate || !selectedStartTime || isLoadingAvailability}
              loading={isSaving}
              onClick={handleSave}
            >
              Save new slot
            </Button>
          </div>
        }
        isOpen={isOpen}
        onClose={() => {
          if (!isSaving) {
            setIsOpen(false);
          }
        }}
        title="Reschedule booking"
      />
    </>
  );
}
