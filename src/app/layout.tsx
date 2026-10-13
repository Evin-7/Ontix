import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ontix · Connected Data. Smarter Operations.",
  description: "A secure operations workspace for customer accounts, projects, cases, approvals, and audit activity.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
