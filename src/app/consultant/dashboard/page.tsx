import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Card } from "@/components/ui/Card/Card";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function ConsultantDashboardPage() {
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
      <Navbar />
      <PageContainer title="Consultant Dashboard">
        <div className={styles.layout}>
          <Card>
            <div className={styles.welcome}>
              <p className={styles.eyebrow}>Welcome back</p>
              <h2 className={styles.name}>{profile?.full_name ?? user.email ?? "Consultant"}</h2>
              <p className={styles.description}>
                Manage your listings, review booking requests, and keep your availability up to date.
              </p>
            </div>
          </Card>

          <div className={styles.grid}>
            <Card>
              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Listing performance</h3>
                <p className={styles.sectionText}>This section will be completed in the next iteration.</p>
              </div>
            </Card>
            <Card>
              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Booking requests</h3>
                <p className={styles.sectionText}>This section will be completed in the next iteration.</p>
              </div>
            </Card>
            <Card>
              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>Availability overview</h3>
                <p className={styles.sectionText}>This section will be completed in the next iteration.</p>
              </div>
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
