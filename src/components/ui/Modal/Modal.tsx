"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import styles from "./Modal.module.css";

interface ModalProps {
  body: ReactNode;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export function Modal({ body, footer, isOpen, onClose, title }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key !== "Tab" || !focusableElements || focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        aria-modal="true"
        className={styles.dialog}
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            aria-label="Close modal"
            className={styles.closeButton}
            onClick={onClose}
            type="button"
          >
            X
          </button>
        </div>
        <div className={styles.body}>{body}</div>
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}
