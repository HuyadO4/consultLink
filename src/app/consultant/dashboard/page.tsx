import Link from "next/link";
import { redirect } from "next/navigation";
import { ConsultantBookingActions } from "@/components/bookings/ConsultantBookingActions/ConsultantBookingActions";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Card } from "@/components/ui/Card/Card";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { adminClient } from "@/lib/supabase/admin";
import { repairPaidInitiatedBookings } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/date";
import styles from "./page.module.css";

interface ListingStatusRow {
  status: "pending" | "approved" | "rejected";
}

interface BookingRow {
  consultation_type: "physical" | "virtual";
  id: string;
  meet_link: string | null;
  meeting_link_status: "available" | "manual_required" | "not_required" | "pending_generation";
  scheduled_date: string;
  start_time: string;
  status: "approved" | "pending";
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

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    redirect("/login?suspended=1");
  }

  await repairPaidInitiatedBookings({
    consultantId: user.id,
  });

  const { data: listings } = await adminClient
    .from("listings")
    .select("status")
    .eq("consultant_id", user.id);

  const { data: pendingBookings } = await adminClient
    .from("bookings")
    .select(
      "consultation_type, id, meet_link, meeting_link_status, scheduled_date, start_time, status, listing:listings(title)"
    )
    .eq("consultant_id", user.id)
    .eq("status", "pending")
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(5);

  const { data: upcomingBookings } = await adminClient
    .from("bookings")
    .select("id, scheduled_date, start_time, status, listing:listings(title)")
    .eq("consultant_id", user.id)
    .eq("status", "approved")
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(5);

  const listingRows = (listings ?? []) as ListingStatusRow[];
  const pendingCount = listingRows.filter((listing) => listing.status === "pending").length;
  const approvedCount = listingRows.filter((listing) => listing.status === "approved").length;
  const rejectedCount = listingRows.filter((listing) => listing.status === "rejected").length;
  const pendingBookingRows = (pendingBookings ?? []) as BookingRow[];
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
                <h3 className={styles.sectionTitle}>Incoming booking requests</h3>
                <p className={styles.sectionText}>
                  Newly paid bookings waiting for your approval appear here.
                </p>
              </div>
              <Link className={styles.primaryLink} href="/consultant/bookings?status=pending">
                Review requests
              </Link>
            </div>

            {pendingBookingRows.length > 0 ? (
              <div className={styles.list}>
                {pendingBookingRows.map((booking) => (
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
                      <span className={styles.bookingStatus}>Awaiting Approval</span>
                    </div>
                    <div className={styles.inlineManager}>
                      <ConsultantBookingActions
                        bookingId={booking.id}
                        consultationType={booking.consultation_type}
                        meetLink={booking.meet_link}
                        meetingLinkStatus={booking.meeting_link_status}
                        status={booking.status}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                action={
                  <Link className={styles.primaryLink} href="/consultant/bookings">
                    View all bookings
                  </Link>
                }
                message="Paid booking requests from customers will show up here as soon as they come in."
                title="No incoming booking requests"
              />
            )}
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
