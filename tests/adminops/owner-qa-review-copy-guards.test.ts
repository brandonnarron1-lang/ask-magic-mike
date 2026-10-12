import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OWNER_QA_REVIEW_COPY_BINDING, reviewCopyDigest,
  reviewCopyOutcomeCode, reviewCopyScopeDigest, type OwnerQaReviewCopyBinding,
} from "../../app/lib/ownerQaReviewCopy";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ principal: vi.fn(), send: vi.fn(), gate: vi.fn(), revalidate: vi.fn() }));
vi.mock("../../src/lib/admin/rbac-session", () => ({ requireLeadCenterPermission: mocks.principal }));
vi.mock("../../app/lib/leadAlertService", () => ({
  sendOwnerRequestedQaReviewCopy: mocks.send, retryNotificationByType: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("../../app/lib/adminLeadNotificationView", () => ({
  loadAdminLeadNotificationSummary: vi.fn(async () => ({ configured: true, notifications: [],
    kpis: { total: 0, pending: 0, sent: 0, failed: 0, skipped: 0, retryScheduled: 0 }, operations: null })),
  isNotificationRetryEligible: vi.fn(() => false),
}));
vi.mock("../../app/lib/ownerQaReviewCopy", async importOriginal => ({
  ...await importOriginal<object>(), gateOwnerQaReviewCopy: mocks.gate,
}));

const source = "00000000-0000-4000-8000-000000000001";
const principal: LeadCenterPrincipal = { userId: "synthetic-admin", role: "administrator",
  agentId: null, email: "operator@example.test", name: "Synthetic operator" };
// The application's ProcessEnv declaration requires unrelated legacy keys.
// Intentionally omit them and all real credentials from this synthetic fixture.
const env = { NODE_ENV: "test", VERCEL_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://www.askmagicmike.com", DATABASE_URL: "postgres://synthetic-only.invalid/test",
  LEAD_NOTIFICATION_TO: "operator@example.test", LEAD_NOTIFICATION_BCC: "audit@example.test",
  RESEND_FROM: "sender@example.test", RESEND_API_KEY: "synthetic-never-transmitted",
  EMAIL_PROVIDER: "resend", EMAIL_ENABLED: "true", LEAD_NOTIFICATION_MODE: "production",
  LEAD_NOTIFICATION_PRODUCTION_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const binding: OwnerQaReviewCopyBinding = { enabled: true, sourceSha256: reviewCopyDigest(source),
  templateVersion: "lead_alert_email_v4", recipientSenderScopeSha256: reviewCopyScopeDigest(env) };
const input = { sourceNotificationId: source, confirmed: true };

describe("single-copy guard — synthetic pure checks, not live authorization evidence", () => {
  it("keeps the shipped local candidate disabled and recipient-unbound", () => {
    expect(OWNER_QA_REVIEW_COPY_BINDING.enabled).toBe(false);
    expect(OWNER_QA_REVIEW_COPY_BINDING.recipientSenderScopeSha256).toBeNull();
  });
  it("accepts only the synthetic exact-source/v4/approved-scope matrix", async () => {
    const actual = await vi.importActual<typeof import("../../app/lib/ownerQaReviewCopy")>("../../app/lib/ownerQaReviewCopy");
    expect(actual.gateOwnerQaReviewCopy(principal, input, env, binding)).toEqual({ ok: true, sourceNotificationId: source });
  });
  it.each([null, "primary_lead_owner", "approved_agent", "read_only_analyst"])("rejects missing/changed role %s", async role => {
    const actual = await vi.importActual<typeof import("../../app/lib/ownerQaReviewCopy")>("../../app/lib/ownerQaReviewCopy");
    const viewer = role ? { ...principal, role } as LeadCenterPrincipal : null;
    expect(actual.gateOwnerQaReviewCopy(viewer, input, env, binding)).toEqual({ ok: false, error: "review_copy_forbidden" });
  });
  it.each([
    { VERCEL_ENV: "preview" }, { VERCEL_ENV: "development" }, { DATABASE_ENV: "preview" }, { DATABASE_ENV: "PREVIEW" },
    { DATABASE_URL: "" }, { NEXT_PUBLIC_SITE_URL: "https://other.example.test" },
  ])("rejects a wrong/no-write venue %j", async delta => {
    const actual = await vi.importActual<typeof import("../../app/lib/ownerQaReviewCopy")>("../../app/lib/ownerQaReviewCopy");
    expect(actual.gateOwnerQaReviewCopy(principal, input, { ...env, ...delta }, binding).ok).toBe(false);
  });
  it.each([
    { LEAD_NOTIFICATION_TO: "" }, { LEAD_NOTIFICATION_TO: "different@example.test" },
    { LEAD_NOTIFICATION_BCC: "" }, { LEAD_NOTIFICATION_BCC: "different@example.test" },
    { LEAD_NOTIFICATION_BCC: "audit@example.test,invalid" },
    { LEAD_NOTIFICATION_BCC: "audit@example.test,AUDIT@example.test" },
    { LEAD_NOTIFICATION_BCC: "operator@example.test" },
    { RESEND_FROM: "different@example.test" }, { RESEND_FROM: "sender@example.test\r\nBcc: attacker@example.test" },
    { EMAIL_PROVIDER: "smtp" }, { RESEND_API_KEY: "" },
    { LEAD_NOTIFICATION_MODE: "sandbox" }, { LEAD_NOTIFICATION_PRODUCTION_ENABLED: "false" },
    { EMAIL_ENABLED: "false" },
  ])("rejects destination/provider/readiness drift %j", async delta => {
    const actual = await vi.importActual<typeof import("../../app/lib/ownerQaReviewCopy")>("../../app/lib/ownerQaReviewCopy");
    expect(actual.gateOwnerQaReviewCopy(principal, input, { ...env, ...delta }, binding).ok).toBe(false);
  });
  it("does not manufacture permission from confirmation, a UUID, v5 or an unbound digest", async () => {
    const actual = await vi.importActual<typeof import("../../app/lib/ownerQaReviewCopy")>("../../app/lib/ownerQaReviewCopy");
    expect(actual.gateOwnerQaReviewCopy(principal, { ...input, confirmed: false }, env, binding).ok).toBe(false);
    expect(actual.gateOwnerQaReviewCopy(principal, { ...input, sourceNotificationId: "00000000-0000-4000-8000-000000000002" }, env, binding).ok).toBe(false);
    expect(actual.gateOwnerQaReviewCopy(principal, input, env, { ...binding, templateVersion: "lead_alert_email_v5" }).ok).toBe(false);
    expect(actual.gateOwnerQaReviewCopy(principal, input, env, { ...binding, recipientSenderScopeSha256: null }).ok).toBe(false);
  });
  it("returns a digest, not recipient or sender values", () => {
    const digest = reviewCopyScopeDigest(env)!;
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain("example.test");
    expect(reviewCopyScopeDigest({ ...env, LEAD_NOTIFICATION_BCC: Array(6).fill("audit@example.test").join(",") })).toBeNull();
  });
  it("separates provider acceptance, missing receipt and ambiguous states from mailbox delivery", () => {
    expect(reviewCopyOutcomeCode({ ok: true, notification: { status: "sent", provider_message_id: "synthetic" } })).toBe("review_copy_provider_accepted");
    expect(reviewCopyOutcomeCode({ ok: true, notification: { status: "sent", provider_message_id: null } })).toBe("review_copy_outcome_ambiguous");
    expect(reviewCopyOutcomeCode({ ok: false, notification: { status: "processing", provider_message_id: null } })).toBe("review_copy_outcome_ambiguous");
    expect(reviewCopyOutcomeCode({ ok: false, notification: { status: "permanently_failed", provider_message_id: null } })).toBe("review_copy_not_sent");
  });
});

describe("private action — mocked session/service, no provider or database", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.principal.mockResolvedValue(principal);
    mocks.gate.mockReturnValue({ ok: true, sourceNotificationId: source });
  });
  afterEach(() => vi.clearAllMocks());
  const form = () => { const data = new FormData(); data.set("source_notification_id", source);
    data.set("confirm_owner_review_copy", "yes"); return data; };
  it("uses fresh session authorization and does not call the service on denial", async () => {
    mocks.principal.mockRejectedValue(new Error("SESSION_EXPIRED"));
    const { sendOwnerQaReviewCopyAction } = await import("../../app/admin/notifications/actions");
    await expect(sendOwnerQaReviewCopyAction(form())).rejects.toThrow("SESSION_EXPIRED");
    expect(mocks.gate).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("passes disabled-RBAC/null principals to a fail-closed guard", async () => {
    mocks.principal.mockResolvedValue(null); mocks.gate.mockReturnValue({ ok: false, error: "review_copy_forbidden" });
    const { sendOwnerQaReviewCopyAction } = await import("../../app/admin/notifications/actions");
    await expect(sendOwnerQaReviewCopyAction(form())).rejects.toThrow("review_copy_forbidden");
    expect(mocks.gate.mock.calls[0][0]).toBeNull(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("ignores client authority, recipient, provider and version overrides", async () => {
    const data = form(); data.set("enabled", "true"); data.set("to", "other@example.test"); data.set("version", "lead_alert_email_v5");
    mocks.gate.mockReturnValue({ ok: false, error: "review_copy_binding_required" });
    const { sendOwnerQaReviewCopyAction } = await import("../../app/admin/notifications/actions");
    await expect(sendOwnerQaReviewCopyAction(data)).rejects.toThrow("review_copy_binding_required");
    expect(mocks.gate).toHaveBeenCalledWith(principal, input); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("delegates exactly once with no Production dependency overrides", async () => {
    mocks.send.mockResolvedValue({ ok: true, notification: { status: "sent", provider_message_id: "synthetic" } });
    const { sendOwnerQaReviewCopyAction } = await import("../../app/admin/notifications/actions");
    await expect(sendOwnerQaReviewCopyAction(form())).rejects.toThrow("review_copy_provider_accepted");
    expect(mocks.principal).toHaveBeenCalledWith("notification:manage");
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(source); expect(mocks.revalidate).toHaveBeenCalledOnce();
  });
  it("does not retry an ambiguous thrown result or leak the exception", async () => {
    mocks.send.mockRejectedValue(new Error("PRIVATE_PROVIDER_OR_SECRET_DETAIL"));
    const { sendOwnerQaReviewCopyAction } = await import("../../app/admin/notifications/actions");
    await expect(sendOwnerQaReviewCopyAction(form())).rejects.toThrow("review_copy_outcome_ambiguous");
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(source);
  });
  it("renders the disabled candidate honestly with no send form or addresses", async () => {
    const { default: Page } = await import("../../app/admin/notifications/page");
    const html = renderToStaticMarkup(await Page({}));
    expect(html).toContain("private invoker still needs exact-source review");
    expect(html).not.toContain('name="source_notification_id"');
    expect(html).not.toContain("Send approved review copy");
    expect(html).not.toContain("operator@example.test"); expect(html).not.toContain("audit@example.test");
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each([null, "primary_lead_owner", "approved_agent", "read_only_analyst"])("does not render this control for absent/changed role %s", async role => {
    mocks.principal.mockResolvedValue(role ? { ...principal, role } : null);
    const { default: Page } = await import("../../app/admin/notifications/page");
    expect(renderToStaticMarkup(await Page({}))).not.toContain("Approved internal review copy");
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
