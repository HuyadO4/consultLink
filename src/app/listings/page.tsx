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
  consultant: Pick<Profile, "full_name"> | null;
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
      "id, consultant_id, title, description, price, category, location, featured_image_url, consultation_type, duration_minutes, status, created_at, updated_at, consultant:profiles(full_name)"
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

  const listings: Listing[] =
    listingsData?.map((listing: ListingRow) => ({
      ...listing,
      consultant: listing.consultant
        ? ({
            full_name: listing.consultant.full_name,
          } as Profile)
        : undefined,
    })) ?? [];

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
              message="Try a different search."
              title="No listings found."
            />
          )}
        </div>
      </PageContainer>
    </>
  );
}
