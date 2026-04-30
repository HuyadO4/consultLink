import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils/format";
import styles from "./page.module.css";

interface ConsultantListingsPageProps {
  searchParams: Promise<{
    created?: string;
  }>;
}

interface ListingRow {
  id: string;
  title: string;
  status: "pending" | "approved" | "rejected";
  price: number;
  created_at: string;
}

function getBadgeVariant(status: ListingRow["status"]) {
  if (status === "approved") {
    return "approved";
  }

  if (status === "rejected") {
    return "rejected";
  }

  return "pending";
}

export default async function ConsultantListingsPage({
  searchParams,
}: ConsultantListingsPageProps) {
  const { created } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, status, price, created_at")
    .eq("consultant_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <Navbar currentPath="/consultant/listings" isAuthenticated role="consultant" />
      <PageContainer title="Your Listings">
        <div className={styles.layout}>
          <div className={styles.topRow}>
            <div>
              <p className={styles.copy}>
                Track every listing you have submitted and see its review status.
              </p>
              {created === "1" ? (
                <p className={styles.success}>
                  Your listing has been submitted for review.
                </p>
              ) : null}
            </div>

            <Link className={styles.primaryLink} href="/consultant/listings/new">
              Create Listing
            </Link>
          </div>

          {listings && listings.length > 0 ? (
            <Card>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Price</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((listing: ListingRow) => (
                      <tr key={listing.id}>
                        <td>{listing.title}</td>
                        <td>
                          <Badge variant={getBadgeVariant(listing.status)}>
                            {listing.status}
                          </Badge>
                        </td>
                        <td>{formatPrice(listing.price)}</td>
                        <td>
                          {new Intl.DateTimeFormat("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(listing.created_at))}
                        </td>
                        <td>
                          <Link
                            className={styles.actionLink}
                            href={`/consultant/listings/${listing.id}`}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState
              action={
                <Link className={styles.primaryLink} href="/consultant/listings/new">
                  Create your first listing
                </Link>
              }
              message="Once you submit a consultation service, it will appear here."
              title="No listings yet"
            />
          )}
        </div>
      </PageContainer>
    </>
  );
}
