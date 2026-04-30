import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <PageContainer>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.kicker}>ConsultLink</span>
          <h1 className={styles.title}>Book expert consultations. On your terms.</h1>
          <p className={styles.description}>
            Find trusted Nigerian business owners offering practical advice for growth,
            operations, finance, marketing, and more.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/listings">
              Find a Consultant
            </Link>
            <Link className={styles.secondaryAction} href="/register?role=consultant">
              Become a Consultant
            </Link>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
