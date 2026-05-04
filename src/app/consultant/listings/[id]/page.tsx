import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Card } from "@/components/ui/Card/Card";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils/format";
import styles from "./page.module.css";

export default async function ConsultantListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("consultant_id", user.id)
    .maybeSingle();

  if (!listing) {
    notFound();
  }

  return (
    <>
      <Navbar currentPath="/consultant/listings" isAuthenticated role="consultant" />
      <PageContainer title="Listing Details">
        <div className={styles.layout}>
          <div className={styles.actions}>
            <Link className={styles.secondaryLink} href="/consultant/listings">
              Back to listings
            </Link>
          </div>

          <Card>
            <div className={styles.header}>
              <div>
                <p className={styles.statusLabel}>Status</p>
                <p className={styles.statusValue}>{listing.status}</p>
              </div>
              <p className={styles.price}>{formatPrice(listing.price)}</p>
            </div>

            {listing.status === "rejected" && listing.rejection_reason ? (
              <p className={styles.rejectionNotice}>
                Rejection reason: {listing.rejection_reason}
              </p>
            ) : null}

            {listing.featured_image_url ? (
              <img
                alt={listing.title}
                className={styles.image}
                src={listing.featured_image_url}
              />
            ) : null}

            <div className={styles.content}>
              <h2 className={styles.title}>{listing.title}</h2>
              <p className={styles.meta}>
                {listing.category} · {listing.consultation_type} · {listing.duration_minutes} min
              </p>
              <p className={styles.meta}>{listing.location}</p>
              <p className={styles.description}>{listing.description}</p>
            </div>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
