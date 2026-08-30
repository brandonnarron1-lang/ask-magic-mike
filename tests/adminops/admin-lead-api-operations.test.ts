import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDefaultPersistence: vi.fn(),
  configuredNotificationMode: vi.fn(() => "disabled" as const),
}));

vi.mock("../../app/lib/persistence/defaultPersistence", () => ({
  createDefaultPersistence: mocks.createDefaultPersistence,
  configuredNotificationMode: mocks.configuredNotificationMode,
}));

import {
  addCanonicalAdminLeadNote,
  assignCanonicalAdminLead,
  createCanonicalAdminLeadTask,
  patchCanonicalAdminLead,
} from "@/lib/admin/lead-operations";

const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_ID = "22222222-2222-4222-8222-222222222222";

function persistence() {
  return {
    patchAdminLead: vi.fn().mockResolvedValue({
      ok: true,
      leadId: LEAD_ID,
      auditId: "33333333-3333-4333-8333-333333333333",
      updatedAt: "2026-08-30T12:00:00.000Z",
      patch: { last_contacted_at: "2026-08-30T12:00:00.000Z" },
    }),
    readAdminLeads: vi.fn().mockResolvedValue([{ id: LEAD_ID, assigned_agent_id: null }]),
    mutateAdminAssignment: vi.fn().mockResolvedValue({
      ok: true,
      action: "assigned",
      auditId: "44444444-4444-4444-8444-444444444444",
      idempotentReplay: false,
    }),
    addAdminLeadNote: vi.fn().mockResolvedValue({
      ok: true,
      messageId: "55555555-5555-4555-8555-555555555555",
      auditId: "66666666-6666-4666-8666-666666666666",
      createdAt: "2026-08-30T12:00:00.000Z",
    }),
    createAdminLeadTask: vi.fn().mockResolvedValue({
      ok: true,
      taskId: "77777777-7777-4777-8777-777777777777",
      auditId: "88888888-8888-4888-8888-888888888888",
      createdAt: "2026-08-30T12:00:00.000Z",
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of [
    "VERCEL_ENV",
    "DATABASE_ENV",
    "PREVIEW_DATA_MODE",
    "ALLOW_PREVIEW_DB_MUTATION",
  ]) Reflect.deleteProperty(process.env, key);
});

afterEach(() => {
  for (const key of [
    "VERCEL_ENV",
    "DATABASE_ENV",
    "PREVIEW_DATA_MODE",
    "ALLOW_PREVIEW_DB_MUTATION",
  ]) Reflect.deleteProperty(process.env, key);
});

describe("canonical admin lead API operations", () => {
  it("fails closed before persistence when Preview mutation is disabled", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.PREVIEW_DATA_MODE = "disabled";
    process.env.ALLOW_PREVIEW_DB_MUTATION = "false";

    await expect(addCanonicalAdminLeadNote({
      leadId: LEAD_ID,
      content: "preview-qa note",
      actor: "admin@test.com",
    })).resolves.toMatchObject({ ok: false, error: "preview_data_disabled" });
    expect(mocks.createDefaultPersistence).not.toHaveBeenCalled();
  });

  it("returns durable note and task IDs only after persistence succeeds", async () => {
    const adapter = persistence();
    mocks.createDefaultPersistence.mockReturnValue(adapter);

    await expect(addCanonicalAdminLeadNote({
      leadId: LEAD_ID,
      content: "preview-qa note",
      actor: "admin@test.com",
    })).resolves.toMatchObject({
      ok: true,
      value: { messageId: "55555555-5555-4555-8555-555555555555" },
    });
    await expect(createCanonicalAdminLeadTask({
      leadId: LEAD_ID,
      title: "preview-qa task",
      priority: "low",
      actor: "admin@test.com",
    })).resolves.toMatchObject({
      ok: true,
      value: { taskId: "77777777-7777-4777-8777-777777777777" },
    });
    expect(adapter.addAdminLeadNote).toHaveBeenCalledOnce();
    expect(adapter.createAdminLeadTask).toHaveBeenCalledOnce();
  });

  it("reads current ownership before one atomic reason-aware assignment", async () => {
    const adapter = persistence();
    mocks.createDefaultPersistence.mockReturnValue(adapter);

    await expect(assignCanonicalAdminLead({
      leadId: LEAD_ID,
      agentId: AGENT_ID,
      reason: "owner approved assignment",
      actor: "admin@test.com",
    })).resolves.toMatchObject({ ok: true, value: { action: "assigned" } });
    expect(adapter.readAdminLeads).toHaveBeenCalledWith({ leadId: LEAD_ID, limit: 1 });
    expect(adapter.mutateAdminAssignment).toHaveBeenCalledWith(expect.objectContaining({
      expectedAgentId: null,
      agentId: AGENT_ID,
      reason: "owner approved assignment",
    }));
  });

  it("returns an explicit unavailable error instead of mock success", async () => {
    mocks.createDefaultPersistence.mockReturnValue(null);
    await expect(patchCanonicalAdminLead({
      leadId: LEAD_ID,
      patch: { last_contacted_at: null },
      actor: "admin@test.com",
    })).resolves.toEqual({
      ok: false,
      statusCode: 503,
      error: "lead_store_not_configured",
    });
  });
});
