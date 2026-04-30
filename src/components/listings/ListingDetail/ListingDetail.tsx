import Link from "next/link";
import { formatPrice } from "@/lib/utils/format";
import { getDayLabel } from "@/lib/utils/date";
import type { AvailabilitySlot, Listing, Review } from "@/types";
import styles from "./ListingDetail.module.css";

interface ListingDetailProps {
  availability: AvailabilitySlot[];
  isAuthenticated: boolean;
  listing: Listing;
  reviews: Review[];
}

function getAverageRating(reviews: Review[]) {
  if (reviews.length === 0) {
    return null;
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return (total / reviews.length).toFixed(1);
}

export function ListingDetail({
  availability,
  isAuthenticated,
  listing,
  reviews,
}: ListingDetailProps) {
  const averageRating = getAverageRating(reviews);
  const consultantName = listing.consultant?.full_name ?? "Consultant";

  return (
    <div className={styles.layout}>
      <div className={styles.hero}>
        {listing.featured_image_url ? (
          <img
            alt={listing.title}
            className={styles.heroImage}
            src={listing.featured_image_url}
          />
        ) : (
          <div className={styles.heroPlaceholder}>No featured image available</div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.main}>
          <div className={styles.header}>
            <div className={styles.badges}>
              <span className={styles.badge}>{listing.category}</span>
              <span className={styles.badge}>{listing.consultation_type}</span>
            </div>
            <h1 className={styles.title}>{listing.title}</h1>
            <div className={styles.consultantRow}>
              <div className={styles.avatar}>{consultantName.slice(0, 1).toUpperCase()}</div>
              <div>
                <p className={styles.consultantName}>{consultantName}</p>
                <p className={styles.metaText}>
                  {averageRating ? `${averageRating} stars` : "No reviews yet"} ·{" "}
                  {reviews.length} review{reviews.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>About this consultation</h2>
            <p className={styles.description}>{listing.description}</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Availability</h2>
            {availability.length > 0 ? (
              <div className={styles.availabilityList}>
                {availability.map((slot) => (
                  <div className={styles.availabilityItem} key={slot.id}>
                    <span>{getDayLabel(slot.day_of_week)}</span>
                    <span>
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.metaText}>Availability will be added by the consultant soon.</p>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Reviews</h2>
            {reviews.length > 0 ? (
              <div className={styles.reviewList}>
                {reviews.map((review) => (
                  <article className={styles.reviewCard} key={review.id}>
                    <div className={styles.reviewHeader}>
                      <p className={styles.reviewName}>
                        {review.customer?.full_name ?? "Customer"}
                      </p>
                      <p className={styles.reviewRating}>{review.rating}/5</p>
                    </div>
                    <p className={styles.reviewDate}>
                      {new Intl.DateTimeFormat("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(review.created_at))}
                    </p>
                    {review.comment ? <p className={styles.reviewComment}>{review.comment}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.metaText}>No reviews yet.</p>
            )}
          </section>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <p className={styles.price}>{formatPrice(listing.price)}</p>
            <p className={styles.metaText}>{listing.duration_minutes} minutes</p>
            <p className={styles.metaText}>{listing.location}</p>

            {isAuthenticated ? (
              <button className={styles.ctaButton} type="button">
                Booking starts in Iteration 3
              </button>
            ) : (
              <Link className={styles.ctaButton} href={`/login?next=/listings/${listing.id}`}>
                Book Consultation
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
