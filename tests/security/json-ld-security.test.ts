import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { serializeJsonLd } from "@/lib/security/json-ld";

const STRUCTURED_DATA_SURFACES = [
  "app/components/seo/HomepageStructuredData.tsx",
  "src/app/(campaign)/value/page.tsx",
  "src/app/page.tsx",
  "src/app/(intake)/ask/layout.tsx",
];

describe("JSON-LD script safety", () => {
  it("escapes a script-closing sequence from every serialized value", () => {
    const serialized = serializeJsonLd({ name: "</script><img src=x onerror=alert(1)>" });
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script>");
  });

  it("routes every structured-data script through the shared serializer", () => {
    for (const file of STRUCTURED_DATA_SURFACES) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source, file).toContain("serializeJsonLd(");
      expect(source, file).not.toMatch(/__html:\s*JSON\.stringify\(/);
    }
  });
});
