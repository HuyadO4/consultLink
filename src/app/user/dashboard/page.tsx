import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Card } from "@/components/ui/Card/Card";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { getBookingStatusLabel } from "@/lib/bookings";
import { adminClient } from "@/lib/supabase/admin";
import { repairPaidInitiatedBookings } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/date";
import styles from "./page.module.css";

interface BookingRow {
  id: string;
  scheduled_date: string;
  start_time: string;
  status: string;
  listing: Array<{
    title: string;
  }>;
}

export default async function UserDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    redirect("/login?suspended=1");
  }

  await repairPaidInitiatedBookings({
    customerId: user.id,
  });

  const { data: bookings } = await adminClient
    .from("bookings")
    .select("id, scheduled_date, start_time, status, listing:listings(title)")
    .eq("customer_id", user.id)
    .neq("status", "initiated")
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  const upcomingBookings = ((bookings ?? []) as unknown as BookingRow[]).filter(
    (booking) => booking.status === "pending" || booking.status === "approved"
  );

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
                Keep track of your upcoming consultations and continue exploring consultants who can help your business grow.
              </p>
            </div>
          </Card>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Upcoming bookings</h3>
                <p className={styles.sectionText}>
                  Your pending and confirmed sessions appear here.
                </p>
              </div>
              <Link className={styles.primaryLink} href="/listings">
                Browse listings
              </Link>
            </div>

            {upcomingBookings.length > 0 ? (
              <div className={styles.list}>
                {upcomingBookings.map((booking) => (
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
                      <span className={styles.bookingStatus}>
                        {getBookingStatusLabel(
                          booking.status as
                            | "approved"
                            | "completed"
                            | "expired"
                            | "initiated"
                            | "pending"
                            | "refunded"
                            | "rejected"
                        )}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                action={
                  <Link className={styles.primaryLink} href="/listings">
                    Browse consultants
                  </Link>
                }
                message="You have no bookings yet, but your next breakthrough could start with one conversation."
                title="No upcoming bookings yet"
              />
            )}
          </section>
        </div>
      </PageContainer>
    </>
  );
}
