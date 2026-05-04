import Link from "next/link";
import { formatPrice, truncate } from "@/lib/utils/format";
import type { Listing } from "@/types";
import styles from "./ListingCard.module.css";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const consultantName = listing.consultant?.full_name ?? "Consultant";
  const avatarUrl = listing.consultant?.avatar_url ?? null;

  return (
    <Link className={styles.card} href={`/listings/${listing.id}`}>
      <div className={styles.imageWrapper}>
        <span className={styles.category}>{listing.category}</span>
        {listing.featured_image_url ? (
          <img
            alt={listing.title}
            className={styles.image}
            src={listing.featured_image_url}
          />
        ) : (
          <div className={styles.placeholder}>No image yet</div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.consultantRow}>
          {avatarUrl ? (
            <img alt={consultantName} className={styles.avatarImage} src={avatarUrl} />
          ) : (
            <div className={styles.avatar}>{consultantName.slice(0, 1).toUpperCase()}</div>
          )}
          <span className={styles.consultantName}>{consultantName}</span>
        </div>

        <div className={styles.content}>
          <h3 className={styles.title}>{truncate(listing.title, 64)}</h3>
          <p className={styles.description}>{truncate(listing.description, 110)}</p>
        </div>

        <div className={styles.footer}>
          <div>
            <p className={styles.price}>{formatPrice(listing.price)}</p>
            <p className={styles.meta}>
              {listing.consultation_type} · {listing.duration_minutes} min
            </p>
            {listing.average_rating ? (
              <p className={styles.rating}>
                {listing.average_rating.toFixed(1)} stars · {listing.review_count} review
                {listing.review_count === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
          <span className={styles.action}>Book Now</span>
        </div>
      </div>
    </Link>
  );
}
