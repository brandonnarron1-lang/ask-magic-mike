import type { Metadata } from "next";
import { BlackDiamondShell } from "./components/black-diamond/BlackDiamondShell";
import { HomepageStructuredData } from "./components/seo/HomepageStructuredData";
import { publicPageMetadata } from "./lib/publicMetadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Ask Magic Mike | Wilson, NC Real Estate Guidance",
  description: "Local home value guidance, seller strategy, and real estate answers from Mike Eatmon and Our Town Properties in Wilson, North Carolina.",
  path: "/",
});

export default function Home() {
  return (
    <>
      <HomepageStructuredData />
      <BlackDiamondShell />
    </>
  );
}
