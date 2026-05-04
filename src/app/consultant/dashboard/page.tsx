import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Card } from "@/components/ui/Card/Card";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/date";
import styles from "./page.module.css";

interface ListingStatusRow {
  status: "pending" | "approved" | "rejected";
}

interface BookingRow {
  id: string;
  scheduled_date: string;
  start_time: string;
  listing: Array<{
    title: string;
  }>;
}

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
    .select("full_name, is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    redirect("/login?suspended=1");
  }

  const { data: listings } = await supabase
    .from("listings")
    .select("status")
    .eq("consultant_id", user.id);

  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select("id, scheduled_date, start_time, listing:listings(title)")
    .eq("consultant_id", user.id)
    .eq("status", "approved")
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(5);

  const listingRows = (listings ?? []) as ListingStatusRow[];
  const pendingCount = listingRows.filter((listing) => listing.status === "pending").length;
  const approvedCount = listingRows.filter((listing) => listing.status === "approved").length;
  const rejectedCount = listingRows.filter((listing) => listing.status === "rejected").length;
  const bookingRows = (upcomingBookings ?? []) as BookingRow[];

  return (
    <>
      <Navbar isAuthenticated role="consultant" />
      <PageContainer title="Consultant Dashboard">
        <div className={styles.layout}>
          <Card>
            <div className={styles.welcome}>
              <p className={styles.eyebrow}>Welcome back</p>
              <h2 className={styles.name}>{profile?.full_name ?? user.email ?? "Consultant"}</h2>
              <p className={styles.description}>
                Keep your listings active, monitor review status, and stay ready for upcoming sessions.
              </p>
            </div>
          </Card>

          <section className={styles.metricsGrid}>
            <Card>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Pending listings</p>
                <p className={styles.metricValue}>{pendingCount}</p>
              </div>
            </Card>
            <Card>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Approved listings</p>
                <p className={styles.metricValue}>{approvedCount}</p>
              </div>
            </Card>
            <Card>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Rejected listings</p>
                <p className={styles.metricValue}>{rejectedCount}</p>
              </div>
            </Card>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Upcoming confirmed bookings</h3>
                <p className={styles.sectionText}>
                  Your next approved sessions will appear here.
                </p>
              </div>
              {listingRows.length === 0 ? (
                <Link className={styles.primaryLink} href="/consultant/listings/new">
                  Create your first listing
                </Link>
              ) : null}
            </div>

            {bookingRows.length > 0 ? (
              <div className={styles.list}>
                {bookingRows.map((booking) => (
                  <Card key={booking.id}>
                    <div className={styles.bookingRow}>
                      <div>
                        <h4 className={styles.bookingTitle}>
                          {booking.listing[0]?.title ?? "Consultation"}
                        </h4>
                        <p className={styles.bookingMeta}>
                          {formatDateTime(booking.scheduled_date, booking.start_time)}
                        </p>
                      </div>
                      <span className={styles.bookingStatus}>Confirmed</span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                action={
                  <Link className={styles.primaryLink} href="/consultant/listings/new">
                    Create a listing
                  </Link>
                }
                message="Create your first listing to start receiving booking requests."
                title="No upcoming confirmed bookings"
              />
            )}
          </section>
        </div>
      </PageContainer>
    </>
  );
}
