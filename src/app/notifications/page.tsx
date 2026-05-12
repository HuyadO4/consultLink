import { redirect } from "next/navigation";
import { NotificationsList } from "@/components/notifications/NotificationsList/NotificationsList";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { createClient } from "@/lib/supabase/server";
import type { Notification, UserRole } from "@/types";
import styles from "./page.module.css";

interface NotificationRow extends Notification {}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: notifications }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("notifications")
      .select("id, user_id, title, body, type, related_booking_id, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const role = (profile?.role ?? "customer") as UserRole;
  const notificationRows = (notifications ?? []) as NotificationRow[];

  return (
    <>
      <Navbar currentPath="/notifications" isAuthenticated role={role} />
      <PageContainer title="Notifications">
        <div className={styles.layout}>
          <div>
            <h2 className={styles.heading}>Notifications</h2>
            <p className={styles.copy}>Stay on top of confirmations, reminders, and booking changes.</p>
          </div>

          {notificationRows.length > 0 ? (
            <NotificationsList notifications={notificationRows} role={role} />
          ) : (
            <EmptyState
              message="Booking updates, reminders, and review prompts will show up here."
              title="No notifications yet"
            />
          )}
        </div>
      </PageContainer>
    </>
  );
}
