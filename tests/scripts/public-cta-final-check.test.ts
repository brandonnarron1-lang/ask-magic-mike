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
  REQUIRED_CTA_LINKS,
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
      "app/ask/page.tsx",
      "app/ask/NONEXISTENT_FILE_xyz.tsx",
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
    const missing = findMissingRoutes(ROOT, ["app/ask/page.tsx"]);
    expect(missing).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// REQUIRED_ROUTES — confirm expected routes are defined and present
// ---------------------------------------------------------------------------

describe("REQUIRED_ROUTES", () => {
  it("includes the canonical root layout", () => {
    expect(REQUIRED_ROUTES).toContain("app/layout.tsx");
  });

  it("includes the /ask page route", () => {
    expect(REQUIRED_ROUTES).toContain("app/ask/page.tsx");
  });

  it("includes the seller, value, and buyer public routes", () => {
    expect(REQUIRED_ROUTES).toContain("app/home-value/page.tsx");
    expect(REQUIRED_ROUTES).toContain("app/value/page.tsx");
    expect(REQUIRED_ROUTES).toContain("app/sell/page.tsx");
    expect(REQUIRED_ROUTES).toContain("app/buy/page.tsx");
  });

  it("includes the canonical embed and widget routes", () => {
    expect(REQUIRED_ROUTES).toContain("app/embed/ask/page.tsx");
    expect(REQUIRED_ROUTES).toContain("app/widget/v1/page.tsx");
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
  it("includes CONTROLLED_TRAFFIC_ACTIVATION.md", () => {
    expect(REQUIRED_CTA_DOCS).toContain("docs/CONTROLLED_TRAFFIC_ACTIVATION.md");
  });

  it("includes current go-live and owner-action docs", () => {
    expect(REQUIRED_CTA_DOCS).toContain("docs/GO_LIVE_RUNBOOK.md");
    expect(REQUIRED_CTA_DOCS).toContain("docs/OWNER_APPROVAL_QUEUE.md");
  });

  it("all required CTA docs exist in this repo", () => {
    const missing = findMissingCtaDocs(ROOT, REQUIRED_CTA_DOCS);
    expect(missing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Integration — canonical public CTA checks
// ---------------------------------------------------------------------------

describe("REQUIRED_CTA_LINKS", () => {
  it("checks the active Black Diamond components", () => {
    expect(REQUIRED_CTA_LINKS.every((link) => link.file.startsWith("app/components/black-diamond/"))).toBe(true);
  });

  it("exposes existing seller, buyer, planner, home-value, and Ask paths", () => {
    const hrefs = REQUIRED_CTA_LINKS.map((link) => link.href);
    expect(hrefs).toContain("/home-value");
    expect(hrefs).toContain("/sell");
    expect(hrefs).toContain("/buy");
    expect(hrefs).toContain("/plan");
    expect(hrefs).toContain("/ask");
  });

  it("finds every required link in its canonical source file", () => {
    for (const link of REQUIRED_CTA_LINKS) {
      expect(fileContains(join(ROOT, link.file), link.href), `${link.file} -> ${link.href}`).toBe(true);
    }
  });
});
