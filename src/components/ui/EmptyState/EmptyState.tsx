import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  action?: ReactNode;
  icon?: ReactNode;
  message: string;
  title: string;
}

export function EmptyState({ action, icon, message, title }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
