import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campaign Generator — 11 Ready-to-Use Presets | Ask Magic Mike",
  description:
    "11 compliance-reviewed campaign presets for Wilson, NC real estate — Facebook posts, Instagram captions, email blasts, QR flyers, video scripts, and more. Every CTA is UTM-tracked.",
  robots: { index: true, follow: true },
};

export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
