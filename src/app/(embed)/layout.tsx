import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Ask Magic Mike",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0A0A",
};

// Embed routes are iframe-safe — no nav, no footer, minimal chrome
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
