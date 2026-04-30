import Link from "next/link";
import styles from "./Navbar.module.css";

interface NavbarProps {
  currentPath?: string;
  unreadCount?: number;
}

export function Navbar({ currentPath = "/", unreadCount = 0 }: NavbarProps) {
  const links = [
    { href: "/listings", label: "Browse Listings" },
    { href: "/login", label: "Login" },
    { href: "/register", label: "Register" },
  ];

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
          <div className={styles.notification}>
            <span className={styles.notificationIcon} aria-hidden="true">
              Bell
            </span>
            {unreadCount > 0 ? <span className={styles.notificationBadge}>{unreadCount}</span> : null}
          </div>
          <div className={styles.avatar}>CL</div>
        </div>
      </div>
    </header>
  );
}
