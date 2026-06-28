import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const read = (rel: string) =>
  readFileSync(path.resolve(__dirname, "../../src", rel), "utf8");

// ── AdminShell ──────────────────────────────────────────────────────────────

describe("AdminShell", () => {
  const shell = read("components/admin/admin-shell.tsx");

  it("exports AdminShell, AdminCard, AdminSectionHeading", () => {
    expect(shell).toContain("export function AdminShell");
    expect(shell).toContain("export function AdminCard");
    expect(shell).toContain("export function AdminSectionHeading");
  });

  it("uses gold-400 accent for eyebrow text", () => {
    expect(shell).toContain("text-gold-300");
  });

  it("uses tracking-label not hardcoded em values", () => {
    expect(shell).not.toMatch(/tracking-\[0\.\d+em\]/);
  });

  it("never uses red-* token", () => {
    expect(shell).not.toMatch(/\btext-red-|bg-red-|border-red-/);
  });

  it("AdminSectionHeading uses tracking-label", () => {
    const sectionIdx = shell.indexOf("AdminSectionHeading");
    const excerpt = shell.slice(sectionIdx, sectionIdx + 300);
    expect(excerpt).toContain("tracking-label");
  });
});

// ── Admin homepage ──────────────────────────────────────────────────────────

describe("admin/page.tsx", () => {
  const page = read("app/(admin)/admin/page.tsx");

  it("imports AdminShell", () => {
    expect(page).toContain("AdminShell");
  });

  it("imports loadDashboardMetrics", () => {
    expect(page).toContain("loadDashboardMetrics");
  });

  it("never uses red-* tokens", () => {
    expect(page).not.toMatch(/\btext-red-|bg-red-|border-red-/);
  });

  it("never uses hardcoded #F4F4F4", () => {
    expect(page).not.toContain("#F4F4F4");
  });

  it("never uses hardcoded #050505 (use text-midnight)", () => {
    expect(page).not.toContain("#050505");
  });

  it("uses ruby-400 not red-400 for urgent indicators", () => {
    expect(page).toContain("ruby-400");
    expect(page).not.toMatch(/\bred-\d{3}/);
  });

  it("has LockedState for unconfigured Supabase", () => {
    expect(page).toContain("LockedState");
    expect(page).toContain('mode === "locked"');
  });

  it("never renders fake/mock data in production (devMode guard)", () => {
    expect(page).toContain("devMode");
    expect(page).toContain("DEV MODE");
  });

  it("links to all five command center sections", () => {
    expect(page).toContain("/admin/leads");
    expect(page).toContain("/admin/routing");
    expect(page).toContain("/admin/revenue");
    expect(page).toContain("/admin/traffic");
    expect(page).toContain("/admin/distribution");
  });

  it("does not contain genie, magic lamp, or lamp copy", () => {
    const lower = page.toLowerCase();
    expect(lower).not.toContain("genie");
    expect(lower).not.toContain("magic lamp");
    expect(lower).not.toContain("lamp");
  });
});

// ── Token guard: admin-lead-actions ────────────────────────────────────────

describe("admin-lead-actions.tsx token guard", () => {
  const src = read("components/admin/admin-lead-actions.tsx");

  it("no hardcoded hex text colors", () => {
    expect(src).not.toMatch(/text-\[#[0-9A-Fa-f]{3,6}\]/);
  });

  it("no red-* tokens", () => {
    expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/);
  });

  it("uses tracking-label not hardcoded 0.18em / 0.22em", () => {
    expect(src).not.toMatch(/tracking-\[0\.(18|22)em\]/);
  });

  it("SubmitBtn uses text-midnight not #050505", () => {
    expect(src).toContain("text-midnight");
    expect(src).not.toContain("#050505");
  });
});

// ── Token guard: leads inbox page ──────────────────────────────────────────

describe("admin/leads/page.tsx token guard", () => {
  const src = read("app/(admin)/admin/leads/page.tsx");

  it("no hardcoded #F4F4F4 hex", () => {
    expect(src).not.toContain("#F4F4F4");
  });

  it("no red-* tokens", () => {
    expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/);
  });
});

// ── Token guard: lead detail page ──────────────────────────────────────────

describe("admin/leads/[id]/page.tsx token guard", () => {
  const src = read("app/(admin)/admin/leads/[id]/page.tsx");

  it("no hardcoded #F4F4F4 hex", () => {
    expect(src).not.toContain("#F4F4F4");
  });

  it("uses tracking-label for 0.18em values", () => {
    expect(src).toContain("tracking-label");
    expect(src).not.toMatch(/tracking-\[0\.(18|22)em\]/);
  });

  it("no red-* tokens", () => {
    expect(src).not.toMatch(/\btext-red-|bg-red-|border-red-/);
  });
});

// ── Token guard: traffic, distribution, routing, revenue ───────────────────

describe("supporting admin pages token guard", () => {
  const pages = [
    "app/(admin)/admin/traffic/page.tsx",
    "app/(admin)/admin/distribution/page.tsx",
    "app/(admin)/admin/routing/page.tsx",
    "app/(admin)/admin/revenue/page.tsx",
  ];

  for (const p of pages) {
    it(`${p}: no hardcoded #F4F4F4`, () => {
      expect(read(p)).not.toContain("#F4F4F4");
    });

    it(`${p}: no tracking-[0.18em] or tracking-[0.22em] (use tracking-label / tracking-kicker)`, () => {
      expect(read(p)).not.toMatch(/tracking-\[0\.(18|22)em\]/);
    });

    it(`${p}: no red-* tokens`, () => {
      expect(read(p)).not.toMatch(/\btext-red-|bg-red-|border-red-/);
    });
  }
});
