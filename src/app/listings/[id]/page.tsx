import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { ListingDetail } from "@/components/listings/ListingDetail/ListingDetail";
import { createClient } from "@/lib/supabase/server";
import type { AvailabilitySlot, Listing, Profile, Review } from "@/types";

interface ListingPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface ListingQueryRow {
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

interface ReviewRow {
  id: string;
  booking_id: string;
  listing_id: string;
  customer_id: string;
  consultant_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer: Pick<Profile, "full_name"> | null;
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: listingData } = await supabase
    .from("listings")
    .select(
      "id, consultant_id, title, description, price, category, location, featured_image_url, consultation_type, duration_minutes, status, created_at, updated_at, consultant:profiles(full_name)"
    )
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (!listingData) {
    notFound();
  }

  const { data: availabilityData } = await supabase
    .from("availability_slots")
    .select("id, consultant_id, day_of_week, start_time, end_time, is_active, created_at")
    .eq("consultant_id", listingData.consultant_id)
    .eq("is_active", true)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  const { data: reviewsData } = await supabase
    .from("reviews")
    .select(
      "id, booking_id, listing_id, customer_id, consultant_id, rating, comment, created_at, customer:profiles(full_name)"
    )
    .eq("listing_id", id)
    .order("created_at", { ascending: false });

  const listing: Listing = {
    ...(listingData as ListingQueryRow),
    consultant: listingData.consultant
      ? ({
          full_name: listingData.consultant.full_name,
        } as Profile)
      : undefined,
  };

  const availability: AvailabilitySlot[] = availabilityData ?? [];
  const reviews: Review[] =
    reviewsData?.map((review: ReviewRow) => ({
      ...review,
      customer: review.customer
        ? ({
            full_name: review.customer.full_name,
          } as Profile)
        : undefined,
    })) ?? [];

  return (
    <>
      <Navbar currentPath="/listings" isAuthenticated={Boolean(user)} />
      <PageContainer>
        <ListingDetail
          availability={availability}
          isAuthenticated={Boolean(user)}
          listing={listing}
          reviews={reviews}
        />
      </PageContainer>
    </>
  );
}
