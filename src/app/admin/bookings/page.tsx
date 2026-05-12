import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { getBookingStatusLabel, getBookingStatusVariant, getPaymentStatusLabel } from "@/lib/bookings";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/date";
import styles from "./page.module.css";

interface AdminBookingsPageProps {
  searchParams: Promise<{ status?: string }>;
}

interface BookingRow {
  consultant: Array<{ full_name: string }>;
  customer: Array<{ full_name: string }>;
  id: string;
  listing: Array<{ title: string }>;
  payment_status: "paid" | "refunded" | "unpaid";
  scheduled_date: string;
  start_time: string;
  status: "approved" | "completed" | "expired" | "initiated" | "pending" | "refunded" | "rejected";
}

export default async function AdminBookingsPage({ searchParams }: AdminBookingsPageProps) {
  const { status = "all" } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let query = supabase
    .from("bookings")
    .select(
      "consultant:profiles(full_name), customer:profiles(full_name), id, listing:listings(title), payment_status, scheduled_date, start_time, status"
    )
    .order("scheduled_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data } = await query;
  const bookings = (data ?? []) as unknown as BookingRow[];

  return (
    <>
      <Navbar currentPath="/admin/bookings" isAuthenticated role="admin" />
      <PageContainer title="Platform Bookings">
        <div className={styles.layout}>
          <div>
            <h2 className={styles.heading}>All bookings</h2>
            <p className={styles.copy}>Monitor platform activity and step in quickly if a dispute appears.</p>
          </div>

          <div className={styles.filters}>
            {["all", "pending", "approved", "rejected", "expired", "completed"].map((value) => (
              <Link
                className={`${styles.filterLink} ${status === value ? styles.filterLinkActive : ""}`}
                href={value === "all" ? "/admin/bookings" : `/admin/bookings?status=${value}`}
                key={value}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </Link>
            ))}
          </div>

          {bookings.length > 0 ? (
            <div className={styles.list}>
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <div className={styles.row}>
                    <div>
                      <h3 className={styles.title}>{booking.listing[0]?.title ?? "Consultation"}</h3>
                      <p className={styles.metaText}>
                        Customer: {booking.customer[0]?.full_name ?? "Customer"}
                      </p>
                      <p className={styles.metaText}>
                        Consultant: {booking.consultant[0]?.full_name ?? "Consultant"}
                      </p>
                      <p className={styles.metaText}>
                        {formatDateTime(booking.scheduled_date, booking.start_time)}
                      </p>
                      <p className={styles.metaText}>
                        Payment: {getPaymentStatusLabel(booking.payment_status)}
                      </p>
                    </div>
                    <Badge variant={getBookingStatusVariant(booking.status)}>
                      {getBookingStatusLabel(booking.status)}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState message="Bookings will appear here as the marketplace becomes active." title="No bookings found" />
          )}
        </div>
      </PageContainer>
    </>
  );
}
