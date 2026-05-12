import { redirect } from "next/navigation";
import { UserStatusToggle } from "@/components/admin/UserStatusToggle/UserStatusToggle";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { PageContainer } from "@/components/layout/PageContainer/PageContainer";
import { Card } from "@/components/ui/Card/Card";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

interface UserRow {
  email: string;
  full_name: string;
  id: string;
  is_suspended: boolean;
  role: "admin" | "consultant" | "customer";
}

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("profiles")
    .select("email, full_name, id, is_suspended, role")
    .order("created_at", { ascending: false });

  const users = (data ?? []) as UserRow[];

  return (
    <>
      <Navbar currentPath="/admin/users" isAuthenticated role="admin" />
      <PageContainer title="Manage Users">
        <div className={styles.layout}>
          <div>
            <h2 className={styles.heading}>User moderation</h2>
            <p className={styles.copy}>Suspend bad actors and reactivate users when issues are resolved.</p>
          </div>

          {users.length > 0 ? (
            <div className={styles.list}>
              {users.map((profile) => (
                <Card key={profile.id}>
                  <div className={styles.row}>
                    <div>
                      <h3 className={styles.title}>{profile.full_name}</h3>
                      <p className={styles.metaText}>{profile.email}</p>
                      <p className={styles.metaText}>Role: {profile.role}</p>
                      <p className={styles.metaText}>
                        Status: {profile.is_suspended ? "Suspended" : "Active"}
                      </p>
                    </div>
                    <UserStatusToggle isSuspended={profile.is_suspended} userId={profile.id} />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState message="Users will appear here once people start registering." title="No users found" />
          )}
        </div>
      </PageContainer>
    </>
  );
}
