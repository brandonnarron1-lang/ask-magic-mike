// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildGrowthIntelligence } from "../../app/lib/growth/intelligence";
import { buildOwnedDemandCommand, resolveExactOwnedDemandSignalPlacement } from "../../app/lib/growth/owned-demand";
import {
  loadNeonGrowthIntelligence,
  normalizeGrowthPlacementDelivery as normalizeAggregate,
  queryGrowthPlacementDelivery,
} from "../../app/lib/persistence/neonGrowthIntelligenceView";

const query = vi.hoisted(() => vi.fn());
vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));
const leadId = "00000000-0000-4000-8000-000000000001";
const cohort = [{ id: leadId, utm_source: "ourtownproperties", utm_medium: "owned_media", utm_campaign: "amm_owned_demand_2026", utm_content: "wordpress_we_buy_homes" }];
const columns = ["lead_id", "template_version", "notification_type", "channel", "recipient_type", "metadata", "status", "provider_message_id", "provider_accepted_at"];
const readableColumns = columns.map((column_name) => ({ column_name }));
function aggregate(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { utm_source: "ourtownproperties", utm_medium: "owned_media", utm_campaign: "amm_owned_demand_2026",
    utm_content: "wordpress_we_buy_homes", operator_key: "operator:mike", delivery_state: "pending", envelopes: "1", ...extra };
}
function coverage(operator_key: string, accepted_inquiries: unknown, inquiries_with_envelope: unknown, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return aggregate({ operator_key, delivery_state: "coverage", envelopes: 0, accepted_inquiries, inquiries_with_envelope, ...extra });
}
function fixtureRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const tuples = new Map(rows.map((row) => [JSON.stringify([row.utm_source, row.utm_medium, row.utm_campaign, row.utm_content]), row]));
  const coverageRows: Record<string, unknown>[] = [...tuples.values()].flatMap((tuple) => ["operator:mike", "operator:brandon"].map((operator) =>
    coverage(operator, 10, rows.some((row) => row.operator_key === operator && row.utm_content === tuple.utm_content && Number(row.envelopes) > 0) ? 1 : 0,
      { utm_source: tuple.utm_source, utm_medium: tuple.utm_medium, utm_campaign: tuple.utm_campaign, utm_content: tuple.utm_content })));
  return [...coverageRows, ...rows];
}
function normalizeGrowthPlacementDelivery(rows: Record<string, unknown>[]) { return normalizeAggregate(fixtureRows(rows)); }
afterEach(() => { vi.unstubAllEnvs(); query.mockReset(); });

describe("exact placement operator envelope aggregates", () => {
  it("keeps an accepted inquiry visible when neither operator has a v6 envelope", () => {
    const snapshot = normalizeAggregate([coverage("operator:mike", 1, 0), coverage("operator:brandon", 1, 0)]);
    expect(snapshot).toMatchObject({ configured: true, placements: [{ acceptedInquiries: 1, unknownOperatorEnvelopes: 0,
      operators: [
        { operator: "operator:mike", counts: { envelopes: 0, inquiries_with_envelope: 0, no_v6_envelope_recorded: 1, held_or_failed: 0 } },
        { operator: "operator:brandon", counts: { envelopes: 0, inquiries_with_envelope: 0, no_v6_envelope_recorded: 1, held_or_failed: 0 } },
      ] }] });
  });

  it("reports one unrecorded operator envelope without calling it a failure or subtracting duplicate envelopes", () => {
    const snapshot = normalizeAggregate([coverage("operator:mike", 1, 1), coverage("operator:brandon", 1, 0),
      aggregate({ envelopes: 2, delivery_state: "delivered" })]);
    expect(snapshot.placements[0].acceptedInquiries).toBe(1);
    expect(snapshot.placements[0].operators[0].counts).toMatchObject({ envelopes: 2, inquiries_with_envelope: 1, no_v6_envelope_recorded: 0, delivered: 2 });
    expect(snapshot.placements[0].operators[1].counts).toMatchObject({ envelopes: 0, no_v6_envelope_recorded: 1, held_or_failed: 0 });
  });

  it("keeps the denominator but withholds operator coverage differences when operator metadata is unknown", () => {
    const snapshot = normalizeAggregate([coverage("operator:mike", 1, 0), coverage("operator:brandon", 1, 0), aggregate({ operator_key: null })]);
    expect(snapshot.placements[0]).toMatchObject({ acceptedInquiries: 1, unknownOperatorEnvelopes: 1,
      operators: [{ operator: "operator:mike", counts: null }, { operator: "operator:brandon", counts: null }] });
  });

  it("rejects invalid/missing/inconsistent denominators or coverage rather than manufacturing differences", () => {
    for (const invalid of [NaN, Infinity, -1, 1.5, "NaN", null]) {
      expect(normalizeAggregate([coverage("operator:mike", invalid, 0), coverage("operator:brandon", 1, 0)]).configured).toBe(false);
      expect(normalizeAggregate([coverage("operator:mike", 1, invalid), coverage("operator:brandon", 1, 0)]).configured).toBe(false);
    }
    for (const rows of [[aggregate()], [coverage("operator:mike", 1, 0)],
      [coverage("operator:mike", 1, 2), coverage("operator:brandon", 1, 0)],
      [coverage("operator:mike", 1, 0), coverage("operator:brandon", 2, 0)]]) {
      expect(normalizeAggregate(rows)).toMatchObject({ configured: false, unavailableReason: "invalid_aggregate", placements: [] });
    }
  });

  it("reuses every current catalog tuple without accepting legacy or lookalike attribution", () => {
    const summary = buildGrowthIntelligence({ leads: [] }).summary;
    const command = buildOwnedDemandCommand({ summary, ownedDemandSignals: [] });
    for (const channel of command.channels) {
      const contents = [channel.content, ...channel.offers.map((p) => p.content),
        ...channel.namedPlacements.map((p) => p.content), ...channel.instancePlacements.map((p) => p.content)];
      for (const content of contents) {
        const signal = { source: channel.source, medium: channel.medium, campaign: channel.campaign, content, leads: 1 };
        expect(resolveExactOwnedDemandSignalPlacement(signal)).toMatchObject({ channelKey: channel.key, content });
        expect(resolveExactOwnedDemandSignalPlacement({ ...signal, campaign: "other" })).toBeNull();
        expect(resolveExactOwnedDemandSignalPlacement({ ...signal, content: `${content}_unregistered` })).toBeNull();
        expect(resolveExactOwnedDemandSignalPlacement({ ...signal, basis: "legacy_wordpress_compatibility" })).toBeNull();
      }
    }
    expect(normalizeGrowthPlacementDelivery([aggregate({ utm_source: "OURTOWN_WP", utm_medium: "Owned Media" })]).placements).toHaveLength(1);
    expect(normalizeGrowthPlacementDelivery([aggregate({ utm_medium: "embed", utm_campaign: null })]).placements).toEqual([]);
  });

  it("separates both operators and mutually exclusive envelope states, not event or lead totals", () => {
    const rows = [
      aggregate({ envelopes: "2", delivery_state: "delivered" }),
      aggregate({ delivery_state: "accepted_unconfirmed" }),
      aggregate({ delivery_state: "unknown" }),
      aggregate({ operator_key: "operator:brandon", delivery_state: "retry_scheduled" }),
      aggregate({ operator_key: "operator:brandon", delivery_state: "held_or_failed" }),
      aggregate({ utm_content: "wordpress_home_value_page", delivery_state: "pending" }),
      aggregate({ utm_content: "private-unregistered-content", recipient_address: "never@example.test" }),
    ];
    const original = JSON.stringify(rows);
    const snapshot = normalizeGrowthPlacementDelivery(rows);
    expect(snapshot.configured).toBe(true);
    expect(snapshot.placements).toHaveLength(2);
    const seller = snapshot.placements.find((p) => p.placementKey === "wordpress_we_buy_homes")!;
    expect(seller.operators).toEqual([
      { operator: "operator:mike", counts: { envelopes: 4, inquiries_with_envelope: 1, no_v6_envelope_recorded: 9, pending: 0, retry_scheduled: 0, held_or_failed: 0, accepted_unconfirmed: 1, delivered: 2, unknown: 1 } },
      { operator: "operator:brandon", counts: { envelopes: 2, inquiries_with_envelope: 1, no_v6_envelope_recorded: 9, pending: 0, retry_scheduled: 1, held_or_failed: 1, accepted_unconfirmed: 0, delivered: 0, unknown: 0 } },
    ]);
    expect(JSON.stringify(snapshot)).not.toMatch(/never@example|private-unregistered|recipient_address/);
    expect(JSON.stringify(rows)).toBe(original);
  });

  it.each([null, "operator:other", "mike@example.test", "operator:mike:extra"])("does not invent operator zero counts from unknown identity %s", (operator_key) => {
    const snapshot = normalizeGrowthPlacementDelivery([
      aggregate(), aggregate({ operator_key }), aggregate({ utm_content: "wordpress_home_value_page" }),
    ]);
    const seller = snapshot.placements.find((p) => p.placementKey === "wordpress_we_buy_homes")!;
    expect(seller.unknownOperatorEnvelopes).toBe(1);
    expect(seller.operators).toEqual([{ operator: "operator:mike", counts: null }, { operator: "operator:brandon", counts: null }]);
    expect(snapshot.placements.find((p) => p.placementKey === "wordpress_home_value")!.operators[0].counts?.pending).toBe(1);
    expect(JSON.stringify(snapshot)).not.toContain("operator:other");
    expect(JSON.stringify(snapshot)).not.toContain("mike@example.test");
  });

  it("distinguishes verified empty aggregates, unknown states and invalid count evidence", () => {
    expect(normalizeGrowthPlacementDelivery([])).toEqual({ configured: true, placements: [] });
    expect(normalizeGrowthPlacementDelivery([aggregate({ delivery_state: "foreign-state" })]).placements[0].operators[0].counts?.unknown).toBe(1);
    for (const envelopes of [undefined, null, "", " ", "NaN", NaN, Infinity, false, [], {}, -1, 1.5]) {
      expect(normalizeGrowthPlacementDelivery([aggregate({ envelopes })])).toEqual({ configured: false, unavailableReason: "invalid_aggregate", placements: [] });
    }
  });
});

describe("optional v6 schema and read-grant compatibility", () => {
  it("normalizes Neon's full-result envelopes through the unknown query boundary", async () => {
    const sql = { query: vi.fn().mockResolvedValueOnce({ rows: readableColumns }).mockResolvedValueOnce({ rows: fixtureRows([aggregate()]) }) };
    const result = await queryGrowthPlacementDelivery(sql, cohort);
    expect(result.configured).toBe(true);
    expect(result.placements[0].operators[0].counts?.pending).toBe(1);
  });

  it("loads denominator-only SQL aggregates for an accepted inquiry with no notification rows", async () => {
    const sql = { query: vi.fn().mockResolvedValueOnce(readableColumns).mockResolvedValueOnce([
      coverage("operator:mike", 1, 0), coverage("operator:brandon", 1, 0),
    ]) };
    const snapshot = await queryGrowthPlacementDelivery(sql, cohort);
    expect(snapshot.placements[0].acceptedInquiries).toBe(1);
    expect(snapshot.placements[0].operators.every(({ counts }) => counts?.envelopes === 0 && counts.no_v6_envelope_recorded === 1)).toBe(true);
  });

  it.each([null, {}, { rows: null }, [null], [["array-mode row"]]])("rejects malformed query results instead of inventing zero evidence: %j", async (result) => {
    for (const afterCapability of [false, true]) {
      const sql = { query: vi.fn() };
      if (afterCapability) sql.query.mockResolvedValueOnce(readableColumns);
      sql.query.mockResolvedValueOnce(result);
      expect(await queryGrowthPlacementDelivery(sql, cohort)).toEqual({ configured: false, unavailableReason: "invalid_aggregate", placements: [] });
    }
  });

  it("retains a verified zero from an empty full-result envelope", async () => {
    const sql = { query: vi.fn().mockResolvedValueOnce({ rows: readableColumns }).mockResolvedValueOnce({ rows: [] }) };
    expect(await queryGrowthPlacementDelivery(sql, cohort)).toEqual({ configured: true, placements: [] });
  });

  it.each(["metadata", "provider_accepted_at", "template_version"])("does not query optional data when %s is absent/unreadable", async (missing) => {
    const sql = { query: vi.fn().mockResolvedValue(readableColumns.filter((row) => row.column_name !== missing)) };
    expect(await queryGrowthPlacementDelivery(sql, cohort)).toEqual({ configured: false, unavailableReason: "schema_or_grants", placements: [] });
    expect(sql.query).toHaveBeenCalledTimes(1);
    expect(sql.query.mock.calls[0][0]).toContain("has_column_privilege");
    expect(sql.query.mock.calls[0][0]).toContain("NOT a.attisdropped");
    expect(sql.query.mock.calls[0][0]).toContain("NOT row_security_active(a.attrelid)");
  });

  it("checks grants even for an empty lead cohort, then returns a verified zero without a data scan", async () => {
    const sql = { query: vi.fn().mockResolvedValue(readableColumns) };
    expect(await queryGrowthPlacementDelivery(sql, [])).toEqual({ configured: true, placements: [] });
    expect(sql.query).toHaveBeenCalledTimes(1);
  });

  it("returns unavailable without leaking permission/query errors or private data", async () => {
    for (const afterCapability of [false, true]) {
      const sql = { query: vi.fn() };
      if (afterCapability) sql.query.mockResolvedValueOnce(readableColumns);
      sql.query.mockRejectedValueOnce(new Error("private@example.test internal driver details"));
      expect(await queryGrowthPlacementDelivery(sql, cohort)).toEqual({ configured: false, unavailableReason: "query_failed", placements: [] });
    }
  });

  it("SQL scopes the current cohort/latest touch, allowlists operators and projects only grouped evidence", async () => {
    const sql = { query: vi.fn().mockResolvedValueOnce(readableColumns).mockResolvedValueOnce(fixtureRows([aggregate()])) };
    expect((await queryGrowthPlacementDelivery(sql, cohort)).configured).toBe(true);
    const [statement, params] = sql.query.mock.calls[1];
    expect(JSON.parse(params[0])).toEqual(cohort);
    for (const expected of ["jsonb_to_recordset($1::jsonb)", "l.is_test = false", "l.communication_suppressed = false",
      "COUNT(DISTINCT c.id)::integer AS accepted_inquiries", "COUNT(DISTINCT e.inquiry_id)::integer AS inquiries_with_envelope", "CROSS JOIN operators o", "LEFT JOIN envelopes e", "n.template_version = 'lead_alert_email_v6'",
      "n.notification_type = 'lead_alert'", "n.channel = 'email'", "n.recipient_type = 'internal'",
      "WHEN 'mike' THEN 'operator:mike'", "WHEN 'brandon' THEN 'operator:brandon'",
      "ELSE NULL END AS operator_key", "COUNT(*)::integer AS envelopes", "GROUP BY 1, 2, 3, 4, 5, 6"]) expect(statement).toContain(expected);
    expect(statement.indexOf("THEN 'held_or_failed'")).toBeLessThan(statement.indexOf("THEN 'delivered'"));
    expect(statement.indexOf("THEN 'delivered'")).toBeLessThan(statement.indexOf("THEN 'accepted_unconfirmed'"));
    expect(statement).toContain("n.provider_accepted_at IS NOT NULL");
    expect(statement).toContain("n.status = 'sent' AND n.provider_message_id IS NOT NULL");
    expect(statement).toContain("ELSE 'unknown' END AS delivery_state");
    expect(statement).not.toMatch(/SELECT\s+n\.\*|n\.recipient_reference|private_intake_snapshot|l\.email|l\.phone|communication_events/);
    expect(statement).not.toContain("public.source_attribution"); // Reuse the already-read latest touch, not a second racing attribution read.
    // No join to callback events: repeated delivery callbacks cannot multiply envelopes.
  });

  it.each(["schema_or_grants", "query_failed"])("keeps existing Growth totals/delivery intact on optional %s", async (unavailableReason) => {
    vi.stubEnv("DATABASE_URL", "postgres://synthetic-invalid-no-network");
    query.mockImplementation(async (statement: string) => {
      if (statement.includes("AS has_spend")) return [{ has_spend: true, has_outcomes: true, has_responses: true,
        has_experiments: true, has_opportunities: true, has_recommendations: true,
        has_notifications: true, has_communication_events: true, has_analytics: false }];
      if (statement.includes("SELECT l.id, l.created_at")) return [{ id: leadId, created_at: new Date().toISOString(), status: "new", ...aggregate() }];
      if (statement.includes("WITH eligible_notifications")) return [{ terminal_internal_notifications: 2, permanent_internal_failures: 1, eligible_email_sends: 2 }];
      if (statement.includes("pg_catalog.pg_attribute")) {
        if (unavailableReason === "query_failed") throw new Error("synthetic permission refusal");
        return readableColumns.filter((row) => row.column_name !== "metadata");
      }
      return [];
    });
    const result = await loadNeonGrowthIntelligence(30);
    expect(result).toMatchObject({ configured: true, schemaReady: true,
      summary: { leads: 1 }, sourceRowsRead: 1,
      delivery: { configured: true, terminalInternalNotifications: 2, permanentInternalFailures: 1, eligibleEmailSends: 2 },
      placementDelivery: { configured: false, unavailableReason, placements: [] },
    });
    expect(buildOwnedDemandCommand(result).attributedLiveLeads).toBe(1);
    expect(result.error).toBeUndefined();
  });
});
