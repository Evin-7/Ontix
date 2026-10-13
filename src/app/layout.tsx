import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";

export const metadata: Metadata = {
  applicationName: "Ontix",
  title: "Ontix | Enterprise Operations Platform",
  description: "Connected Data. Smarter Operations.",
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000"),
  openGraph: {
    type: "website",
    siteName: "Ontix",
    title: "Ontix | Enterprise Operations Platform",
    description: "Connected Data. Smarter Operations.",
    images: [{ url: "/ontix-og.png", width: 1200, height: 630, alt: "Ontix · Connected Data. Smarter Operations." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ontix | Enterprise Operations Platform",
    description: "Connected Data. Smarter Operations.",
    images: ["/ontix-og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
