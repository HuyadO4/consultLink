"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { createClient } from "@/lib/supabase/client";
import { getDayLabel } from "@/lib/utils/date";
import type { AvailabilitySlot } from "@/types";
import styles from "./AvailabilityPicker.module.css";

interface AvailabilityPickerProps {
  consultantId: string;
  initialSlots: AvailabilitySlot[];
}

export function AvailabilityPicker({
  consultantId,
  initialSlots,
}: AvailabilityPickerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [slots, setSlots] = useState<AvailabilitySlot[]>(initialSlots);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleAddSlot() {
    setError("");

    if (endTime <= startTime) {
      setError("End time must be later than start time.");
      return;
    }

    const overlappingSlot = slots.find(
      (slot) =>
        slot.day_of_week === dayOfWeek &&
        startTime < slot.end_time &&
        endTime > slot.start_time
    );

    if (overlappingSlot) {
      setError("This time overlaps with an existing slot on that day.");
      return;
    }

    setIsSaving(true);

    try {
      const { data, error: insertError } = await supabase
        .from("availability_slots")
        .insert({
          consultant_id: consultantId,
          day_of_week: dayOfWeek,
          end_time: endTime,
          start_time: startTime,
        })
        .select()
        .single();

      if (insertError) {
        console.error(insertError);
        setError("Something went wrong. Please try again.");
        return;
      }

      setSlots((current) =>
        [...current, data].sort(
          (left, right) =>
            left.day_of_week - right.day_of_week ||
            left.start_time.localeCompare(right.start_time)
        )
      );
    } catch (requestError) {
      console.error(requestError);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSlot(slotId: string) {
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("availability_slots")
        .delete()
        .eq("id", slotId)
        .eq("consultant_id", consultantId);

      if (deleteError) {
        console.error(deleteError);
        setError("Something went wrong. Please try again.");
        return;
      }

      setSlots((current) => current.filter((slot) => slot.id !== slotId));
    } catch (requestError) {
      console.error(requestError);
      setError("Something went wrong. Please try again.");
    }
  }

  const groupedSlots = slots.reduce<Record<number, AvailabilitySlot[]>>((accumulator, slot) => {
    const existingSlots = accumulator[slot.day_of_week] ?? [];
    accumulator[slot.day_of_week] = [...existingSlots, slot];
    return accumulator;
  }, {});

  return (
    <div className={styles.layout}>
      <div className={styles.formCard}>
        <h2 className={styles.heading}>Add a recurring weekly slot</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Day</span>
            <select
              className={styles.select}
              onChange={(event) => setDayOfWeek(Number(event.target.value))}
              value={dayOfWeek}
            >
              {Array.from({ length: 7 }, (_, day) => (
                <option key={day} value={day}>
                  {getDayLabel(day)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Start time</span>
            <input
              className={styles.input}
              onChange={(event) => setStartTime(event.target.value)}
              type="time"
              value={startTime}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>End time</span>
            <input
              className={styles.input}
              onChange={(event) => setEndTime(event.target.value)}
              type="time"
              value={endTime}
            />
          </label>
        </div>

        {error ? <p className={styles.errorText}>{error}</p> : null}

        <Button loading={isSaving} onClick={handleAddSlot}>
          Add slot
        </Button>
      </div>

      <div className={styles.scheduleCard}>
        <h2 className={styles.heading}>Current weekly schedule</h2>
        <div className={styles.days}>
          {Array.from({ length: 7 }, (_, day) => (
            <div className={styles.dayColumn} key={day}>
              <h3 className={styles.dayTitle}>{getDayLabel(day)}</h3>
              <div className={styles.slotList}>
                {(groupedSlots[day] ?? []).length > 0 ? (
                  (groupedSlots[day] ?? []).map((slot) => (
                    <div className={styles.slotItem} key={slot.id}>
                      <span>
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </span>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteSlot(slot.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyText}>No slots yet</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
