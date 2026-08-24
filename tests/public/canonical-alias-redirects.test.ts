import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getRedirectUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

const canonicalRedirects = [
  ["/value", "/home-value"],
  ["/we-buy-houses", "/sell"],
] as const;

describe("canonical campaign alias redirects", () => {
  it.each(canonicalRedirects)(
    "permanently redirects %s to %s and preserves attribution parameters",
    async (source, destination) => {
      const response = await unstable_getResponseFromNextConfig({
        url: `https://www.askmagicmike.com${source}?utm_source=wordpress&utm_medium=owned_media&utm_campaign=canonical_consolidation&gclid=TEST_CLICK_ID`,
        nextConfig,
      });

      expect(response.status).toBe(308);
      const redirectUrl = getRedirectUrl(response);
      expect(redirectUrl).not.toBeNull();

      const parsed = new URL(redirectUrl!);
      expect(parsed.origin).toBe("https://www.askmagicmike.com");
      expect(parsed.pathname).toBe(destination);
      expect(Object.fromEntries(parsed.searchParams)).toEqual({
        utm_source: "wordpress",
        utm_medium: "owned_media",
        utm_campaign: "canonical_consolidation",
        gclid: "TEST_CLICK_ID",
      });
    },
  );

  it("links public navigation directly to canonical conversion routes", () => {
    const contactPage = readFileSync(join(process.cwd(), "app/contact/page.tsx"), "utf8");
    expect(contactPage).toContain('href="/home-value"');
    expect(contactPage).not.toContain('href="/value"');
  });
});
