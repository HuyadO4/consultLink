"use client";

import { formatTime } from "@/lib/utils/date";
import type { AvailableBookingDate } from "@/types";
import styles from "./BookingSlotSelector.module.css";

interface BookingSlotSelectorProps {
  availableDates: AvailableBookingDate[];
  emptyMessage: string;
  onDateChange: (date: string) => void;
  onStartTimeChange: (startTime: string) => void;
  selectedDate: string;
  selectedStartTime: string;
}

function formatDateChipLabel(date: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00+01:00`));
}

export function BookingSlotSelector({
  availableDates,
  emptyMessage,
  onDateChange,
  onStartTimeChange,
  selectedDate,
  selectedStartTime,
}: BookingSlotSelectorProps) {
  const activeDate = availableDates.find((option) => option.date === selectedDate);
  const slots = activeDate?.slots ?? [];

  if (availableDates.length === 0) {
    return <p className={styles.emptyText}>{emptyMessage}</p>;
  }

  return (
    <div className={styles.layout}>
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Select a date</p>
        <div className={styles.dateGrid}>
          {availableDates.map((option) => (
            <button
              className={`${styles.dateButton} ${
                option.date === selectedDate ? styles.dateButtonActive : ""
              }`}
              key={option.date}
              onClick={() => onDateChange(option.date)}
              type="button"
            >
              {formatDateChipLabel(option.date)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Select a time</p>
        <div className={styles.timeGrid}>
          {slots.map((slot) => (
            <button
              className={`${styles.timeButton} ${
                slot.startTime === selectedStartTime ? styles.timeButtonActive : ""
              }`}
              key={`${selectedDate}-${slot.startTime}`}
              onClick={() => onStartTimeChange(slot.startTime)}
              type="button"
            >
              {formatTime(slot.startTime)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
