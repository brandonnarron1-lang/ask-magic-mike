import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "../../src/middleware";

describe("Lead Center subdomain boundary", () => {
  it("redirects the brokerage shortcut to the one canonical protected admin URL", async () => {
    const response = await middleware(
      new NextRequest(
        "https://hub.ourtownproperties.com/leads/private-id?email=do-not-forward@example.test",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://www.askmagicmike.com/admin",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("keeps the root middleware matcher limited to admin paths and the exact hub host", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "middleware.ts"),
      "utf8",
    );

    expect(source).toContain('"/admin/:path*"');
    expect(source).toContain('value: "hub.ourtownproperties.com"');
    expect(source).not.toContain('value: "*.ourtownproperties.com"');
  });
});
