import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LeadAlertPreviewGallery } from "../../app/components/admin/LeadAlertPreviewGallery";
import { leadAlertIdentityPreviewEnabled } from "../../app/lib/leadAlertDesignPreview";

describe("lead-alert preview gallery", () => {
  it("renders three synthetic no-send previews without a mutation control", () => {
    const markup = renderToStaticMarkup(<LeadAlertPreviewGallery standalone />);

    expect(markup).toContain("No-send preview");
    expect(markup).toContain("No lead exists");
    expect(markup.match(/internal lead-alert preview/g)).toHaveLength(3);
    expect(markup).not.toContain("<form");
    expect(markup).not.toContain("<button");
    expect(markup).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(markup).not.toMatch(/\b252[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  });

  it("keeps the visual acceptance route unavailable in Production", () => {
    const source = readFileSync("app/preview/lead-alert-identity/page.tsx", "utf8");

    expect(leadAlertIdentityPreviewEnabled("production", "development")).toBe(false);
    expect(leadAlertIdentityPreviewEnabled("preview", "production")).toBe(true);
    expect(leadAlertIdentityPreviewEnabled(undefined, "production")).toBe(false);
    expect(leadAlertIdentityPreviewEnabled(undefined, "development")).toBe(true);
    expect(source).toContain("leadAlertIdentityPreviewEnabled(process.env.VERCEL_ENV, process.env.NODE_ENV)");
    expect(source).toContain("notFound()");
    expect(source).toContain("robots: { index: false");
  });
});
