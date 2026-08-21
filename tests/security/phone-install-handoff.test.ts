import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import robots from "../../app/robots";

describe("tokenized phone-install search boundary", () => {
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
    expect(routeRule).toContain("headers: privatePhoneAlertHeaders");
    expect(config.indexOf('source: "/phone-alerts/:path*"')).toBeGreaterThan(
      config.indexOf('source: "/:path*"'),
    );
  });
});
