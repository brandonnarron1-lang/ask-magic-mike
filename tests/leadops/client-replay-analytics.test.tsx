import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeValueFunnel } from "../../app/components/black-diamond/HomeValueFunnel";
import { SellerIntentSection } from "../../app/components/black-diamond/SellerIntentSection";

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
      vi.fn(async () =>
        replayResponse({
          message: "Got it. Mike will follow up shortly.",
          lead_id: "replay-home-lead",
          session_id: "replay-home-session",
        }),
      ),
    );

    render(<HomeValueFunnel surface="widget" />);

    await user.type(screen.getByLabelText("Property address"), "123 Replay Road, Wilson NC");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Email for your valuation follow-up"), "replay@example.test");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Phone"), "2525550123");
    await user.click(screen.getByRole("button", { name: "Request Valuation" }));

    expect(await screen.findByText("Your request is in.")).toBeVisible();
    expect(screen.getByText("Got it. Mike will follow up shortly.")).toBeVisible();
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
      vi.fn(async () =>
        replayResponse({
          message: "Got it. Mike will review it.",
          lead_id: "replay-seller-lead",
          session_id: "replay-seller-session",
        }),
      ),
    );

    render(<SellerIntentSection />);

    await user.type(screen.getByLabelText("Property address"), "456 Replay Pine, Wilson NC");
    await user.type(screen.getByLabelText("Phone required"), "2525550199");
    await user.click(screen.getByRole("button", { name: "Send Seller Details" }));

    expect(await screen.findByText("Got it. Mike will review it.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Request a conversation" })).toBeVisible();
    expect(analytics.events).not.toContain("lead_created");

    analytics.cleanup();
  });
});
