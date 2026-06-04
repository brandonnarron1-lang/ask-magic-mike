import { describe, expect, it } from "vitest";
import { LeadCaptureEngine, type LeadCaptureRepository } from "@/lib/engines/lead-capture";
import type { CreateLeadCanonicalInput } from "@/schemas/leads-canonical.schema";
import type { KnownLeadIdentity } from "@/lib/leads/duplicate-detection";

function inMemoryRepo(seed: KnownLeadIdentity[] = []) {
  const known = [...seed];
  const inserts: unknown[] = [];
  const dupAttempts: unknown[] = [];
  const repo: LeadCaptureRepository = {
    async findKnownByIdentity({ normalizedEmail, normalizedPhone }) {
      return known.filter(
        (k) =>
          (normalizedEmail && k.normalizedEmail === normalizedEmail) ||
          (normalizedPhone && k.normalizedPhone === normalizedPhone)
      );
    },
    async insertLead(rec) {
      inserts.push(rec);
      known.push({
        leadId: rec.id,
        normalizedEmail: rec.normalizedEmail,
        normalizedPhone: rec.normalizedPhone,
        normalizedAddressFingerprint: rec.normalizedPropertyAddress,
      });
      return rec.id;
    },
    async recordDuplicateAttempt(args) {
      dupAttempts.push(args);
    },
  };
  return { repo, inserts, dupAttempts, known };
}

function payload(overrides: Partial<CreateLeadCanonicalInput> = {}): CreateLeadCanonicalInput {
  return {
    lead_type: "seller_cash_offer",
    source: "we_buy_houses_landing",
    name: "Jane Seller",
    email: "jane@example.com",
    phone: "+12525551234",
    timeline: "0_30_days",
    property_address: "123 Nash St NW, Wilson, NC 27896",
    property_condition: "needs_repairs",
    occupancy_status: "owner_occupied",
    preferred_contact_method: "sms",
    utm_source: "facebook",
    utm_medium: "paid_social",
    utm_campaign: "seller_cash_offer_wilson_q3",
    page_url: "https://example.com/we-buy-houses",
    consent: { sms: true, email: true },
    ...overrides,
  } as CreateLeadCanonicalInput;
}

describe("LeadCaptureEngine", () => {
  it("captures a brand-new lead, returns A-or-better grade for a hot seller", async () => {
    const { repo, inserts } = inMemoryRepo();
    const engine = new LeadCaptureEngine(repo);
    const result = await engine.capture(payload(), {
      ipAddress: "1.2.3.4",
      userAgent: "Mozilla/5.0",
    });
    expect(result.ok).toBe(true);
    expect(result.isDuplicate).toBe(false);
    expect(["A+", "A", "B"]).toContain(result.grade);
    expect(result.autoConfirmationQueued).toBe(true);
    expect(inserts).toHaveLength(1);
  });

  it("flags hard duplicates on matching email+phone and does not insert again", async () => {
    const { repo, inserts, dupAttempts } = inMemoryRepo([
      {
        leadId: "L-existing",
        normalizedEmail: "jane@example.com",
        normalizedPhone: "+12525551234",
        normalizedAddressFingerprint: null,
      },
    ]);
    const engine = new LeadCaptureEngine(repo);
    const result = await engine.capture(payload(), {});
    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateOfLeadId).toBe("L-existing");
    expect(inserts).toHaveLength(0);
    expect(dupAttempts).toHaveLength(1);
  });

  it("rejects spammy submissions before touching the repo", async () => {
    const { repo, inserts } = inMemoryRepo();
    const engine = new LeadCaptureEngine(repo);
    const result = await engine.capture(
      payload({
        // honeypot fires + bot UA + URL in question
        honeypot: "I am a bot",
        intent: "Visit https://spam.example",
      } as Partial<CreateLeadCanonicalInput>),
      { userAgent: "python-requests/2.31" }
    );
    expect(result.ok).toBe(false);
    expect(result.spamScore).toBeGreaterThanOrEqual(70);
    expect(inserts).toHaveLength(0);
  });

  it("returns public-safe payload (lead_id, received_at, next_step) only", async () => {
    const { repo } = inMemoryRepo();
    const engine = new LeadCaptureEngine(repo);
    const result = await engine.capture(payload(), {});
    expect(Object.keys(result.publicPayload).sort()).toEqual(
      ["lead_id", "next_step", "received_at"].sort()
    );
  });

  it("downshifts lead grade when no phone/email and short intent", async () => {
    const { repo } = inMemoryRepo();
    const engine = new LeadCaptureEngine(repo);
    const result = await engine.capture(
      payload({
        email: null,
        phone: null,
        lead_type: "general_question",
        timeline: undefined,
        property_address: null,
      }),
      {}
    );
    expect(["C", "D"]).toContain(result.grade);
    expect(result.autoConfirmationQueued).toBe(false);
  });
});
