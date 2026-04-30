import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import styles from "./page.module.css";

export default function ListingsPage() {
  return (
    <>
      <Navbar currentPath="/listings" />
      <PageContainer title="Listings">
        <div className={styles.content}>
          <EmptyState
            message="Approved consultant listings will appear here in Iteration 2."
            title="Listings are coming soon"
          />
        </div>
      </PageContainer>
    </>
  );
}
