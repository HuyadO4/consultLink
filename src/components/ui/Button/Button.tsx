import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  children,
  className,
  disabled = false,
  loading = false,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const buttonClassName = [
    styles.button,
    styles[variant],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      className={buttonClassName}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
