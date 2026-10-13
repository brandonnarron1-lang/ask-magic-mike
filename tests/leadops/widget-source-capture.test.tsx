import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WidgetApp } from "../../app/components/black-diamond/WidgetApp";
vi.mock("../../app/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("../../app/lib/publicIntakeCapability", () => ({ usePublicIntakeCapability: () => "live" }));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: false, addListener() {}, removeListener() {} }) });
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  vi.spyOn(window.parent, "postMessage").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });

describe("actual widget components retain explicit URL claims without third-party storage", () => {
  for (const placement of ["synthetic-home", "synthetic-rentals"]) {
    for (const tab of ["value", "ask", "sell"] as const) {
      it(`${placement}: ${tab} submission preserves independent surface/source/medium/parent/placement`, async () => {
        const parent = `https://parent.example.test/${placement}/`;
        const params = new URLSearchParams({ utm_source: "synthetic-parent", utm_medium: "owned_media", utm_campaign: "website_widget", utm_content: placement, placement, parent_url: parent });
        window.history.replaceState({}, "", `/widget/v1?${params}`);
        const captures: Record<string, unknown>[] = [];
        vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
          if (String(url) === "/api/chat/message") return new Response(JSON.stringify({ message: "SYNTHETIC ANSWER — NO CONSUMER" }), { headers: { "Content-Type": "application/json" } });
          if (String(url) !== "/api/leads") throw new Error("unexpected_local_request");
          captures.push(JSON.parse(String(init?.body)));
          return new Response(JSON.stringify({ message: "SYNTHETIC SAVE ONLY", lead_id: "00000000-0000-4000-8000-000000000301", session_id: captures.at(-1)!.idempotency_key, correlation_id: "00000000-0000-4000-8000-000000000302" }), { headers: { "Content-Type": "application/json", "X-AMM-Correlation-Id": "00000000-0000-4000-8000-000000000302" } });
        }));
        const user = userEvent.setup();
        render(<WidgetApp />);
        if (tab === "value") {
          await user.type(screen.getByLabelText("Property address"), "1 Synthetic Fixture Road");
          await user.click(screen.getByRole("button", { name: "Continue" }));
          await user.type(screen.getByLabelText("Your name"), "INTERNAL QA DO NOT CONTACT");
          await user.type(screen.getByLabelText("Email for your valuation follow-up"), "synthetic@example.test");
          await user.click(screen.getByRole("checkbox", { name: /I agree that Our Town Properties/ }));
          await user.click(screen.getByRole("button", { name: "Request Valuation" }));
        } else if (tab === "sell") {
          await user.click(screen.getByRole("tab", { name: "Selling Options" }));
          await user.type(screen.getByLabelText("Property address"), "1 Synthetic Fixture Road");
          await user.type(screen.getByLabelText("Phone required"), "2025550199");
          await user.click(screen.getByRole("checkbox", { name: /I agree that Our Town Properties/ }));
          await user.click(screen.getByRole("button", { name: "Send Seller Details" }));
        } else {
          await user.click(screen.getByRole("tab", { name: "Ask a Question" }));
          await user.type(screen.getByLabelText(/Your real estate question/), "Synthetic timing question");
          await user.click(screen.getByRole("button", { name: "Send Question" }));
          await screen.findByText("SYNTHETIC ANSWER — NO CONSUMER");
          await user.type(screen.getByLabelText("Email"), "synthetic@example.test");
          await user.click(screen.getByRole("checkbox", { name: /I agree that Our Town Properties/ }));
          await user.click(screen.getByRole("button", { name: "Request local follow-up" }));
        }
        await waitFor(() => expect(captures).toHaveLength(1));
        expect(captures[0].lead_source_surface).toBe("widget");
        // HomeValueFunnel intentionally sends widget; the canonical handler
        // normalizes widget -> home_value. A tab is not a retained tab field.
        expect(captures[0].funnel_type).toBe(tab === "value" ? "widget" : tab === "ask" ? "chat" : "seller");
        expect(captures[0].attribution).toMatchObject({ source: "synthetic-parent", medium: "owned_media", campaign: "website_widget", content: placement, placement, parent_url: parent, first_touch: { source: "synthetic-parent" }, last_touch: { source: "synthetic-parent" } });
      });
    }
  }
});
