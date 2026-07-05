import { describe, expect, it } from "vitest";
import {
  normalizeAdminLeadRow,
  normalizeAdminLeadRows,
} from "../../app/lib/adminLeadView";

describe("normalizeAdminLeadRow", () => {
  it("normalizes canonical LeadOps rows into an admin-safe shape", () => {
    const lead = normalizeAdminLeadRow({
      id: "lead-1",
      created_at: "2026-07-05T12:00:00.000Z",
      status: "new",
      funnel_type: "home_value",
      lead_source_surface: "home_value_page",
      assigned_agent_id: null,
      name: "Jane Wilson",
      email: " jane@example.com ",
      phone: "2525551212",
      address: "123 Nash St NW, Wilson NC",
      timeline: "30 days",
      condition: "good",
      question: "What is my home worth?",
      notes: "Prefers afternoon follow-up",
      source: "facebook",
      medium: "paid_social",
      campaign: "home_value_wilson_nc",
      content: "feed_4x5_black_diamond",
      term: "wilson homes",
      referrer: "https://facebook.com/",
      landing_page: "https://askmagicmike.com/home-value",
      initial_path: "/home-value",
      current_path: "/home-value?utm_source=facebook",
      parent_url: "https://www.ourtownproperties.com/",
      embed_host: "www.ourtownproperties.com",
      placement: "sitewide-floating",
      gclid: "gclid-1",
      fbclid: "fbclid-1",
      device_category: "mobile",
    });

    expect(lead.id).toBe("lead-1");
    expect(lead.status).toBe("new");
    expect(lead.funnel_type).toBe("home_value");
    expect(lead.lead_source_surface).toBe("home_value_page");
    expect(lead.email).toBe("jane@example.com");
    expect(lead.primary_detail).toBe("123 Nash St NW, Wilson NC");
    expect(lead.contact_summary).toBe("jane@example.com / 2525551212");
    expect(lead.routing_ready).toBe(true);
    expect(lead.attribution.source).toBe("facebook");
    expect(lead.attribution.medium).toBe("paid_social");
    expect(lead.attribution.campaign).toBe("home_value_wilson_nc");
    expect(lead.attribution.device_category).toBe("mobile");
  });

  it("does not expose undefined when attribution fields are missing", () => {
    const lead = normalizeAdminLeadRow({
      id: "lead-2",
      created_at: "",
      status: "",
      funnel_type: "",
    });

    expect(lead.status).toBe("new");
    expect(lead.created_at).toBeNull();
    expect(lead.attribution_summary).toBe("No attribution captured");
    expect(Object.values(lead.attribution)).not.toContain(undefined);
    expect(Object.values(lead.attribution).every((value) => value === null)).toBe(true);
  });

  it("surfaces widget and legacy embed attribution fields for admin review", () => {
    const lead = normalizeAdminLeadRow({
      id: "lead-widget",
      funnel_type: "widget",
      lead_source_surface: "widget",
      property_address: "500 Goldsboro St",
      phone: "2525550100",
      attribution: {
        source: "ourtownproperties",
        medium: "website",
        campaign: "parent-site-widget",
        parent_url: "https://www.ourtownproperties.com/sell/",
        embed_host: "www.ourtownproperties.com",
        placement: "sitewide-floating",
      },
    });

    expect(lead.attribution.source).toBe("ourtownproperties");
    expect(lead.attribution.medium).toBe("website");
    expect(lead.attribution.campaign).toBe("parent-site-widget");
    expect(lead.attribution.parent_url).toBe("https://www.ourtownproperties.com/sell/");
    expect(lead.attribution.embed_host).toBe("www.ourtownproperties.com");
    expect(lead.attribution.placement).toBe("sitewide-floating");
    expect(lead.attribution_summary).toBe(
      "ourtownproperties / website / parent-site-widget / sitewide-floating",
    );
  });

  it("preserves status and assigned_agent_id without forcing routing readiness", () => {
    const lead = normalizeAdminLeadRow({
      id: "lead-assigned",
      status: "assigned",
      assigned_agent_id: "agent-1",
      email: "agent-ready@example.com",
      address: "100 Tarboro St",
    });

    expect(lead.status).toBe("assigned");
    expect(lead.assigned_agent_id).toBe("agent-1");
    expect(lead.routing_ready).toBe(false);
  });

  it("falls back to question when address is absent", () => {
    const lead = normalizeAdminLeadRow({
      id: "lead-question",
      question_raw: "Should I sell now or wait?",
      email: "jane@example.com",
    });

    expect(lead.primary_detail).toBe("Should I sell now or wait?");
  });

  it("normalizes arrays of rows", () => {
    const leads = normalizeAdminLeadRows([{ id: "a" }, { id: "b" }]);
    expect(leads.map((lead) => lead.id)).toEqual(["a", "b"]);
  });
});
