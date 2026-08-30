import { describe, expect, it, vi } from "vitest";
import {
  NOTIFICATION_PENDING_STALE_MINUTES,
  NOTIFICATION_PROCESSING_STALE_MINUTES,
  normalizeLeadNotificationOperationsRow,
  queryLeadNotificationOperations,
} from "../../app/lib/persistence/neonLeadNotificationOperations";

describe("notification operations truth", () => {
  it("normalizes exact live totals without mixing test records into queue depth", () => {
    const snapshot = normalizeLeadNotificationOperationsRow({
      live_total: "17",
      test_total: "6",
      orphaned_total: "1",
      pending: "2",
      processing: 1,
      sent: "9",
      failed: "1",
      permanently_failed: "2",
      skipped: "1",
      retry_scheduled: "2",
      retry_due: "1",
      stale_pending: "1",
      stale_processing: "0",
      provider_confirmed: "8",
      provider_terminal_failure: "1",
      oldest_actionable_at: "2026-08-29T20:00:00.000Z",
      last_sent_at: "2026-08-29T20:30:00.000Z",
      last_provider_confirmation_at: "2026-08-29T20:31:00.000Z",
      generated_at: "2026-08-29T20:32:00.000Z",
    });

    expect(snapshot).toMatchObject({
      exact: true,
      liveTotal: 17,
      testTotal: 6,
      orphanedTotal: 1,
      queueDepth: 5,
      retryDue: 1,
      stalePending: 1,
      providerConfirmed: 8,
      providerTerminalFailure: 1,
    });
  });

  it("uses one read-only aggregate query with explicit live, test, stale, and provider scopes", async () => {
    const query = vi.fn(async (_statement: string, _params?: unknown[]) => [{
      live_total: 0,
      test_total: 0,
      orphaned_total: 0,
      generated_at: "2026-08-29T20:32:00.000Z",
    }]);

    await queryLeadNotificationOperations({ query });

    expect(query).toHaveBeenCalledTimes(1);
    const [statement, params] = query.mock.calls[0];
    expect(statement).toContain("LEFT JOIN public.leads l ON l.id = n.lead_id");
    expect(statement).toContain("WHEN COALESCE(l.is_test, false) THEN 'test'");
    expect(statement).toContain("lead_scope = 'live'");
    expect(statement).toContain("status = 'retry_scheduled'");
    expect(statement).toContain("metadata->>'provider_delivery_confirmed'");
    expect(statement).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\b/i);
    expect(params).toEqual([
      NOTIFICATION_PENDING_STALE_MINUTES,
      NOTIFICATION_PROCESSING_STALE_MINUTES,
    ]);
  });

  it("fails bounded when database values are malformed", () => {
    const snapshot = normalizeLeadNotificationOperationsRow({
      live_total: "not-a-number",
      pending: -4,
      processing: Number.POSITIVE_INFINITY,
      retry_scheduled: null,
      oldest_actionable_at: "not-a-date",
      generated_at: "not-a-date",
    });

    expect(snapshot.liveTotal).toBe(0);
    expect(snapshot.queueDepth).toBe(0);
    expect(snapshot.oldestActionableAt).toBeNull();
    expect(snapshot.generatedAt).toBe("1970-01-01T00:00:00.000Z");
  });
});
