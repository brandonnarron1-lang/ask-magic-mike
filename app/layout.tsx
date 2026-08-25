import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { siteConfig } from "@/lib/site-config";
import { ExternalAnalyticsConsentManager } from "./components/analytics/ExternalAnalyticsConsent";
import { WebVitalsReporter } from "./components/experience/WebVitalsReporter";
import { resolveProductionGtmContainerId } from "./lib/googleTagConfig";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = siteConfig.canonicalSiteUrl;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ask Magic Mike | Wilson, NC Real Estate Guidance",
    template: "%s | Ask Magic Mike",
  },
  description:
    "Local home value guidance, seller strategy, and real estate answers from Mike Eatmon and Our Town Properties in Wilson, North Carolina.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Magic Mike", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "Ask Magic Mike | Our Town Properties",
    description:
      "Premium local real estate guidance for Wilson, NC homeowners and buyers.",
    url: SITE_URL,
    siteName: "Ask Magic Mike",
    images: [
      {
        url: "/brand/black-diamond/hero-social-4x5.jpg",
        width: 1080,
        height: 1350,
        alt: "Mike Eatmon with luxury lakefront property at dusk",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  twitter: {
    card: "summary_large_image",
    title: "Ask Magic Mike | Wilson, NC Real Estate Guidance",
    description:
      "Local home value guidance and seller strategy from Our Town Properties.",
    images: ["/brand/black-diamond/hero-social-4x5.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmContainerId = resolveProductionGtmContainerId({
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_GTM_CONTAINER_ID: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID,
  });
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-amm-external-analytics={gtmContainerId ? "available" : undefined}
    >
      <body className="antialiased">
        <Suspense fallback={null}>
          <ExternalAnalyticsConsentManager gtmContainerId={gtmContainerId} />
        </Suspense>
        {process.env.VERCEL_ENV === "production" ? <WebVitalsReporter /> : null}
        {children}
      </body>
    </html>
  );
}
