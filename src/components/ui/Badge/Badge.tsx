import type { HTMLAttributes } from "react";
import styles from "./Badge.module.css";

type BadgeVariant = "pending" | "approved" | "rejected" | "completed";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: string;
  variant: BadgeVariant;
}

export function Badge({ children, className, variant, ...props }: BadgeProps) {
  const badgeClassName = [styles.badge, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <span {...props} className={badgeClassName}>
      {children}
    </span>
  );
}
