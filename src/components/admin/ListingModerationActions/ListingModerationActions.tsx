"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import type { ApiResponse } from "@/types";
import styles from "./ListingModerationActions.module.css";

interface MutationData {
  success: boolean;
}

interface ListingModerationActionsProps {
  listingId: string;
  status: "approved" | "pending" | "rejected";
}

export function ListingModerationActions({
  listingId,
  status,
}: ListingModerationActionsProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
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

      setReason("");
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
      {status !== "approved" ? (
        <Button loading={isSubmitting} onClick={() => void runMutation(`/api/admin/listings/${listingId}/approve`)}>
          Approve
        </Button>
      ) : null}
      {status !== "rejected" ? (
        <>
          <textarea
            className={styles.textarea}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for rejection"
            rows={3}
            value={reason}
          />
          <Button
            loading={isSubmitting}
            onClick={() => void runMutation(`/api/admin/listings/${listingId}/reject`, { reason })}
            variant="secondary"
          >
            Reject
          </Button>
        </>
      ) : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  );
}
