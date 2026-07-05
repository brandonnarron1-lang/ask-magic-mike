import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://askmagicmike.com"),
  title: {
    default: "Ask Magic Mike | Wilson, NC Real Estate Guidance",
    template: "%s | Ask Magic Mike",
  },
  description:
    "Local home value guidance, seller strategy, and real estate answers from Mike Eatmon and Our Town Properties in Wilson, North Carolina.",
  openGraph: {
    title: "Ask Magic Mike | Our Town Properties",
    description:
      "Premium local real estate guidance for Wilson, NC homeowners and buyers.",
    url: "https://askmagicmike.com",
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
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
