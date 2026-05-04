import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConsultLink",
  description: "Book paid business consultations from verified Nigerian business owners.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
