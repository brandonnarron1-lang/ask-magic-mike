import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("public confirmation response-time copy", () => {
  it("does not publish an unconfirmed response-time promise", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/intake/step-confirmation.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/responds?\s+(?:in|within)\s+(?:<\s*)?\d+/i);
    expect(source).not.toMatch(/expect\s+(?:a\s+)?(?:call|text).*within\s+minutes/i);
  });
});
