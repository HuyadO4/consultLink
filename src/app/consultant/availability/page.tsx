import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { AvailabilityPicker } from "@/components/availability/AvailabilityPicker/AvailabilityPicker";
import { createClient } from "@/lib/supabase/server";
import type { AvailabilitySlot } from "@/types";
import styles from "./page.module.css";

export default async function ConsultantAvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: availability } = await supabase
    .from("availability_slots")
    .select("id, consultant_id, day_of_week, start_time, end_time, is_active, created_at")
    .eq("consultant_id", user.id)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  return (
    <>
      <Navbar currentPath="/consultant/availability" isAuthenticated role="consultant" />
      <PageContainer title="Manage Availability">
        <div className={styles.layout}>
          <p className={styles.copy}>
            Add recurring weekly time slots so customers can see when you are generally available.
          </p>
          <AvailabilityPicker
            consultantId={user.id}
            initialSlots={(availability ?? []) as AvailabilitySlot[]}
          />
        </div>
      </PageContainer>
    </>
  );
}
