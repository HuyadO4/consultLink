"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookingSlotSelector } from "@/components/bookings/BookingSlotSelector/BookingSlotSelector";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { PAYMENT_INCOMPLETE_MESSAGE } from "@/lib/bookings";
import { formatDate, formatTime } from "@/lib/utils/date";
import { formatPrice } from "@/lib/utils/format";
import type { ApiResponse, AvailableBookingDate, ConsultationType } from "@/types";
import styles from "./BookingFlow.module.css";

interface BookingFlowProps {
  hasAvailability: boolean;
  listing: {
    consultationType: ConsultationType;
    consultantName: string;
    durationMinutes: number;
    id: string;
    location: string;
    price: number;
    title: string;
  };
}

interface AvailabilityResponseData {
  availableDates: AvailableBookingDate[];
  consultationType: ConsultationType;
  durationMinutes: number;
}

interface InitiateBookingData {
  accessCode: string;
  bookingId: string;
  reference: string;
}

interface PaymentStatusData {
  message: string | null;
  state: "confirmed" | "failed" | "processing";
}

interface PaystackTransaction {
  reference: string;
}

interface PaystackPopupError {
  message?: string;
}

interface PaystackPopup {
  onCancel?: () => void;
  onError?: (error: PaystackPopupError) => void;
  onSuccess?: (transaction: PaystackTransaction) => void;
  resumeTransaction: (accessCode: string) => void;
}

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopup;
  }
}

export function BookingFlow({ hasAvailability, listing }: BookingFlowProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"slot" | "summary" | "payment">("slot");
  const [availableDates, setAvailableDates] = useState<AvailableBookingDate[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [selectedConsultationType, setSelectedConsultationType] = useState<
    "physical" | "virtual"
  >(listing.consultationType === "virtual" ? "virtual" : "physical");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const selectedSlot = useMemo(
    () =>
      availableDates
        .find((option) => option.date === selectedDate)
        ?.slots.find((slot) => slot.startTime === selectedStartTime) ?? null,
    [availableDates, selectedDate, selectedStartTime]
  );

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
      const response = await fetch(`/api/listings/${listing.id}/availability`, {
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

  async function cancelBooking(bookingId: string) {
    try {
      await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
    } catch (requestError) {
      console.error(requestError);
    }
  }

  async function pollPaymentStatus(bookingId: string) {
    setIsSubmitting(false);
    setIsVerifying(true);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const response = await fetch(`/api/bookings/${bookingId}/payment-status`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as ApiResponse<PaymentStatusData>;

        if (payload.data?.state === "confirmed") {
          setIsOpen(false);
          router.push(`/user/bookings/${bookingId}`);
          router.refresh();
          return;
        }

        if (payload.data?.state === "failed") {
          setStep("summary");
          setIsVerifying(false);
          setError(payload.data.message ?? PAYMENT_INCOMPLETE_MESSAGE);
          return;
        }
      } catch (requestError) {
        console.error(requestError);
      }

      await new Promise((resolve) => window.setTimeout(resolve, 3000));
    }

    setIsVerifying(false);
    setStep("summary");
    setError("Something went wrong. Please try again.");
  }

  async function startPayment(accessCode: string, bookingId: string) {
    const PaystackPop = window.PaystackPop;

    if (!PaystackPop) {
      await cancelBooking(bookingId);
      setIsSubmitting(false);
      setStep("summary");
      setError("Something went wrong. Please try again.");
      return;
    }

    const popup = new PaystackPop();
    popup.onSuccess = () => {
      void pollPaymentStatus(bookingId);
    };
    popup.onCancel = () => {
      void cancelBooking(bookingId);
      setIsSubmitting(false);
      setStep("summary");
      setError(PAYMENT_INCOMPLETE_MESSAGE);
    };
    popup.onError = (popupError) => {
      console.error(popupError);
      void cancelBooking(bookingId);
      setIsSubmitting(false);
      setStep("summary");
      setError(PAYMENT_INCOMPLETE_MESSAGE);
    };
    popup.resumeTransaction(accessCode);
  }

  async function handleOpen() {
    setIsOpen(true);
    setStep("slot");
    setError("");

    if (availableDates.length === 0) {
      await loadAvailability();
    }
  }

  async function handleProceedToPayment() {
    if (!selectedDate || !selectedStartTime) {
      setError("Please choose a date and time.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setStep("payment");

    try {
      const response = await fetch("/api/bookings/initiate", {
        body: JSON.stringify({
          consultationType: selectedConsultationType,
          listingId: listing.id,
          scheduledDate: selectedDate,
          startTime: selectedStartTime,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse<InitiateBookingData>;

      if (!response.ok || !payload.data) {
        setIsSubmitting(false);
        setStep("summary");
        setError(payload.error ?? "Something went wrong. Please try again.");
        return;
      }

      await startPayment(payload.data.accessCode, payload.data.bookingId);
    } catch (requestError) {
      console.error(requestError);
      setIsSubmitting(false);
      setStep("summary");
      setError("Something went wrong. Please try again.");
    }
  }

  function renderSlotStep() {
    if (isLoadingAvailability) {
      return <p className={styles.metaText}>Loading available slots...</p>;
    }

    return (
      <BookingSlotSelector
        availableDates={availableDates}
        emptyMessage="No slots are available right now. Please try another consultant or check back later."
        onDateChange={handleDateChange}
        onStartTimeChange={setSelectedStartTime}
        selectedDate={selectedDate}
        selectedStartTime={selectedStartTime}
      />
    );
  }

  function renderSummaryStep() {
    return (
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Consultation</p>
          <p className={styles.summaryValue}>{listing.title}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Consultant</p>
          <p className={styles.summaryValue}>{listing.consultantName}</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Date and time</p>
          <p className={styles.summaryValue}>
            {selectedDate ? formatDate(selectedDate) : ""} at{" "}
            {selectedStartTime ? formatTime(selectedStartTime) : ""}
          </p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Session duration</p>
          <p className={styles.summaryValue}>{listing.durationMinutes} minutes</p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Location</p>
          <p className={styles.summaryValue}>{listing.location}</p>
        </div>

        {listing.consultationType === "both" ? (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Consultation type</legend>
            <label className={styles.option}>
              <input
                checked={selectedConsultationType === "physical"}
                name="consultationType"
                onChange={() => setSelectedConsultationType("physical")}
                type="radio"
              />
              <span>Physical</span>
            </label>
            <label className={styles.option}>
              <input
                checked={selectedConsultationType === "virtual"}
                name="consultationType"
                onChange={() => setSelectedConsultationType("virtual")}
                type="radio"
              />
              <span>Virtual</span>
            </label>
          </fieldset>
        ) : (
          <div className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Consultation type</p>
            <p className={styles.summaryValue}>
              {selectedConsultationType === "virtual" ? "Virtual" : "Physical"}
            </p>
          </div>
        )}

        <div className={styles.totalRow}>
          <span>Total price</span>
          <strong>{formatPrice(listing.price)}</strong>
        </div>
      </div>
    );
  }

  function renderPaymentStep() {
    if (isVerifying) {
      return (
        <div className={styles.paymentState}>
          <p className={styles.paymentTitle}>Verifying payment...</p>
          <p className={styles.metaText}>
            Your payment was completed. We are waiting for server confirmation before creating
            your booking.
          </p>
        </div>
      );
    }

    return (
      <div className={styles.paymentState}>
        <p className={styles.paymentTitle}>Opening payment window...</p>
        <p className={styles.metaText}>
          Complete your payment in the Paystack popup to continue.
        </p>
      </div>
    );
  }

  const footer =
    step === "slot" ? (
      <div className={styles.footer}>
        <Button onClick={() => setIsOpen(false)} variant="ghost">
          Close
        </Button>
        <Button
          disabled={!selectedDate || !selectedSlot || isLoadingAvailability}
          onClick={() => setStep("summary")}
        >
          Continue
        </Button>
      </div>
    ) : step === "summary" ? (
      <div className={styles.footer}>
        <Button onClick={() => setStep("slot")} variant="ghost">
          Back
        </Button>
        <Button loading={isSubmitting} onClick={handleProceedToPayment}>
          Proceed to Payment
        </Button>
      </div>
    ) : null;

  return (
    <>
      <Script src="https://js.paystack.co/v2/inline.js" strategy="afterInteractive" />
      <Button
        className={styles.triggerButton}
        disabled={!hasAvailability}
        onClick={() => void handleOpen()}
        size="lg"
      >
        {hasAvailability ? "Book Consultation" : "No slots available yet"}
      </Button>

      <Modal
        body={
          <div className={styles.modalBody}>
            <p className={styles.stepLabel}>
              {step === "slot" ? "Step 1 of 3" : step === "summary" ? "Step 2 of 3" : "Step 3 of 3"}
            </p>
            {step === "slot" ? renderSlotStep() : null}
            {step === "summary" ? renderSummaryStep() : null}
            {step === "payment" ? renderPaymentStep() : null}
            {error ? <p className={styles.errorText}>{error}</p> : null}
          </div>
        }
        footer={footer}
        isOpen={isOpen}
        onClose={() => {
          if (!isSubmitting && !isVerifying) {
            setIsOpen(false);
          }
        }}
        title="Book consultation"
      />
    </>
  );
}
