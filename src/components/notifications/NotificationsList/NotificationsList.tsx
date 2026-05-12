"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import type { Notification, UserRole } from "@/types";
import { getNotificationBookingPath } from "@/lib/notifications";
import styles from "./NotificationsList.module.css";

interface NotificationsListProps {
  notifications: Notification[];
  role: UserRole;
}

export function NotificationsList({ notifications, role }: NotificationsListProps) {
  const router = useRouter();

  async function markAllAsRead() {
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      router.refresh();
    } catch (error) {
      console.error(error);
    }
  }

  async function openNotification(notification: Notification) {
    try {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "POST",
      });
    } catch (error) {
      console.error(error);
    }

    const bookingPath = getNotificationBookingPath(role, notification.related_booking_id);

    if (bookingPath) {
      router.push(bookingPath);
    } else {
      router.refresh();
    }
  }

  return (
    <div className={styles.layout}>
      {notifications.some((notification) => !notification.is_read) ? (
        <div className={styles.actions}>
          <Button onClick={() => void markAllAsRead()} variant="secondary">
            Mark all as read
          </Button>
        </div>
      ) : null}

      <div className={styles.list}>
        {notifications.map((notification) => (
          <button
            className={`${styles.card} ${notification.is_read ? styles.read : styles.unread}`}
            key={notification.id}
            onClick={() => void openNotification(notification)}
            type="button"
          >
            <div className={styles.cardHeader}>
              <h3 className={styles.title}>{notification.title}</h3>
              {!notification.is_read ? <span className={styles.badge}>New</span> : null}
            </div>
            <p className={styles.body}>{notification.body}</p>
            <p className={styles.date}>
              {new Intl.DateTimeFormat("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(notification.created_at))}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
