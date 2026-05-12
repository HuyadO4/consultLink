"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import type { ApiResponse } from "@/types";
import styles from "./ReviewForm.module.css";

interface MutationData {
  success: boolean;
}

interface ReviewFormProps {
  bookingId: string;
}

export function ReviewForm({ bookingId }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/reviews", {
        body: JSON.stringify({
          bookingId,
          comment,
          rating,
        }),
        headers: {
          "Content-Type": "application/json",
        },
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
      <label className={styles.field}>
        <span className={styles.label}>Star rating</span>
        <select
          className={styles.select}
          onChange={(event) => setRating(Number(event.target.value))}
          value={rating}
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} star{value === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Comment (optional)</span>
        <textarea
          className={styles.textarea}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Share what was helpful about the session."
          rows={4}
          value={comment}
        />
      </label>

      {error ? <p className={styles.errorText}>{error}</p> : null}

      <Button loading={isSubmitting} onClick={() => void handleSubmit()}>
        Submit Review
      </Button>
    </div>
  );
}
