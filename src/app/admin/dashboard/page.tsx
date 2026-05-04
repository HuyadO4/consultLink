import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Card } from "@/components/ui/Card/Card";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    redirect("/login?suspended=1");
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ count: pendingListingsCount }, { count: bookingsTodayCount }, { count: usersCount }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_date", today),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);

  return (
    <>
      <Navbar isAuthenticated role="admin" />
      <PageContainer title="Admin Dashboard">
        <div className={styles.layout}>
          <Card>
            <div className={styles.welcome}>
              <p className={styles.eyebrow}>Welcome back</p>
              <h2 className={styles.name}>{profile?.full_name ?? user.email ?? "Admin"}</h2>
              <p className={styles.description}>
                Review the queue, monitor activity, and keep the marketplace trustworthy.
              </p>
            </div>
          </Card>

          <section className={styles.metricsGrid}>
            <Card>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Listings pending review</p>
                <p className={styles.metricValue}>{pendingListingsCount ?? 0}</p>
              </div>
            </Card>
            <Card>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Bookings today</p>
                <p className={styles.metricValue}>{bookingsTodayCount ?? 0}</p>
              </div>
            </Card>
            <Card>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Total registered users</p>
                <p className={styles.metricValue}>{usersCount ?? 0}</p>
              </div>
            </Card>
          </section>
        </div>
      </PageContainer>
    </>
  );
}
