"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import type { ApiResponse } from "@/types";

interface MutationData {
  success: boolean;
}

interface UserStatusToggleProps {
  isSuspended: boolean;
  userId: string;
}

export function UserStatusToggle({ isSuspended, userId }: UserStatusToggleProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleToggle() {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        body: JSON.stringify({
          suspended: !isSuspended,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse<MutationData>;

      if (!response.ok || !payload.data?.success) {
        throw new Error(payload.error ?? "Unable to update user.");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button loading={isSubmitting} onClick={() => void handleToggle()} variant="secondary">
      {isSuspended ? "Reactivate" : "Suspend"}
    </Button>
  );
}
