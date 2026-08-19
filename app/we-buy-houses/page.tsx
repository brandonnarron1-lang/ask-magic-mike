import type { Metadata } from "next";
import { publicPageMetadata } from "../lib/publicMetadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Seller Options in Wilson, NC",
  description: "Discuss timing, preparation, repairs, listing strategy, and possible as-is paths with Mike Eatmon and Our Town Properties before deciding how to sell.",
  path: "/we-buy-houses",
  canonicalPath: "/sell",
});

export { default } from "../sell/page";
