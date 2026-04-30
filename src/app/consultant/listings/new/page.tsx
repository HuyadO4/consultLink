import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Card } from "@/components/ui/Card/Card";
import { ListingForm } from "@/components/listings/ListingForm/ListingForm";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Navbar currentPath="/consultant/listings" isAuthenticated role="consultant" />
      <PageContainer title="Create a New Listing">
        <div className={styles.layout}>
          <Card>
            <div className={styles.header}>
              <h2 className={styles.heading}>Offer a consultation service</h2>
              <p className={styles.copy}>
                Your listing will be submitted for review before it appears publicly.
              </p>
            </div>
            <ListingForm consultantId={user.id} />
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
