import type { Metadata } from "next";
import { publicPageMetadata } from "../lib/publicMetadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Home Value Review in Wilson, NC",
  description: "Request a broker-reviewed home value and sale-readiness conversation from Mike Eatmon and Our Town Properties. No instant automated estimate or guaranteed value.",
  path: "/value",
  canonicalPath: "/home-value",
});

export { default } from "../home-value/page";
