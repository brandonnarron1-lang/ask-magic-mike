import type { Metadata } from "next";
import { ValueHero } from "@/components/campaign/value-hero";

export const metadata: Metadata = {
  title: "What's My Home Worth? | Mike Eatmon · Our Town Properties",
  description:
    "Get a real, local perspective on your Wilson NC home value from Mike Eatmon at Our Town Properties. No fluff, no automated guesses — just Mike.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "What's My Home Worth? | Mike Eatmon · Our Town Properties",
    description:
      "Wilson NC real estate guidance from a local expert. Start with your address.",
    siteName: "Ask Magic Mike",
    type: "website",
  },
};

export default function ValuePage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A]">
      <ValueHero />
    </main>
  );
}
