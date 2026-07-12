import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bucketLeadStatus,
  isAppointment,
  isContactable,
  isConverted,
  isClosedLost,
  isQualified,
  isSpamOrTest,
  loadAdminReportingSummary,
  normalizeReportingLeadRow,
  summarizeReportingRows,
  timelineLabel,
} from "../../app/lib/adminReportingView";

const ORIGINAL_FETCH = globalThis.fetch;

const NOW = new Date("2026-07-08T16:00:00.000Z");

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role";
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
  delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
  vi.useRealTimers();
});

describe("AdminOps reporting view model", () => {
  it("normalizes rows with current production reporting fields", () => {
    const row = normalizeReportingLeadRow({
      id: "lead-1",
      created_at: "2026-07-08T12:00:00.000Z",
      status: "qualified",
      lead_type: "seller",
      source: "widget",
      source_detail: "widget / website / campaign / footer",
      page_url: "https://www.ourtownproperties.com/sell/",
      timeline_months: "0",
      primary_intent: "sell",
      assigned_agent_id: "agent-1",
      assigned_at: "2026-07-08T12:05:00.000Z",
      last_contacted_at: null,
      lead_grade: "A",
      conversion_stage: null,
      address_raw: "123 Nash St NW",
      email: " jane@example.com ",
      phone: "2525551212",
      widget_session_id: "session-1",
    });

    expect(row).toMatchObject({
      id: "lead-1",
      status: "qualified",
      lead_type: "seller",
      source: "widget",
      timeline_months: 0,
      primary_intent: "sell",
      email: "jane@example.com",
      phone: "2525551212",
      assigned_at: "2026-07-08T12:05:00.000Z",
      lead_grade: "A",
    });
  });

  it("tolerates missing optional fields", () => {
    const row = normalizeReportingLeadRow({ id: "lead-2" });

    expect(row.status).toBe("new");
    expect(row.created_at).toBeNull();
    expect(row.source_detail).toBeNull();
    expect(row.timeline_months).toBeNull();
    expect(Object.values(row)).not.toContain(undefined);
  });

  it("buckets statuses and detects funnel states", () => {
    expect(bucketLeadStatus("new")).toBe("new");
    expect(bucketLeadStatus("contacted")).toBe("working");
    expect(bucketLeadStatus("appointment_requested")).toBe("qualified_appointment");
    expect(bucketLeadStatus("converted")).toBe("closed");
    expect(bucketLeadStatus("spam")).toBe("spam_test");

    const qualified = normalizeReportingLeadRow({ id: "q", status: "qualified", email: "a@b.com" });
    const appointment = normalizeReportingLeadRow({ id: "a", status: "appointment_set" });
    const converted = normalizeReportingLeadRow({ id: "c", status: "converted" });
    const spam = normalizeReportingLeadRow({ id: "s", status: "spam" });

    expect(isContactable(qualified)).toBe(true);
    expect(isQualified(qualified)).toBe(true);
    expect(isAppointment(appointment)).toBe(true);
    expect(isConverted(converted)).toBe(true);
    expect(isClosedLost(spam)).toBe(true);
    expect(isSpamOrTest(spam)).toBe(true);
  });

  it("counts today, 7-day, 30-day, contactable, funnel, and grouped reporting metrics", () => {
    const summary = summarizeReportingRows([
      {
        id: "hot",
        created_at: "2026-07-08T12:00:00.000Z",
        status: "new",
        lead_type: "seller",
        source: "widget",
        source_detail: "floating",
        page_url: "https://askmagicmike.com/home-value",
        timeline_months: 0,
        primary_intent: "sell",
        assigned_agent_id: null,
        assigned_at: null,
        last_contacted_at: null,
        lead_grade: "A",
        conversion_stage: null,
        address_raw: "100 Nash St",
        email: null,
        phone: "2525550100",
        widget_session_id: "session-hot",
      },
      {
        id: "qualified",
        created_at: "2026-07-05T12:00:00.000Z",
        status: "qualified",
        lead_type: "home_value",
        source: "facebook",
        source_detail: "paid_social",
        page_url: "https://askmagicmike.com/home-value",
        timeline_months: 3,
        primary_intent: "sell",
        assigned_agent_id: null,
        assigned_at: null,
        last_contacted_at: null,
        lead_grade: "B",
        conversion_stage: "qualified",
        address_raw: "200 Nash St",
        email: "jane@example.com",
        phone: null,
        widget_session_id: null,
      },
      {
        id: "appointment",
        created_at: "2026-06-22T12:00:00.000Z",
        status: "appointment_requested",
        lead_type: "seller_cash_offer",
        source: "widget",
        source_detail: "floating",
        page_url: "https://www.ourtownproperties.com/",
        timeline_months: 6,
        primary_intent: "sell",
        assigned_agent_id: null,
        assigned_at: null,
        last_contacted_at: "2026-06-22T12:00:00.000Z",
        lead_grade: "A",
        conversion_stage: "appointment_requested",
        address_raw: "300 Nash St",
        email: null,
        phone: "2525550200",
        widget_session_id: null,
      },
      {
        id: "converted",
        created_at: "2026-06-12T12:00:00.000Z",
        status: "converted",
        lead_type: "buyer",
        source: "direct",
        source_detail: null,
        page_url: "https://askmagicmike.com/ask",
        timeline_months: 12,
        primary_intent: "buy",
        assigned_agent_id: "agent-1",
        assigned_at: "2026-06-12T12:05:00.000Z",
        last_contacted_at: "2026-06-12T13:00:00.000Z",
        lead_grade: "C",
        conversion_stage: "converted",
        address_raw: null,
        email: "buyer@example.com",
        phone: null,
        widget_session_id: null,
      },
      {
        id: "spam",
        created_at: "2026-07-08T13:00:00.000Z",
        status: "spam",
        lead_type: "home_value",
        source: "widget",
        source_detail: "test",
        page_url: "https://askmagicmike.com/widget",
        timeline_months: 24,
        primary_intent: "sell",
        assigned_agent_id: null,
        assigned_at: null,
        last_contacted_at: null,
        lead_grade: null,
        conversion_stage: "disqualified",
        address_raw: null,
        email: "spam@example.com",
        phone: null,
        widget_session_id: null,
      },
    ], NOW, 30);

    expect(summary.kpis).toEqual({
      leadsToday: 1,
      leadsLast7Days: 2,
      leadsLast30Days: 4,
      contactableRate: 100,
    });
    expect(summary.funnel).toEqual({
      captured: 4,
      contacted: 3,
      qualified: 3,
      appointment: 1,
      converted: 1,
      lostDisqualified: 1,
    });
    expect(summary.rates).toEqual({
      qualificationRate: 75,
      appointmentRate: 33,
      conversionRate: 25,
      closeRate: 50,
    });
    expect(summary.stalledLeadCount).toBe(3);
    expect(summary.statusBuckets).toMatchObject({
      new: 1,
      qualified_appointment: 2,
      closed: 1,
      spam_test: 1,
    });
    expect(summary.sources[0]).toMatchObject({
      label: "widget / floating",
      count: 2,
      contactable: 2,
      qualifiedAppointment: 1,
      conversionRate: 0,
    });
    expect(summary.campaigns.map((row) => row.label)).toContain("floating");
    expect(summary.agentPerformance).toEqual([{
      agent_id: "agent-1",
      assigned: 1,
      qualified: 1,
      appointments: 0,
      converted: 1,
      closedLost: 0,
      stalled: 0,
      conversionRate: 100,
    }]);
    expect(summary.topPages[0]).toEqual({
      page_url: "https://askmagicmike.com/home-value",
      count: 2,
    });
    expect(summary.leadTypes.find((row) => row.lead_type === "seller")).toMatchObject({ count: 1 });
    expect(summary.intents.find((row) => row.primary_intent === "sell")).toMatchObject({ count: 3 });
    expect(summary.timelines.map((row) => row.label)).toContain("Immediate / 0-30 days");
    expect(summary.hotLeads.map((row) => row.id)).toEqual(["hot"]);
  });

  it("labels timeline buckets", () => {
    expect(timelineLabel(0)).toBe("Immediate / 0-30 days");
    expect(timelineLabel(3)).toBe("30-90 days");
    expect(timelineLabel(6)).toBe("3-6 months");
    expect(timelineLabel(12)).toBe("6-12 months");
    expect(timelineLabel(24)).toBe("12+ months / not sure");
    expect(timelineLabel(null)).toBe("Unknown");
  });

  it("returns configured=false without Supabase env vars and does not fetch", async () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const summary = await loadAdminReportingSummary(7);

    expect(summary.configured).toBe(false);
    expect(summary.rows).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses GET-only bounded Supabase REST reads with selected fields and capped limit", async () => {
    const captured: Array<{ url: URL; init?: RequestInit }> = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      captured.push({ url: new URL(String(url)), init });
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [],
      } as Response;
    }) as unknown as typeof fetch;

    const summary = await loadAdminReportingSummary(90);

    expect(summary.configured).toBe(true);
    expect(captured).toHaveLength(1);
    expect(captured[0].url.origin).toBe("https://fake.supabase.co");
    expect(captured[0].url.pathname).toBe("/rest/v1/leads");
    expect(captured[0].init?.method).toBeUndefined();
    expect(captured[0].url.searchParams.get("select")).toBe(
      "id,created_at,status,lead_type,source,source_detail,page_url,timeline_months,primary_intent,assigned_agent_id,assigned_at,last_contacted_at,lead_grade,conversion_stage,address_raw,email,phone,widget_session_id",
    );
    expect(captured[0].url.searchParams.get("created_at")).toMatch(/^gte\./);
    expect(captured[0].url.searchParams.get("order")).toBe("created_at.desc");
    expect(captured[0].url.searchParams.get("limit")).toBe("1000");
  });

  it("returns a safe admin error when the read query fails", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "raw database detail",
    })) as unknown as typeof fetch;

    const summary = await loadAdminReportingSummary(30);

    expect(summary.configured).toBe(true);
    expect(summary.rows).toEqual([]);
    expect(summary.error).toBe("Reporting query failed with 500");
    expect(summary.error).not.toContain("fake-service-role");
    expect(summary.error).not.toContain("raw database detail");
  });
});
