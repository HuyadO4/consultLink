import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { RescheduleBooking } from "@/components/bookings/RescheduleBooking/RescheduleBooking";
import { ReviewForm } from "@/components/reviews/ReviewForm/ReviewForm";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import {
  getBookingStatusLabel,
  getBookingStatusVariant,
  getPaymentStatusLabel,
} from "@/lib/bookings";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, isPast } from "@/lib/utils/date";
import styles from "./page.module.css";

interface BookingDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface BookingDetailRow {
  consultation_type: "physical" | "virtual";
  end_time: string;
  id: string;
  listing: Array<{
    duration_minutes: number;
    id: string;
    location: string;
    title: string;
  }>;
  meet_link: string | null;
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
  consultant: Array<{
    full_name: string;
  }>;
}

export default async function UserBookingDetailPage({ params }: BookingDetailPageProps) {
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
      "id, scheduled_date, start_time, end_time, status, payment_status, consultation_type, meet_link, listing:listings(id, title, location, duration_minutes), consultant:profiles(full_name)"
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  const bookingDetail = booking as BookingDetailRow | null;

  if (!bookingDetail) {
    notFound();
  }

  const listing = bookingDetail.listing[0] ?? null;
  const consultant = bookingDetail.consultant[0] ?? null;
  const rescheduleListingId = bookingDetail.status === "pending" ? listing?.id ?? null : null;
  const showMeetLink =
    bookingDetail.consultation_type === "virtual" &&
    bookingDetail.status === "approved" &&
    bookingDetail.meet_link;
  const { data: existingReview } = await adminClient
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingDetail.id)
    .maybeSingle();
  const canLeaveReview =
    !existingReview &&
    ["approved", "completed"].includes(bookingDetail.status) &&
    isPast(bookingDetail.scheduled_date, bookingDetail.end_time);

  return (
    <>
      <Navbar currentPath="/user/bookings" isAuthenticated role="customer" />
      <PageContainer title="Booking Details">
        <div className={styles.layout}>
          <Link className={styles.backLink} href="/user/bookings">
            Back to bookings
          </Link>

          <Card>
            <div className={styles.header}>
              <div>
                <p className={styles.eyebrow}>Booking</p>
                <h2 className={styles.title}>
                  {listing?.title ?? "Consultation"}
                </h2>
                <p className={styles.metaText}>
                  Consultant: {consultant?.full_name ?? "Consultant"}
                </p>
              </div>
              <Badge variant={getBookingStatusVariant(bookingDetail.status)}>
                {getBookingStatusLabel(bookingDetail.status)}
              </Badge>
            </div>
          </Card>

          <Card>
            <div className={styles.details}>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Scheduled time</p>
                <p className={styles.detailValue}>
                  {formatDateTime(bookingDetail.scheduled_date, bookingDetail.start_time)}
                </p>
              </div>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Consultation type</p>
                <p className={styles.detailValue}>
                  {bookingDetail.consultation_type === "virtual" ? "Virtual" : "Physical"}
                </p>
              </div>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Duration</p>
                <p className={styles.detailValue}>
                  {listing?.duration_minutes ?? 0} minutes
                </p>
              </div>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Payment status</p>
                <p className={styles.detailValue}>
                  {getPaymentStatusLabel(bookingDetail.payment_status)}
                </p>
              </div>
              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Location</p>
                <p className={styles.detailValue}>
                  {listing?.location ?? "Not available"}
                </p>
              </div>
              {showMeetLink ? (
                <div className={styles.detailItem}>
                  <p className={styles.detailLabel}>Meeting link</p>
                  <a
                    className={styles.meetLink}
                    href={bookingDetail.meet_link ?? "#"}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Join virtual session
                  </a>
                </div>
              ) : null}
            </div>
          </Card>

          {rescheduleListingId ? (
            <Card>
              <div className={styles.rescheduleCard}>
                <div>
                  <h3 className={styles.sectionTitle}>Need a different time?</h3>
                  <p className={styles.metaText}>
                    You can reschedule while this booking is still awaiting approval. You will not
                    be charged again.
                  </p>
                </div>
                <RescheduleBooking bookingId={bookingDetail.id} listingId={rescheduleListingId} />
              </div>
            </Card>
          ) : null}

          {canLeaveReview ? (
            <Card>
              <div className={styles.rescheduleCard}>
                <div>
                  <h3 className={styles.sectionTitle}>Leave a review</h3>
                  <p className={styles.metaText}>
                    Share a rating and optional comment to help other customers book with confidence.
                  </p>
                </div>
                <ReviewForm bookingId={bookingDetail.id} />
              </div>
            </Card>
          ) : existingReview ? (
            <Card>
              <div className={styles.rescheduleCard}>
                <div>
                  <h3 className={styles.sectionTitle}>Review submitted</h3>
                  <p className={styles.metaText}>
                    You have already shared feedback for this session.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </PageContainer>
    </>
  );
}
