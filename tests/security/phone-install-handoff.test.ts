import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import robots from "../../app/robots";

describe("tokenized phone-install security boundary", () => {
  it("keeps all phone-alert setup and token paths out of search indexing", () => {
    const serialized = JSON.stringify(robots().rules);
    expect(serialized).toContain("/phone-alerts/");
  });

  it("overrides global headers with a no-store, no-referrer phone-alert boundary", () => {
    const config = readFileSync("next.config.ts", "utf8");
    const privateHeaders = config.slice(
      config.indexOf("const privatePhoneAlertHeaders"),
      config.indexOf("const nextConfig"),
    );
    const routeRule = config.slice(config.indexOf('source: "/phone-alerts/:path*"'));

    expect(privateHeaders).toContain('value: "no-referrer"');
    expect(privateHeaders).toContain("private, no-cache, no-store");
    expect(privateHeaders).toContain("noindex, nofollow, noarchive");
    expect(privateHeaders).toContain("base-uri 'none'");
    expect(privateHeaders).toContain("object-src 'none'");
    expect(routeRule).toContain("headers: privatePhoneAlertHeaders");
    expect(config.indexOf('source: "/phone-alerts/:path*"')).toBeGreaterThan(
      config.indexOf('source: "/:path*"'),
    );
  });

  it("keeps the one-time bearer token server-side and out of client storage", () => {
    const installPage = readFileSync("app/phone-alerts/install/[token]/page.tsx", "utf8");
    const manifest = readFileSync("app/phone-alerts/install/[token]/manifest.webmanifest/route.ts", "utf8");
    const claim = readFileSync("app/phone-alerts/setup/claim/route.ts", "utf8");

    for (const source of [installPage, manifest, claim]) {
      expect(source).not.toMatch(/localStorage|sessionStorage|dangerouslySetInnerHTML|postMessage/);
    }
    expect(claim).toContain("phone-setup-claim:${claims.nonce}");
    expect(claim).toContain("productionNeedsDurability && !oneTimeClaim.durable");
    expect(claim).toContain("existingSession?.nonce === claims.nonce");
  });
});
