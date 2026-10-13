import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_LEAD_SAVE_ERROR,
  publicLeadErrorMessage,
} from "../../app/lib/publicLeadErrors";
import { publicLeadOutcomeFromResponse, PUBLIC_LEAD_UNCONFIRMED_MESSAGE } from "../../app/lib/publicLeadReceipt";

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
    expect(publicLeadErrorMessage("Email or phone is required for a home value request.")).toBe(
      "Email or phone is required for a home value request.",
    );
  });

  it("routes active public lead forms through the sanitizer", () => {
    const homeValue = readFileSync("app/components/black-diamond/HomeValueFunnel.tsx", "utf8");
    const sellerIntent = readFileSync("app/components/black-diamond/SellerIntentSection.tsx", "utf8");
    const recovery = readFileSync("app/lib/client/publicIntakeRecovery.ts", "utf8");

    expect(homeValue).toContain("publicLeadOutcomeFromResponse(res)");
    expect(homeValue).toContain("publicLeadTransportOutcome(abort.signal.aborted");
    expect(homeValue).not.toContain("setFormError({ message: data.error");
    expect(homeValue).not.toContain("error.message");
    expect(sellerIntent).toContain("recordOutcome(await recovery.start(JSON.stringify(payload)))");
    expect(recovery).toContain("publicLeadOutcomeFromResponse(response)");
    expect(recovery).toContain("publicLeadTransportOutcome(timeout");
    expect(sellerIntent).not.toContain("data.error");
    expect(sellerIntent).not.toContain("error.message");
  });

  it("sanitizes unknown persistence exceptions through the typed Home Value outcome", async () => {
    const result = await publicLeadOutcomeFromResponse(new Response(JSON.stringify({
      error: "Supabase insert failed: PGRST204 address column schema cache SECRET_VALUE",
      code: "lead_persistence_failed",
    }), { status: 500, headers: {"Content-Type":"application/json"} }));
    expect(result.status).toBe("unconfirmed");
    expect("message" in result && result.message).toBe(PUBLIC_LEAD_UNCONFIRMED_MESSAGE);
    expect(JSON.stringify(result)).not.toMatch(/PGRST204|schema cache|SECRET_VALUE|Supabase insert/i);
  });
});
