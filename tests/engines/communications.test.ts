import { describe, expect, it, vi } from "vitest";
import { CommunicationsEngine } from "@/lib/engines/communications";
import type { SmsAdapter } from "@/lib/adapters/sms-types";
import type { EmailAdapter } from "@/lib/adapters/email-types";

function spyableSms(): SmsAdapter & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    name: "test_sms",
    async send(params) {
      calls.push(params);
      return {
        provider: "test_sms",
        providerMessageId: `mid_${calls.length}`,
        status: "sent",
        acknowledgedAt: new Date().toISOString(),
      };
    },
    calls,
  };
}
function spyableEmail(): EmailAdapter & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    name: "test_email",
    async send(params) {
      calls.push(params);
      return {
        provider: "test_email",
        providerMessageId: `eid_${calls.length}`,
        status: "sent",
        acknowledgedAt: new Date().toISOString(),
      };
    },
    calls,
  };
}

describe("CommunicationsEngine.sendSms", () => {
  it("sends a transactional SMS even without marketing consent", async () => {
    const sms = spyableSms();
    const engine = new CommunicationsEngine(sms, spyableEmail());
    const result = await engine.sendSms({
      to: "+12525551234",
      templateSlug: "buyer_listing_confirmation",
      consent: { sms: false, email: false },
    });
    expect(result.ok).toBe(true);
    expect(sms.calls).toHaveLength(1);
  });

  it("blocks send when do_not_contact is set", async () => {
    const sms = spyableSms();
    const engine = new CommunicationsEngine(sms, spyableEmail());
    const result = await engine.sendSms({
      to: "+12525551234",
      templateSlug: "buyer_listing_confirmation",
      consent: { doNotContact: true },
    });
    expect(result.ok).toBe(false);
    expect(sms.calls).toHaveLength(0);
    if (!result.ok) expect(result.reason).toBe("do_not_contact");
  });

  it("requires sms consent when overrideMarketing=true", async () => {
    const sms = spyableSms();
    const engine = new CommunicationsEngine(sms, spyableEmail());
    const blocked = await engine.sendSms({
      to: "+12525551234",
      templateSlug: "buyer_listing_confirmation",
      consent: { sms: false },
      overrideMarketing: true,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe("no_marketing_consent");

    const allowed = await engine.sendSms({
      to: "+12525551234",
      templateSlug: "buyer_listing_confirmation",
      consent: { sms: true },
      overrideMarketing: true,
    });
    expect(allowed.ok).toBe(true);
  });

  it("interpolates template variables", async () => {
    const sms = spyableSms();
    const engine = new CommunicationsEngine(sms, spyableEmail());
    await engine.sendSms({
      to: "+12525551234",
      templateSlug: "agent_assigned_intro",
      vars: { agent_name: "Mike Eatmon", lead_intent: "selling" },
      consent: {},
    });
    const firstCall = sms.calls[0] as { body: string };
    expect(firstCall.body).toContain("Mike Eatmon");
    expect(firstCall.body).toContain("selling");
    expect(firstCall.body).toContain("Reply STOP");
  });

  it("returns unknown_template for missing slugs", async () => {
    const engine = new CommunicationsEngine(spyableSms(), spyableEmail());
    const r = await engine.sendSms({
      to: "+12525551234",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      templateSlug: "does_not_exist" as any,
      consent: {},
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unknown_template");
  });
});

describe("CommunicationsEngine.sendEmail", () => {
  it("renders + sends a transactional email", async () => {
    const email = spyableEmail();
    const engine = new CommunicationsEngine(spyableSms(), email);
    await engine.sendEmail({
      to: "jane@example.com",
      templateSlug: "new_lead_confirmation",
      vars: { first_name: "Jane" },
      consent: {},
    });
    const call = email.calls[0] as { subject: string; html: string; text: string };
    expect(call.subject).toContain("Ask Magic Mike");
    expect(call.text).toContain("Jane");
    expect(call.html).toContain("not an appraisal");
  });

  it("blocks email when do_not_contact is set", async () => {
    const email = spyableEmail();
    const engine = new CommunicationsEngine(spyableSms(), email);
    const r = await engine.sendEmail({
      to: "jane@example.com",
      templateSlug: "new_lead_confirmation",
      consent: { doNotContact: true },
    });
    expect(r.ok).toBe(false);
    expect(email.calls).toHaveLength(0);
  });
});
