import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BuyerIntentSection } from "../../app/components/black-diamond/BuyerIntentSection";

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

function recordAnalytics() {
  const events: string[] = [];
  const listener = (event: Event) => {
    events.push(String((event as CustomEvent<{ event?: string }>).detail?.event));
  };
  window.addEventListener("askmagicmike:event", listener);
  return {
    events,
    cleanup: () => window.removeEventListener("askmagicmike:event", listener),
  };
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

describe("buyer-family contact and replay integrity", () => {
  it("explains the either-or contact requirement and focuses a recoverable error", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<BuyerIntentSection />);

    const email = screen.getByLabelText("Email");
    const phone = screen.getByLabelText("Phone");
    const requirement = screen.getByText(/Email or phone is required for follow-up/i);
    expect(requirement).toBeVisible();
    expect(email).toHaveAttribute("aria-describedby", "buyer-contact-requirement");
    expect(phone).toHaveAttribute("aria-describedby", "buyer-contact-requirement");

    await user.click(screen.getByRole("button", { name: "Request Buyer Plan" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Add an email or phone number so Mike can follow up.",
    );
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.type(phone, "2525550194");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute("aria-invalid");
    expect(phone).not.toHaveAttribute("aria-invalid");
  });

  it("labels renter capture distinctly and suppresses replay lead-created analytics", async () => {
    const user = userEvent.setup();
    const analytics = recordAnalytics();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input) === "/api/leads") {
        return new Response(
          JSON.stringify({
            message: "Synthetic replay accepted.",
            lead_id: "qa-renter-replay-lead",
            session_id: "qa-renter-replay-session",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-AMM-Idempotent-Replay": "1",
            },
          },
        );
      }
      return new Response(null, { status: 202 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<BuyerIntentSection surface="renter_page" preset="renter" />);

    await user.type(screen.getByLabelText("Phone"), "2525550194");
    await user.click(screen.getByRole("button", { name: "Request Renter Review" }));

    expect(await screen.findByText("Synthetic replay accepted.")).toBeVisible();
    const leadCall = fetchMock.mock.calls.find(([input]) => String(input) === "/api/leads");
    expect(leadCall).toBeDefined();
    const payload = JSON.parse(String(leadCall?.[1]?.body)) as Record<string, unknown>;
    expect(payload).toMatchObject({
      funnel_type: "renter",
      lead_type: "renter",
      lead_source_surface: "renter_page",
      phone: "2525550194",
    });
    expect(analytics.events).toContain("funnel_started");
    expect(analytics.events).toContain("contact_submitted");
    expect(analytics.events).not.toContain("lead_created");

    analytics.cleanup();
  });

  it("still emits one lead-created event for a newly stored buyer request", async () => {
    const user = userEvent.setup();
    const analytics = recordAnalytics();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input) === "/api/leads") {
        return new Response(
          JSON.stringify({
            message: "Synthetic new lead accepted.",
            lead_id: "qa-new-buyer-lead",
            session_id: "qa-new-buyer-session",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(null, { status: 202 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<BuyerIntentSection />);

    await user.type(screen.getByLabelText("Email"), "internal-qa@example.test");
    await user.click(screen.getByRole("button", { name: "Request Buyer Plan" }));

    expect(await screen.findByText("Synthetic new lead accepted.")).toBeVisible();
    expect(analytics.events.filter((eventName) => eventName === "lead_created")).toHaveLength(1);

    analytics.cleanup();
  });
});
