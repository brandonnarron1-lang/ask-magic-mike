// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAdminTodayQueue, emptyAdminTodayQueue } from "../../app/lib/adminTodayQueue";

const mocks = vi.hoisted(() => ({ query: vi.fn(), queue: vi.fn() }));
vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query: mocks.query }) }));
vi.mock("../../app/lib/adminTodayView", () => ({ loadAdminTodayQueue: mocks.queue }));
vi.mock("../../src/lib/admin/rbac-session", () => ({ requireLeadCenterPermission: async () => ({ role: "approved_agent", agentId: "owner" }) }));
vi.mock("../../app/admin/today/actions", () => ({ completeTodayTask: vi.fn(), reviewTodayAction: vi.fn() }));
import Today from "../../app/admin/today/page";
import { loadNeonAdminTodayQueue } from "../../app/lib/persistence/neonAdminTodayView";

describe("Today bounded-read presentation", () => {
  beforeEach(() => { mocks.query.mockReset(); vi.stubEnv("DATABASE_URL", "postgresql://localhost/synthetic-unused"); });
  afterEach(() => vi.unstubAllEnvs());
  it("reports unavailable instead of measuring zero when a required query fails", async () => {
    mocks.query.mockRejectedValue(new Error("synthetic missing table"));
    const queue = await loadNeonAdminTodayQueue({ userId: "synthetic", role: "administrator", agentId: null, email: "admin@example.test", name: "SYNTHETIC" });
    expect(queue.coverage?.state).toBe("unavailable");
    mocks.queue.mockResolvedValue(queue);
    const html = renderToStaticMarkup(await Today({}));
    expect(html).toContain("Queue unavailable"); expect(html).not.toContain("Queue clear");
    expect(html).toContain("No measured counts"); expect(html).toContain("—");
  });
  it("does not display unconfigured storage as a clear queue", async () => {
    mocks.queue.mockResolvedValue(emptyAdminTodayQueue());
    expect(renderToStaticMarkup(await Today({}))).toContain("Queue unavailable");
  });
  it("fetches one overflow sentinel and labels capped results without mutation affordances", async () => {
    mocks.query.mockResolvedValueOnce(Array.from({ length: 1001 }, (_, i) => ({ id: `synthetic-${i}`, status: "new", assigned_agent_id: "owner", first_name: "SYNTHETIC" })));
    mocks.query.mockResolvedValue([]);
    const queue = await loadNeonAdminTodayQueue({ userId: "synthetic", role: "administrator", agentId: null, email: "admin@example.test", name: "SYNTHETIC" });
    expect(queue.coverage).toMatchObject({ state: "limited", leadCount: 1000, limitedBy: ["requests"] });
    expect(mocks.query.mock.calls[0][0]).toContain("LIMIT 1001");
    mocks.queue.mockResolvedValue({ ...queue, items: queue.items.slice(0, 1) });
    const html = renderToStaticMarkup(await Today({}));
    expect(html).toContain("Limited results"); expect(html).not.toContain("Snooze 24 hours"); expect(html).not.toContain("Queue clear");
  });
  it("exposes inherited read-only context but no action form or false unassigned label", async () => {
    const queue = buildAdminTodayQueue({ leads: [{ id: "synthetic", status: "new", inquiry_owner_agent_id: "owner", primary_intent: "buy" }], tasks: [], appointments: [] });
    mocks.queue.mockResolvedValue(queue);
    const html = renderToStaticMarkup(await Today({}));
    expect(html).toContain("Inherited owner"); expect(html).toContain("Read-only access");
    expect(html).toContain("Request details not provided"); expect(html).toContain("Open request");
    expect(html).not.toContain("No assigned owner"); expect(html).not.toContain("Snooze 24 hours");
  });
  it("marks task/permission/review truncation, not only the lead cap", async () => {
    mocks.query.mockResolvedValueOnce([{ id: "synthetic", status: "new" }]);
    mocks.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([])
      .mockResolvedValueOnce(Array.from({ length: 4001 }, () => ({}))).mockResolvedValueOnce([]);
    const queue = await loadNeonAdminTodayQueue({ userId: "synthetic", role: "administrator", agentId: null, email: "admin@example.test", name: "SYNTHETIC" });
    expect(queue.coverage).toMatchObject({ state: "limited", limitedBy: ["permissions"] });
  });
});
