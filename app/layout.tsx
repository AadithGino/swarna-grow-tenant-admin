import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/src/app/providers";
import {
  VINEXT_STATIC_LOCATION_BOOTSTRAP,
  VINEXT_STATIC_LOCATION_BOOTSTRAP_LATE,
} from "@/src/lib/vinext-static-location-bootstrap";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SwarnaGrow — Gold Savings",
  description: "Secure jewellery savings and customer servicing portal",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <Script id="sg-static-location-bootstrap" strategy="beforeInteractive">
          {VINEXT_STATIC_LOCATION_BOOTSTRAP}
        </Script>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
        <Script id="sg-static-location-bootstrap-late" strategy="afterInteractive">
          {VINEXT_STATIC_LOCATION_BOOTSTRAP_LATE}
        </Script>
      </body>
    </html>
  );
}
