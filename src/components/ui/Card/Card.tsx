import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  const cardClassName = [styles.card, className].filter(Boolean).join(" ");

  return (
    <div {...props} className={cardClassName}>
      {children}
    </div>
  );
}
