import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync("next.config.ts", "utf8");

describe("Lead Center private response headers", () => {
  it("prevents caching, framing, and indexing of private and identity pages", () => {
    expect(config).toContain('source: "/admin/:path*"');
    expect(config).toContain('source: "/lead-center-login"');
    expect(config).toContain('source: "/lead-center-password-help"');
    expect(config).toContain('source: "/lead-center-set-password"');
    expect(config).toContain("private, no-cache, no-store");
    expect(config).toContain("frame-ancestors 'self'");
    expect(config).toContain("X-Frame-Options");
    expect(config).toContain("noindex, nofollow, noarchive");
  });
});
