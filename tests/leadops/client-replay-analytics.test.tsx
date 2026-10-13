import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeValueFunnel } from "../../app/components/black-diamond/HomeValueFunnel";
import { SellerIntentSection } from "../../app/components/black-diamond/SellerIntentSection";
import { PUBLIC_LEAD_SAVED_MESSAGE } from "../../app/lib/publicLeadReceipt";
vi.mock("../../app/lib/publicIntakeCapability", () => ({ usePublicIntakeCapability: () => "live" }));

Object.defineProperty(window, "matchMedia", {
  writable: true,
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

function replayResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-AMM-Idempotent-Replay": "1",
      "X-AMM-Correlation-Id": "00000000-0000-4000-8000-000000000202",
    },
  });
}

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

describe("client replay analytics suppression", () => {
  it("keeps widget home-value replay success visible without fresh lead analytics", async () => {
    const user = userEvent.setup();
    const analytics = recordAnalytics();
    const postMessage = vi.spyOn(window.parent, "postMessage").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
        replayResponse({
          message: "Got it. Mike will follow up shortly.",
          lead_id: "00000000-0000-4000-8000-000000000201",
          session_id: JSON.parse(String(init?.body)).idempotency_key,
          correlation_id: "00000000-0000-4000-8000-000000000202",
        }),
      ),
    );

    render(<HomeValueFunnel surface="widget" />);

    await user.type(screen.getByLabelText("Property address"), "123 Replay Road, Wilson NC");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Your name"), "INTERNAL QA DO NOT CONTACT");
    await user.type(screen.getByLabelText("Email for your valuation follow-up"), "replay@example.test");
    await user.type(screen.getByLabelText("Phone (optional)"), "2525550123");
    await user.click(screen.getByRole("button", { name: "Request Valuation" }));

    expect(await screen.findByText("Your request is in.")).toBeVisible();
    expect(screen.getByText("Your labeled troubleshooting request is stored for internal review. This confirmation does not create consumer contact or an appointment.")).toBeVisible();
    expect(screen.queryByText("Got it. Mike will follow up shortly.")).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/leads",
      expect.objectContaining({
        body: expect.stringContaining('"name":"INTERNAL QA DO NOT CONTACT"'),
      }),
    );
    expect(analytics.events).not.toContain("lead_created");
    expect(analytics.events).not.toContain("widget_lead_created");
    expect(
      postMessage.mock.calls.some(
        ([message]) =>
          typeof message === "object" &&
          message !== null &&
          (message as { type?: string }).type === "askmagicmike:lead_created",
      ),
    ).toBe(false);

    analytics.cleanup();
  });

  it("keeps seller replay success visible without client lead_created analytics", async () => {
    const user = userEvent.setup();
    const analytics = recordAnalytics();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
        replayResponse({
          message: "Got it. Mike will review it.",
          lead_id: "00000000-0000-4000-8000-000000000203",
          session_id: JSON.parse(String(init?.body)).idempotency_key,
          correlation_id: "00000000-0000-4000-8000-000000000202",
        }),
      ),
    );

    render(<SellerIntentSection />);

    await user.type(screen.getByLabelText("Property address"), "456 Replay Pine, Wilson NC");
    await user.type(screen.getByLabelText("Phone required"), "2525550199");
    await user.click(screen.getByRole("button", { name: "Send Seller Details" }));

    expect(await screen.findByText(PUBLIC_LEAD_SAVED_MESSAGE)).toBeVisible();
    expect(screen.queryByText("Got it. Mike will review it.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request a conversation" })).toBeVisible();
    expect(analytics.events).not.toContain("lead_created");

    analytics.cleanup();
  });
});
