import Link from "next/link";
import { redirect } from "next/navigation";
import { ListingModerationActions } from "@/components/admin/ListingModerationActions/ListingModerationActions";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils/format";
import styles from "./page.module.css";

interface AdminListingsPageProps {
  searchParams: Promise<{ status?: string }>;
}

interface ListingRow {
  consultant: Array<{ full_name: string }>;
  created_at: string;
  id: string;
  price: number;
  rejection_reason: string | null;
  status: "approved" | "pending" | "rejected";
  title: string;
}

function getVariant(status: ListingRow["status"]) {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

export default async function AdminListingsPage({ searchParams }: AdminListingsPageProps) {
  const { status = "all" } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let query = supabase
    .from("listings")
    .select("consultant:profiles(full_name), created_at, id, price, rejection_reason, status, title")
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data } = await query;
  const listings = ((data ?? []) as unknown as ListingRow[]).sort((left, right) => {
    if (left.status === "pending" && right.status !== "pending") return -1;
    if (left.status !== "pending" && right.status === "pending") return 1;
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

  return (
    <>
      <Navbar currentPath="/admin/listings" isAuthenticated role="admin" />
      <PageContainer title="Manage Listings">
        <div className={styles.layout}>
          <div>
            <h2 className={styles.heading}>Listing moderation</h2>
            <p className={styles.copy}>Approve strong listings and reject submissions that are not ready for customers yet.</p>
          </div>

          <div className={styles.filters}>
            {["all", "pending", "approved", "rejected"].map((value) => (
              <Link
                className={`${styles.filterLink} ${status === value ? styles.filterLinkActive : ""}`}
                href={value === "all" ? "/admin/listings" : `/admin/listings?status=${value}`}
                key={value}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </Link>
            ))}
          </div>

          {listings.length > 0 ? (
            <div className={styles.list}>
              {listings.map((listing) => (
                <Card key={listing.id}>
                  <div className={styles.row}>
                    <div className={styles.main}>
                      <h3 className={styles.title}>{listing.title}</h3>
                      <p className={styles.metaText}>
                        Consultant: {listing.consultant[0]?.full_name ?? "Consultant"}
                      </p>
                      <p className={styles.metaText}>Price: {formatPrice(listing.price)}</p>
                      {listing.rejection_reason ? (
                        <p className={styles.rejectionNotice}>Reason: {listing.rejection_reason}</p>
                      ) : null}
                    </div>
                    <div className={styles.side}>
                      <Badge variant={getVariant(listing.status)}>{listing.status}</Badge>
                      <ListingModerationActions listingId={listing.id} status={listing.status} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState message="Listings awaiting review will appear here." title="No listings found" />
          )}
        </div>
      </PageContainer>
    </>
  );
}
