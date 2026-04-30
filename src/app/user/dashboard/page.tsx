import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Card } from "@/components/ui/Card/Card";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function UserDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <Navbar isAuthenticated role="customer" />
      <PageContainer title="Customer Dashboard">
        <div className={styles.layout}>
          <Card>
            <div className={styles.welcome}>
              <p className={styles.eyebrow}>Welcome back</p>
              <h2 className={styles.name}>{profile?.full_name ?? user.email ?? "Customer"}</h2>
              <p className={styles.description}>
                Track your bookings, payment confirmations, and upcoming sessions in one place.
              </p>
            </div>
          </Card>

          <div className={styles.grid}>
            <Card>
              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Upcoming bookings</h3>
                <p className={styles.sectionText}>This section will be completed in the next iteration.</p>
              </div>
            </Card>
            <Card>
              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Past consultations</h3>
                <p className={styles.sectionText}>This section will be completed in the next iteration.</p>
              </div>
            </Card>
            <Card>
              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Notifications</h3>
                <p className={styles.sectionText}>This section will be completed in the next iteration.</p>
              </div>
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
