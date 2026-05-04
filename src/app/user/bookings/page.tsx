import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import {
  getBookingStatusLabel,
  getBookingStatusVariant,
  getPaymentStatusLabel,
} from "@/lib/bookings";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/date";
import styles from "./page.module.css";

interface BookingRow {
  consultant: Array<{
    full_name: string;
  }>;
  id: string;
  listing: Array<{
    title: string;
  }>;
  payment_status: "paid" | "refunded" | "unpaid";
  scheduled_date: string;
  start_time: string;
  status:
    | "approved"
    | "completed"
    | "expired"
    | "initiated"
    | "pending"
    | "refunded"
    | "rejected";
}

function compareAscending(left: BookingRow, right: BookingRow) {
  return `${left.scheduled_date}${left.start_time}`.localeCompare(
    `${right.scheduled_date}${right.start_time}`
  );
}

function compareDescending(left: BookingRow, right: BookingRow) {
  return `${right.scheduled_date}${right.start_time}`.localeCompare(
    `${left.scheduled_date}${left.start_time}`
  );
}

export default async function UserBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, scheduled_date, start_time, status, payment_status, listing:listings(title), consultant:profiles(full_name)"
    )
    .eq("customer_id", user.id)
    .neq("status", "initiated");

  const bookingRows = ((bookings ?? []) as unknown as BookingRow[]).filter(
    (booking) => booking.status !== "initiated"
  );
  const upcomingBookings = bookingRows
    .filter((booking) => booking.status === "pending" || booking.status === "approved")
    .sort(compareAscending);
  const pastBookings = bookingRows
    .filter((booking) =>
      ["completed", "expired", "rejected", "refunded"].includes(booking.status)
    )
    .sort(compareDescending);

  return (
    <>
      <Navbar currentPath="/user/bookings" isAuthenticated role="customer" />
      <PageContainer title="Your Bookings">
        <div className={styles.layout}>
          {bookingRows.length === 0 ? (
            <EmptyState
              action={
                <Link className={styles.primaryLink} href="/listings">
                  Browse consultants
                </Link>
              }
              message="You have no bookings yet, but your next breakthrough could start with one conversation."
              title="No bookings yet"
            />
          ) : (
            <>
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Upcoming</h2>
                    <p className={styles.sectionText}>
                      Pending and confirmed sessions appear here.
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
                            <h3 className={styles.bookingTitle}>
                              {booking.listing[0]?.title ?? "Consultation"}
                            </h3>
                            <p className={styles.bookingMeta}>
                              {formatDateTime(booking.scheduled_date, booking.start_time)}
                            </p>
                            <p className={styles.bookingMeta}>
                              Consultant: {booking.consultant[0]?.full_name ?? "Consultant"}
                            </p>
                            <p className={styles.bookingMeta}>
                              Payment: {getPaymentStatusLabel(booking.payment_status)}
                            </p>
                          </div>
                          <div className={styles.bookingActions}>
                            <Badge variant={getBookingStatusVariant(booking.status)}>
                              {getBookingStatusLabel(booking.status)}
                            </Badge>
                            <Link className={styles.secondaryLink} href={`/user/bookings/${booking.id}`}>
                              View details
                            </Link>
                          </div>
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
                    message="You do not have any pending or confirmed sessions right now."
                    title="No upcoming bookings"
                  />
                )}
              </section>

              <section className={styles.section}>
                <div>
                  <h2 className={styles.sectionTitle}>Past</h2>
                  <p className={styles.sectionText}>
                    Completed, rejected, refunded, and expired sessions live here.
                  </p>
                </div>

                {pastBookings.length > 0 ? (
                  <div className={styles.list}>
                    {pastBookings.map((booking) => (
                      <Card key={booking.id}>
                        <div className={styles.bookingRow}>
                          <div>
                            <h3 className={styles.bookingTitle}>
                              {booking.listing[0]?.title ?? "Consultation"}
                            </h3>
                            <p className={styles.bookingMeta}>
                              {formatDateTime(booking.scheduled_date, booking.start_time)}
                            </p>
                            <p className={styles.bookingMeta}>
                              Payment: {getPaymentStatusLabel(booking.payment_status)}
                            </p>
                          </div>
                          <div className={styles.bookingActions}>
                            <Badge variant={getBookingStatusVariant(booking.status)}>
                              {getBookingStatusLabel(booking.status)}
                            </Badge>
                            <Link className={styles.secondaryLink} href={`/user/bookings/${booking.id}`}>
                              View details
                            </Link>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    message="Completed, rejected, and expired sessions will show up here."
                    title="No past bookings"
                  />
                )}
              </section>
            </>
          )}
        </div>
      </PageContainer>
    </>
  );
}
