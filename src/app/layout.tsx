import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  applicationName: "Ontix",
  title: "Ontix | Enterprise Operations Platform",
  description: "Connected Data. Smarter Operations.",
  metadataBase: new URL(process.env.ONTIX_APPLICATION_URL ?? process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000"),
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
    <html lang="en" suppressHydrationWarning className="min-w-80 min-h-full bg-background scheme-light dark:scheme-dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-w-80 min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary-subtle selection:text-foreground [font-feature-settings:'cv02','cv03','cv04','cv11'] [text-rendering:optimizeLegibility]`}>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
