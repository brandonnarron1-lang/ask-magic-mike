import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
  title: "Ask Magic Mike | Local Real Estate AI — Our Town Properties",
  description:
    "Get real answers about Wilson NC and Eastern NC real estate — home values, market timing, buying power, and expert guidance from Mike Eatmon at Our Town Properties.",
  keywords: [
    "Wilson NC real estate",
    "Eastern NC real estate",
    "home value estimate",
    "Our Town Properties",
    "Mike Eatmon",
    "sell my home Wilson NC",
    "buy a home Eastern NC",
  ],
  authors: [{ name: "Mike Eatmon", url: "https://askmagicmike.com" }],
  openGraph: {
    title: "Ask Magic Mike | Local Real Estate AI",
    description:
      "Real answers about Wilson NC and Eastern NC real estate from a licensed local expert.",
    siteName: "Ask Magic Mike",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ask Magic Mike | Local Real Estate AI",
    description: "Real answers about Wilson NC and Eastern NC real estate.",
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
