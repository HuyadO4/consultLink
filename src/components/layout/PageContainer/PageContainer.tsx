import type { ReactNode } from "react";
import styles from "./PageContainer.module.css";

interface PageContainerProps {
  children: ReactNode;
  title?: string;
}

export function PageContainer({ children, title }: PageContainerProps) {
  return (
    <div className={styles.container}>
      {title ? <h1 className={styles.title}>{title}</h1> : null}
      {children}
    </div>
  );
}
