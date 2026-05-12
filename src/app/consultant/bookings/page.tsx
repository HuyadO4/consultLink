import Link from "next/link";
import { redirect } from "next/navigation";
import { ConsultantBookingActions } from "@/components/bookings/ConsultantBookingActions/ConsultantBookingActions";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { getBookingStatusLabel, getBookingStatusVariant, getPaymentStatusLabel } from "@/lib/bookings";
import { adminClient } from "@/lib/supabase/admin";
import { repairPaidInitiatedBookings } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/date";
import styles from "./page.module.css";

interface ConsultantBookingsPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

interface BookingRow {
  consultation_type: "physical" | "virtual";
  customer: Array<{ full_name: string }>;
  id: string;
  listing: Array<{ title: string }>;
  meet_link: string | null;
  meeting_link_status: "available" | "manual_required" | "not_required" | "pending_generation";
  payment_status: "paid" | "refunded" | "unpaid";
  scheduled_date: string;
  start_time: string;
  status: "approved" | "completed" | "expired" | "initiated" | "pending" | "refunded" | "rejected";
}

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Awaiting Approval", value: "pending" },
  { label: "Confirmed", value: "approved" },
  { label: "Rejected", value: "rejected" },
] as const;

export default async function ConsultantBookingsPage({
  searchParams,
}: ConsultantBookingsPageProps) {
  const { status = "all" } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await repairPaidInitiatedBookings({
    consultantId: user.id,
  });

  let bookingsQuery = adminClient
    .from("bookings")
    .select(
      "consultation_type, id, meet_link, meeting_link_status, scheduled_date, start_time, status, payment_status, listing:listings(title), customer:profiles(full_name)"
    )
    .eq("consultant_id", user.id)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (status !== "all") {
    bookingsQuery = bookingsQuery.eq("status", status);
  }

  const { data: bookings } = await bookingsQuery;
  const bookingRows = (bookings ?? []) as unknown as BookingRow[];

  return (
    <>
      <Navbar currentPath="/consultant/bookings" isAuthenticated role="consultant" />
      <PageContainer title="Consultant Bookings">
        <div className={styles.layout}>
          <div className={styles.topRow}>
            <div>
              <h2 className={styles.heading}>Incoming bookings</h2>
              <p className={styles.copy}>
                Review new requests, manage confirmations, and keep track of past sessions.
              </p>
            </div>
          </div>

          <div className={styles.filters}>
            {FILTERS.map((filter) => (
              <Link
                className={`${styles.filterLink} ${status === filter.value ? styles.filterLinkActive : ""}`}
                href={filter.value === "all" ? "/consultant/bookings" : `/consultant/bookings?status=${filter.value}`}
                key={filter.value}
              >
                {filter.label}
              </Link>
            ))}
          </div>

          {bookingRows.length > 0 ? (
            <div className={styles.list}>
              {bookingRows.map((booking) => (
                <Card key={booking.id}>
                  <div className={styles.bookingRow}>
                    <div>
                      <h3 className={styles.bookingTitle}>{booking.listing[0]?.title ?? "Consultation"}</h3>
                      <p className={styles.metaText}>
                        Customer: {booking.customer[0]?.full_name ?? "Customer"}
                      </p>
                      <p className={styles.metaText}>
                        {formatDateTime(booking.scheduled_date, booking.start_time)}
                      </p>
                      <p className={styles.metaText}>
                        Payment: {getPaymentStatusLabel(booking.payment_status)}
                      </p>
                    </div>
                    <div className={styles.actions}>
                      <Badge variant={getBookingStatusVariant(booking.status)}>
                        {getBookingStatusLabel(booking.status)}
                      </Badge>
                      <Link className={styles.detailLink} href={`/consultant/bookings/${booking.id}`}>
                        View details
                      </Link>
                    </div>
                  </div>
                  {booking.status === "pending" ? (
                    <div className={styles.inlineManager}>
                      <ConsultantBookingActions
                        bookingId={booking.id}
                        consultationType={booking.consultation_type}
                        meetLink={booking.meet_link}
                        meetingLinkStatus={booking.meeting_link_status}
                        status={booking.status}
                      />
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              message="New booking requests and confirmed sessions will appear here."
              title="No bookings yet"
            />
          )}
        </div>
      </PageContainer>
    </>
  );
}
