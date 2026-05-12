"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./LogoutButton";
import styles from "./Navbar.module.css";

type UserRole = "customer" | "consultant" | "admin";

interface NavbarProps {
  currentPath?: string;
  isAuthenticated?: boolean;
  role?: UserRole | null;
  unreadCount?: number;
}

function getLinks(role: UserRole | null, isAuthenticated: boolean) {
  if (!isAuthenticated) {
    return [
      { href: "/listings", label: "Browse Listings" },
      { href: "/login", label: "Login" },
      { href: "/register", label: "Register" },
    ];
  }

  if (role === "admin") {
    return [
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/listings", label: "Listings" },
      { href: "/admin/bookings", label: "Bookings" },
      { href: "/admin/users", label: "Users" },
    ];
  }

  if (role === "consultant") {
    return [
      { href: "/consultant/dashboard", label: "Dashboard" },
      { href: "/consultant/bookings", label: "Bookings" },
      { href: "/consultant/listings", label: "Listings" },
      { href: "/consultant/listings/new", label: "New Listing" },
      { href: "/consultant/availability", label: "Availability" },
    ];
  }

  return [
    { href: "/user/dashboard", label: "Dashboard" },
    { href: "/user/bookings", label: "Bookings" },
    { href: "/listings", label: "Browse Listings" },
  ];
}

export function Navbar({
  currentPath = "/",
  isAuthenticated = false,
  role = null,
  unreadCount = 0,
}: NavbarProps) {
  const supabase = useMemo(() => createClient(), []);
  const [resolvedIsAuthenticated, setResolvedIsAuthenticated] = useState(isAuthenticated);
  const [resolvedRole, setResolvedRole] = useState<UserRole | null>(role);
  const [resolvedUnreadCount, setResolvedUnreadCount] = useState(unreadCount);

  useEffect(() => {
    let isMounted = true;

    async function loadNavbarContext() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted) {
          return;
        }

        if (!user) {
          setResolvedIsAuthenticated(false);
          setResolvedRole(null);
          setResolvedUnreadCount(0);
          return;
        }

        setResolvedIsAuthenticated(true);

        const [{ data: profile }, { count }] = await Promise.all([
          supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
          supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false),
        ]);

        if (!isMounted) {
          return;
        }

        if (profile?.role === "admin" || profile?.role === "consultant" || profile?.role === "customer") {
          setResolvedRole(profile.role);
        } else {
          setResolvedRole(null);
        }

        setResolvedUnreadCount(count ?? 0);
      } catch (error) {
        console.error(error);
      }
    }

    void loadNavbarContext();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const links = getLinks(resolvedRole, resolvedIsAuthenticated);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.logo} href="/">
          ConsultLink
        </Link>
        <nav className={styles.nav} aria-label="Primary navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              className={`${styles.link} ${currentPath === link.href ? styles.active : ""}`}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          {resolvedIsAuthenticated ? (
            <>
              <Link className={styles.notification} href="/notifications">
                <span className={styles.notificationIcon} aria-hidden="true">
                  Bell
                </span>
                {resolvedUnreadCount > 0 ? (
                  <span className={styles.notificationBadge}>{resolvedUnreadCount}</span>
                ) : null}
              </Link>
              <div className={styles.avatar}>CL</div>
              <LogoutButton />
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
