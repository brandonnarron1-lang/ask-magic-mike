import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Production alias today is ask-magic-mike.vercel.app — used so Next.js resolves
 * OG image paths to absolute URLs that crawlers can fetch. When we migrate to
 * askmagicmike.com this constant flips, see
 * docs/ask-magic-mike-visual-upgrade-plan.md.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ask-magic-mike.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
  title:
    "Ask Magic Mike by Our Town Properties | Mike Eatmon — Wilson NC Real Estate",
  description:
    "AI-assisted intake with local human follow-up from Mike Eatmon at Our Town Properties. See a preliminary home value range and get real guidance for Wilson and Eastern NC.",
  keywords: [
    "Wilson NC real estate",
    "Eastern NC real estate",
    "preliminary home value range",
    "Our Town Properties",
    "Mike Eatmon",
    "sell my home Wilson NC",
    "buy a home Eastern NC",
  ],
  authors: [{ name: "Mike Eatmon" }, { name: "Our Town Properties, Inc." }],
  openGraph: {
    title:
      "Ask Magic Mike by Our Town Properties | Mike Eatmon — Wilson NC",
    description:
      "Start with your address. Get a local read on your home from Mike Eatmon's Our Town Properties team. AI-assisted intake, local human follow-up.",
    siteName: "Ask Magic Mike",
    type: "website",
    images: [
      {
        url: "/images/ask-magic-mike/mike-eatmon-headshot.webp",
        width: 515,
        height: 720,
        alt: "Mike Eatmon, broker at Our Town Properties, Inc.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ask Magic Mike by Our Town Properties",
    description:
      "Start with your address. Get a local read on your home — Mike Eatmon, Our Town Properties.",
    images: ["/images/ask-magic-mike/mike-eatmon-headshot.webp"],
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
        {children}
      </body>
    </html>
  );
}
