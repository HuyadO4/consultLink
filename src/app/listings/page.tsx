import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { ListingCard } from "@/components/listings/ListingCard/ListingCard";
import { createClient } from "@/lib/supabase/server";
import type { Listing, Profile } from "@/types";
import styles from "./page.module.css";

interface ListingsPageProps {
  searchParams: Promise<{
    category?: string;
    query?: string;
  }>;
}

interface ListingRow {
  id: string;
  consultant_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  featured_image_url: string | null;
  consultation_type: "physical" | "virtual" | "both";
  duration_minutes: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  consultant: Array<Pick<Profile, "full_name" | "avatar_url">>;
}

const CATEGORIES = [
  "All",
  "Business Strategy",
  "Marketing",
  "Finance",
  "Legal",
  "Technology",
  "Operations",
  "HR",
  "Other",
];

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const { category = "All", query = "" } = await searchParams;
  const supabase = await createClient();

  let listingsQuery = supabase
    .from("listings")
    .select(
      "id, consultant_id, title, description, price, category, location, featured_image_url, consultation_type, duration_minutes, status, created_at, updated_at, consultant:profiles(full_name, avatar_url)"
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (query.trim()) {
    listingsQuery = listingsQuery.or(
      `title.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`
    );
  }

  if (category !== "All") {
    listingsQuery = listingsQuery.eq("category", category);
  }

  const { data: listingsData } = await listingsQuery;
  const listingIds = (listingsData ?? []).map((listing) => listing.id);

  let ratingsByListing = new Map<string, { average: number; count: number }>();

  if (listingIds.length > 0) {
    const { data: reviewRows } = await supabase
      .from("reviews")
      .select("listing_id, rating")
      .in("listing_id", listingIds);

    ratingsByListing = (reviewRows ?? []).reduce((accumulator, review) => {
      const current = accumulator.get(review.listing_id) ?? { average: 0, count: 0 };
      const nextCount = current.count + 1;
      const nextAverage = (current.average * current.count + review.rating) / nextCount;
      accumulator.set(review.listing_id, {
        average: nextAverage,
        count: nextCount,
      });
      return accumulator;
    }, new Map<string, { average: number; count: number }>());
  }

  const listings: Listing[] =
    ((listingsData as ListingRow[] | null) ?? []).map((listing) => {
      const rating = ratingsByListing.get(listing.id);
      const consultant = listing.consultant[0];

      return {
        ...listing,
        average_rating: rating?.average,
        consultant: consultant
          ? ({
              avatar_url: consultant.avatar_url,
              full_name: consultant.full_name,
            } as Profile)
          : undefined,
        review_count: rating?.count,
      };
    });

  return (
    <>
      <Navbar currentPath="/listings" />
      <PageContainer title="Find a Consultant">
        <div className={styles.layout}>
          <form className={styles.filters} method="get">
            <div className={styles.searchField}>
              <label className={styles.label} htmlFor="query">
                Search
              </label>
              <input
                className={styles.input}
                defaultValue={query}
                id="query"
                name="query"
                placeholder="Search by title or description"
                type="search"
              />
            </div>

            <div className={styles.categoryField}>
              <label className={styles.label} htmlFor="category">
                Category
              </label>
              <select className={styles.select} defaultValue={category} id="category" name="category">
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <button className={styles.submitButton} type="submit">
              Search
            </button>
          </form>

          {listings.length > 0 ? (
            <div className={styles.grid}>
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState
              message="No listings found. Try a different search or category."
              title="No listings found"
            />
          )}
        </div>
      </PageContainer>
    </>
  );
}
