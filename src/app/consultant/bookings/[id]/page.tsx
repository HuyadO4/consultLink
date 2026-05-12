import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConsultantBookingActions } from "@/components/bookings/ConsultantBookingActions/ConsultantBookingActions";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { getBookingStatusLabel, getBookingStatusVariant, getPaymentStatusLabel } from "@/lib/bookings";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/date";
import styles from "./page.module.css";

interface ConsultantBookingDetailPageProps {
  params: Promise<{ id: string }>;
}

interface BookingRow {
  consultation_type: "physical" | "virtual";
  customer: Array<{ full_name: string }>;
  id: string;
  listing: Array<{ location: string; title: string; duration_minutes: number }>;
  meet_link: string | null;
  meeting_link_status: "available" | "manual_required" | "not_required" | "pending_generation";
  payment_status: "paid" | "refunded" | "unpaid";
  rejection_reason: string | null;
  scheduled_date: string;
  start_time: string;
  status: "approved" | "completed" | "expired" | "initiated" | "pending" | "refunded" | "rejected";
}

export default async function ConsultantBookingDetailPage({
  params,
}: ConsultantBookingDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: booking } = await adminClient
    .from("bookings")
    .select(
      "consultation_type, customer:profiles(full_name), id, listing:listings(title, location, duration_minutes), meet_link, meeting_link_status, payment_status, rejection_reason, scheduled_date, start_time, status"
    )
    .eq("id", id)
    .eq("consultant_id", user.id)
    .maybeSingle();

  const bookingDetail = booking as BookingRow | null;

  if (!bookingDetail) {
    notFound();
  }

  const listing = bookingDetail.listing[0] ?? null;
  const customer = bookingDetail.customer[0] ?? null;

  return (
    <>
      <Navbar currentPath="/consultant/bookings" isAuthenticated role="consultant" />
      <PageContainer title="Booking Details">
        <div className={styles.layout}>
          <Link className={styles.backLink} href="/consultant/bookings">
            Back to bookings
          </Link>

          <Card>
            <div className={styles.header}>
              <div>
                <p className={styles.eyebrow}>Booking request</p>
                <h2 className={styles.title}>{listing?.title ?? "Consultation"}</h2>
                <p className={styles.metaText}>Customer: {customer?.full_name ?? "Customer"}</p>
              </div>
              <Badge variant={getBookingStatusVariant(bookingDetail.status)}>
                {getBookingStatusLabel(bookingDetail.status)}
              </Badge>
            </div>
          </Card>

          <Card>
            <div className={styles.details}>
              <div>
                <p className={styles.label}>Scheduled time</p>
                <p className={styles.value}>
                  {formatDateTime(bookingDetail.scheduled_date, bookingDetail.start_time)}
                </p>
              </div>
              <div>
                <p className={styles.label}>Consultation type</p>
                <p className={styles.value}>
                  {bookingDetail.consultation_type === "virtual" ? "Virtual" : "Physical"}
                </p>
              </div>
              <div>
                <p className={styles.label}>Duration</p>
                <p className={styles.value}>{listing?.duration_minutes ?? 0} minutes</p>
              </div>
              <div>
                <p className={styles.label}>Payment</p>
                <p className={styles.value}>{getPaymentStatusLabel(bookingDetail.payment_status)}</p>
              </div>
              <div>
                <p className={styles.label}>Location</p>
                <p className={styles.value}>{listing?.location ?? "Not available"}</p>
              </div>
              <div>
                <p className={styles.label}>Meeting link</p>
                <p className={styles.value}>
                  {bookingDetail.meet_link ? (
                    <a href={bookingDetail.meet_link} rel="noreferrer" target="_blank">
                      Open meeting link
                    </a>
                  ) : bookingDetail.consultation_type === "virtual" ? (
                    "Not added yet"
                  ) : (
                    "Not required"
                  )}
                </p>
              </div>
            </div>
            {bookingDetail.rejection_reason ? (
              <p className={styles.rejectionNotice}>
                Rejection reason: {bookingDetail.rejection_reason}
              </p>
            ) : null}
          </Card>

          {(bookingDetail.status === "pending" ||
            (bookingDetail.consultation_type === "virtual" &&
              bookingDetail.status === "approved" &&
              bookingDetail.meeting_link_status !== "available")) ? (
            <Card>
              <div className={styles.actionsCard}>
                <h3 className={styles.sectionTitle}>Manage this booking</h3>
                <ConsultantBookingActions
                  bookingId={bookingDetail.id}
                  consultationType={bookingDetail.consultation_type}
                  meetLink={bookingDetail.meet_link}
                  meetingLinkStatus={bookingDetail.meeting_link_status}
                  status={bookingDetail.status}
                />
              </div>
            </Card>
          ) : null}
        </div>
      </PageContainer>
    </>
  );
}
