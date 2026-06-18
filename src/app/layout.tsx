import type { Metadata, Viewport } from "next";
import { mikePlatformAssets } from "@/lib/mikePlatformAssets";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

const SITE_URL = siteConfig.canonicalSiteUrl;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
  title:
    "Ask Magic Mike by Our Town Properties | Mike Eatmon — Wilson NC Real Estate",
  description:
    "AI-assisted intake with local human follow-up from Mike Eatmon at Our Town Properties. Share the property details and get broker-reviewed guidance for Wilson and Eastern NC.",
  keywords: [
    "Wilson NC real estate",
    "Eastern NC real estate",
    "Wilson NC property review assistant",
    "Our Town Properties",
    "Mike Eatmon",
    "sell my home Wilson NC",
    "buy a home Eastern NC",
  ],
  authors: [{ name: "Mike Eatmon" }, { name: "Our Town Properties, Inc." }],
  openGraph: {
    title:
      "Ask Magic Mike — Wilson, NC Real Estate by Our Town Properties",
    description:
      "Share the property details. Mike Eatmon's Our Town Properties team follows up with broker-reviewed local guidance.",
    siteName: "Ask Magic Mike",
    url: SITE_URL,
    type: "website",
    images: [
      {
        url: mikePlatformAssets.openGraphCard.src,
        width: mikePlatformAssets.openGraphCard.width,
        height: mikePlatformAssets.openGraphCard.height,
        alt: mikePlatformAssets.openGraphCard.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ask Magic Mike by Our Town Properties",
    description:
      "Wilson, NC property review assistant with broker-reviewed local guidance from Mike Eatmon.",
    images: [mikePlatformAssets.openGraphCard.src],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-midnight text-cream antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-midnight"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
