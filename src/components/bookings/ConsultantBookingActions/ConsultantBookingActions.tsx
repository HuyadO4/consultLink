"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import type { ApiResponse, Booking } from "@/types";
import styles from "./ConsultantBookingActions.module.css";

interface MutationData {
  success: boolean;
}

interface ConsultantBookingActionsProps {
  bookingId: string;
  consultationType: Booking["consultation_type"];
  meetLink: string | null;
  meetingLinkStatus: "available" | "manual_required" | "not_required" | "pending_generation";
  status: Booking["status"];
}

export function ConsultantBookingActions({
  bookingId,
  consultationType,
  meetLink,
  meetingLinkStatus,
  status,
}: ConsultantBookingActionsProps) {
  const router = useRouter();
  const [rejectionReason, setRejectionReason] = useState("");
  const [manualLink, setManualLink] = useState(meetLink ?? "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function runMutation(url: string, body?: Record<string, string>) {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(url, {
        body: body ? JSON.stringify(body) : undefined,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse<MutationData>;

      if (!response.ok || !payload.data?.success) {
        setError(payload.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.refresh();
    } catch (requestError) {
      console.error(requestError);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.layout}>
      {status === "pending" ? (
        <div className={styles.section}>
          <div className={styles.inlineActions}>
            <Button loading={isSubmitting} onClick={() => void runMutation(`/api/consultant/bookings/${bookingId}/approve`)}>
              Approve
            </Button>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Optional rejection reason</span>
            <textarea
              className={styles.textarea}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Add context for the customer if you cannot take this booking."
              rows={4}
              value={rejectionReason}
            />
          </label>

          <Button
            loading={isSubmitting}
            onClick={() =>
              void runMutation(`/api/consultant/bookings/${bookingId}/reject`, {
                reason: rejectionReason,
              })
            }
            variant="secondary"
          >
            Reject Booking
          </Button>
        </div>
      ) : null}

      {consultationType === "virtual" && status === "approved" && meetingLinkStatus !== "available" ? (
        <div className={styles.section}>
          <label className={styles.field}>
            <span className={styles.label}>Meeting link</span>
            <input
              className={styles.input}
              onChange={(event) => setManualLink(event.target.value)}
              placeholder="https://meet.google.com/..."
              type="url"
              value={manualLink}
            />
          </label>
          <Button
            loading={isSubmitting}
            onClick={() =>
              void runMutation(`/api/consultant/bookings/${bookingId}/meeting-link`, {
                meetLink: manualLink,
              })
            }
          >
            Save Link
          </Button>
        </div>
      ) : null}

      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  );
}
