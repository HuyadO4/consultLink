import Link from "next/link";
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
    ];
  }

  if (role === "consultant") {
    return [
      { href: "/consultant/dashboard", label: "Dashboard" },
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
  const links = getLinks(role, isAuthenticated);

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
          {isAuthenticated ? (
            <>
              <div className={styles.notification}>
                <span className={styles.notificationIcon} aria-hidden="true">
                  Bell
                </span>
                {unreadCount > 0 ? (
                  <span className={styles.notificationBadge}>{unreadCount}</span>
                ) : null}
              </div>
              <div className={styles.avatar}>CL</div>
              <LogoutButton />
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
