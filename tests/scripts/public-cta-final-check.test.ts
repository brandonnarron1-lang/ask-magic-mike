import { describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import {
  computeCtaStatus,
  fileContains,
  findMissingRoutes,
  findMissingCtaScripts,
  findMissingCtaDocs,
  CTA_PASS,
  CTA_FAIL,
  REQUIRED_CTA_SCRIPTS,
  REQUIRED_CTA_DOCS,
  REQUIRED_ROUTES,
} from "../../scripts/amm/public-cta-final-check.mjs";

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// computeCtaStatus — pure function, no side effects
// ---------------------------------------------------------------------------

describe("computeCtaStatus", () => {
  it("returns PASS when failCount is 0", () => {
    expect(computeCtaStatus(0)).toBe(CTA_PASS);
  });

  it("returns FAIL when failCount is 1", () => {
    expect(computeCtaStatus(1)).toBe(CTA_FAIL);
  });

  it("returns FAIL when failCount is greater than 1", () => {
    expect(computeCtaStatus(5)).toBe(CTA_FAIL);
  });

  it("CTA_PASS is the PASS sentinel", () => {
    expect(CTA_PASS).toBe("PASS");
  });

  it("CTA_FAIL is the FAIL sentinel", () => {
    expect(CTA_FAIL).toBe("FAIL");
  });
});

// ---------------------------------------------------------------------------
// CTA status constants
// ---------------------------------------------------------------------------

describe("CTA status constants", () => {
  it("CTA_PASS and CTA_FAIL are distinct", () => {
    expect(CTA_PASS).not.toBe(CTA_FAIL);
  });

  it("status constants do not contain secret values", () => {
    for (const s of [CTA_PASS, CTA_FAIL]) {
      expect(s).not.toMatch(/eyJ|sk-|Bearer\s/i);
      expect(s).not.toMatch(/password|secret|token/i);
    }
  });
});

// ---------------------------------------------------------------------------
// fileContains — pure file content check
// ---------------------------------------------------------------------------

describe("fileContains", () => {
  it("returns true when file contains the substring", () => {
    const path = "/tmp/test-cta-contains.ts";
    writeFileSync(path, 'const href = "/ask";', "utf8");
    expect(fileContains(path, "/ask")).toBe(true);
  });

  it("returns false when file does not contain the substring", () => {
    const path = "/tmp/test-cta-missing.ts";
    writeFileSync(path, 'const href = "/other";', "utf8");
    expect(fileContains(path, "/ask")).toBe(false);
  });

  it("returns false when file does not exist", () => {
    expect(fileContains("/tmp/nonexistent-cta-test-file-xyz.ts", "/ask")).toBe(false);
  });

  it("returns true for /value substring match", () => {
    const path = "/tmp/test-cta-value.ts";
    writeFileSync(path, 'href="/value" data-cta-link="value"', "utf8");
    expect(fileContains(path, "/value")).toBe(true);
  });

  it("is case-sensitive — /Ask does not match /ask", () => {
    const path = "/tmp/test-cta-case.ts";
    writeFileSync(path, 'href="/Ask"', "utf8");
    expect(fileContains(path, "/ask")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findMissingRoutes
// ---------------------------------------------------------------------------

describe("findMissingRoutes", () => {
  it("returns empty array when all routes exist", () => {
    const missing = findMissingRoutes(ROOT, REQUIRED_ROUTES);
    expect(missing).toEqual([]);
  });

  it("returns the missing route when a route does not exist", () => {
    const missing = findMissingRoutes(ROOT, [
      "src/app/(intake)/ask/layout.tsx",
      "src/app/(intake)/ask/NONEXISTENT_FILE_xyz.tsx",
    ]);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain("NONEXISTENT_FILE_xyz.tsx");
  });

  it("returns all missing routes when none exist", () => {
    const fakes = ["does/not/exist/a.tsx", "does/not/exist/b.tsx"];
    const missing = findMissingRoutes(ROOT, fakes);
    expect(missing).toEqual(fakes);
  });

  it("does not include routes that exist in the missing list", () => {
    const missing = findMissingRoutes(ROOT, ["src/app/(intake)/ask/layout.tsx"]);
    expect(missing).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// REQUIRED_ROUTES — confirm expected routes are defined and present
// ---------------------------------------------------------------------------

describe("REQUIRED_ROUTES", () => {
  it("includes the /ask layout route", () => {
    expect(REQUIRED_ROUTES).toContain("src/app/(intake)/ask/layout.tsx");
  });

  it("includes the /ask page route", () => {
    expect(REQUIRED_ROUTES).toContain("src/app/(intake)/ask/page.tsx");
  });

  it("includes the /value page route", () => {
    expect(REQUIRED_ROUTES).toContain("src/app/(campaign)/value/page.tsx");
  });

  it("includes the embed ask route", () => {
    expect(REQUIRED_ROUTES).toContain("src/app/(embed)/embed/ask/page.tsx");
  });

  it("all routes in REQUIRED_ROUTES exist in this repo", () => {
    const missing = findMissingRoutes(ROOT, REQUIRED_ROUTES);
    expect(missing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findMissingCtaScripts
// ---------------------------------------------------------------------------

describe("findMissingCtaScripts", () => {
  it("returns empty array when all required CTA scripts exist", () => {
    const missing = findMissingCtaScripts(ROOT, REQUIRED_CTA_SCRIPTS);
    expect(missing).toEqual([]);
  });

  it("returns missing script name when script is absent from package.json", () => {
    const missing = findMissingCtaScripts(ROOT, [
      "amm:launch:authority",
      "amm:nonexistent:script",
    ]);
    expect(missing).toContain("amm:nonexistent:script");
    expect(missing).not.toContain("amm:launch:authority");
  });

  it("returns all scripts when package.json has no scripts", () => {
    const fakeRoot = "/tmp";
    writeFileSync("/tmp/package.json", JSON.stringify({ name: "fake" }), "utf8");
    const missing = findMissingCtaScripts(fakeRoot, ["amm:launch:authority"]);
    expect(missing).toContain("amm:launch:authority");
  });
});

// ---------------------------------------------------------------------------
// REQUIRED_CTA_SCRIPTS — confirm expected scripts exist in repo
// ---------------------------------------------------------------------------

describe("REQUIRED_CTA_SCRIPTS", () => {
  it("includes amm:launch:authority", () => {
    expect(REQUIRED_CTA_SCRIPTS).toContain("amm:launch:authority");
  });

  it("includes amm:public:cta-check", () => {
    expect(REQUIRED_CTA_SCRIPTS).toContain("amm:public:cta-check");
  });

  it("all required CTA scripts exist in package.json", () => {
    const missing = findMissingCtaScripts(ROOT, REQUIRED_CTA_SCRIPTS);
    expect(missing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findMissingCtaDocs
// ---------------------------------------------------------------------------

describe("findMissingCtaDocs", () => {
  it("returns empty array when all required CTA docs exist", () => {
    const missing = findMissingCtaDocs(ROOT, REQUIRED_CTA_DOCS);
    expect(missing).toEqual([]);
  });

  it("returns the missing doc path when a doc is absent", () => {
    const missing = findMissingCtaDocs(ROOT, [
      "docs/GO_NO_GO_COMMAND_CENTER.md",
      "docs/NONEXISTENT_DOC_xyz.md",
    ]);
    expect(missing).toContain("docs/NONEXISTENT_DOC_xyz.md");
    expect(missing).not.toContain("docs/GO_NO_GO_COMMAND_CENTER.md");
  });

  it("returns all docs as missing when none exist", () => {
    const fakes = ["docs/FAKE_A.md", "docs/FAKE_B.md"];
    const missing = findMissingCtaDocs(ROOT, fakes);
    expect(missing).toEqual(fakes);
  });
});

// ---------------------------------------------------------------------------
// REQUIRED_CTA_DOCS — confirm expected docs are defined and present
// ---------------------------------------------------------------------------

describe("REQUIRED_CTA_DOCS", () => {
  it("includes GO_NO_GO_COMMAND_CENTER.md", () => {
    expect(REQUIRED_CTA_DOCS).toContain("docs/GO_NO_GO_COMMAND_CENTER.md");
  });

  it("includes CONTROLLED_TRAFFIC_ACTIVATION.md", () => {
    expect(REQUIRED_CTA_DOCS).toContain("docs/CONTROLLED_TRAFFIC_ACTIVATION.md");
  });

  it("all required CTA docs exist in this repo", () => {
    const missing = findMissingCtaDocs(ROOT, REQUIRED_CTA_DOCS);
    expect(missing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Integration — actual source file CTA checks
// ---------------------------------------------------------------------------

describe("hero-section.tsx CTA links", () => {
  const heroPath = join(ROOT, "src/components/landing/hero-section.tsx");

  it("links to /ask", () => {
    expect(fileContains(heroPath, "/ask")).toBe(true);
  });

  it("links to /value", () => {
    expect(fileContains(heroPath, "/value")).toBe(true);
  });
});

describe("footer.tsx CTA links", () => {
  const footerPath = join(ROOT, "src/components/landing/footer.tsx");

  it("links to /ask", () => {
    expect(fileContains(footerPath, "/ask")).toBe(true);
  });

  it("links to /value", () => {
    expect(fileContains(footerPath, "/value")).toBe(true);
  });
});
