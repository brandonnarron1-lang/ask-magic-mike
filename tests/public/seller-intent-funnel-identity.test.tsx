import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SellerIntentSection } from "../../app/components/black-diamond/SellerIntentSection";

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

function analyticsBodies(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls
    .filter(([input]) => String(input) === "/api/events")
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("seller funnel identity integrity", () => {
  it("links every canonical client event to the seller submission and narrows channel consent", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input) === "/api/leads") {
        return new Response(JSON.stringify({
          message: "Synthetic seller lead accepted.",
          lead_id: "qa-seller-lead",
          session_id: "qa-seller-session",
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(null, { status: 202 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<SellerIntentSection />);

    expect(screen.getByLabelText("Condition (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Timeline (optional)")).toHaveValue("");
    await user.type(screen.getByLabelText("Property address"), "123 Internal QA Road, Wilson NC");
    await user.type(screen.getByLabelText("Phone required"), "2525550194");
    await user.click(screen.getByRole("checkbox", { name: /Our Town Properties may contact me/i }));
    await user.click(screen.getByRole("button", { name: "Send Seller Details" }));

    expect(await screen.findByText("Synthetic seller lead accepted.")).toBeVisible();
    const leadCall = fetchMock.mock.calls.find(([input]) => String(input) === "/api/leads");
    const leadPayload = JSON.parse(String(leadCall?.[1]?.body)) as Record<string, unknown>;
    expect(leadPayload.consent_call).toBe(true);
    expect(leadPayload.consent_email).toBe(false);
    expect(leadPayload).not.toHaveProperty("condition");
    expect(leadPayload).not.toHaveProperty("timeline");
    expect(typeof leadPayload.idempotency_key).toBe("string");

    const events = analyticsBodies(fetchMock);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.session_id === leadPayload.idempotency_key)).toBe(true);
    expect(events.map((event) => event.event_name)).toContain("thank_you_viewed");
    expect(events.map((event) => event.event_name)).not.toContain("lead_created");
  });

  it("keeps a failed seller request recoverable and records one linked privacy-safe failure", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input) === "/api/leads") {
        return new Response(JSON.stringify({ error: "Lead storage failed." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(null, { status: 202 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<SellerIntentSection />);

    await user.type(screen.getByLabelText("Property address"), "456 Internal QA Lane, Wilson NC");
    await user.type(screen.getByLabelText("Phone required"), "2525550194");
    await user.selectOptions(screen.getByLabelText("Condition (optional)"), "Needs major repairs");
    await user.selectOptions(screen.getByLabelText("Timeline (optional)"), "30-60 days");
    await user.click(screen.getByRole("button", { name: "Send Seller Details" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Lead storage failed.");
    const leadCall = fetchMock.mock.calls.find(([input]) => String(input) === "/api/leads");
    const leadPayload = JSON.parse(String(leadCall?.[1]?.body)) as Record<string, unknown>;
    expect(leadPayload).toMatchObject({
      condition: "Needs major repairs",
      timeline: "30-60 days",
    });
    const events = analyticsBodies(fetchMock);
    const failures = events.filter((event) => event.event_name === "lead_submit_failed");
    expect(failures).toHaveLength(1);
    expect(failures[0].session_id).toBe(leadPayload.idempotency_key);
    expect(failures[0]).not.toHaveProperty("error");
    expect(events.map((event) => event.event_name)).not.toContain("lead_created");
  });
});
