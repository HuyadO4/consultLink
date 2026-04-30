"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./Navbar.module.css";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button className={styles.logoutButton} onClick={handleLogout} type="button">
      Logout
    </button>
  );
}
