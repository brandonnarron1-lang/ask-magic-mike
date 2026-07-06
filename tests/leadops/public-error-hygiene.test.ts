import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_LEAD_SAVE_ERROR,
  publicLeadErrorMessage,
} from "../../app/lib/publicLeadErrors";

describe("public lead error hygiene", () => {
  it("blocks Supabase and PostgREST internals from public copy", () => {
    const raw =
      "Supabase insert failed: {\"code\":\"PGRST204\",\"message\":\"Could not find the 'address' column of 'leads' in the schema cache\"}";

    const message = publicLeadErrorMessage(raw);

    expect(message).toBe(PUBLIC_LEAD_SAVE_ERROR);
    expect(message).not.toMatch(/Supabase insert failed/i);
    expect(message).not.toMatch(/PGRST204/i);
    expect(message).not.toMatch(/schema cache/i);
    expect(message).not.toMatch(/address column/i);
  });

  it("keeps normal validation copy intact", () => {
    expect(publicLeadErrorMessage("Email and phone are required for a home value request.")).toBe(
      "Email and phone are required for a home value request.",
    );
  });

  it("routes active public lead forms through the sanitizer", () => {
    const homeValue = readFileSync("app/components/black-diamond/HomeValueFunnel.tsx", "utf8");
    const sellerIntent = readFileSync("app/components/black-diamond/SellerIntentSection.tsx", "utf8");

    expect(homeValue).toContain("publicLeadErrorMessage(data.error)");
    expect(homeValue).toContain("publicLeadErrorMessage(error instanceof Error");
    expect(sellerIntent).toContain("publicLeadErrorMessage(data.error)");
    expect(sellerIntent).toContain("publicLeadErrorMessage(error instanceof Error");
  });
});
