import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WidgetApp } from "../../app/components/black-diamond/WidgetApp";
import { clearPendingHomeValueRequest, readPendingHomeValueRequest } from "../../app/lib/homeValuePendingRequest";
vi.mock("../../app/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("../../app/lib/publicIntakeCapability", () => ({ usePublicIntakeCapability: () => "live" }));

beforeEach(() => {
  window.history.replaceState({}, "", "/widget/v1?utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=launch&utm_content=buyer_widget&parent_url=https%3A%2F%2Fwww.ourtownproperties.com%2Fsynthetic%2F");
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: false, addListener() {}, removeListener() {} }) });
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
});
afterEach(() => { cleanup(); const pending = readPendingHomeValueRequest(); if (pending) clearPendingHomeValueRequest(pending.key); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });

describe("additive buyer path in the actual versioned widget", () => {
  it("native keyboard selects the buyer, with a visible owned full-form fallback", async () => {
    render(<WidgetApp />);
    const user = userEvent.setup();
    screen.getByRole("tab", { name: "Home Value Review" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Buying Help" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Buying Help" })).toHaveAttribute("aria-selected", "true");
    const fallback = screen.getByRole("link", { name: "Open full form" });
    expect(new URL(fallback.getAttribute("href")!).pathname).toBe("/buy");
    expect(new URL(fallback.getAttribute("href")!).searchParams.get("utm_medium")).toBe("owned_media");
    expect(fallback.getAttribute("href")).not.toContain("parent_url");
  });
  it("keeps a lost-response buyer request mounted and blocks new tab/fallback captures even with storage denied", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => { if (String(url) !== "/api/leads") throw new Error("unexpected_local_request"); requests.push(String(init?.body)); throw new TypeError("SYNTHETIC lost response"); }));
    render(<WidgetApp />); const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Buying Help" }));
    await user.type(screen.getByLabelText("Property address (or provide a listing URL)"), "101 Synthetic Road");
    await user.type(screen.getByLabelText("Name"), "INTERNAL QA | DO NOT CONTACT | LOST RESPONSE");
    await user.type(screen.getByLabelText("Email"), "widget-lost@example.test");
    await user.click(screen.getByRole("button", { name: "Review request" }));
    await user.click(screen.getByRole("button", { name: "Request Buyer Plan" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry identical request" })).toBeVisible());
    expect(screen.getByRole("tab", { name: "Selling Options" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Home Value Review" })).toBeDisabled();
    await user.click(screen.getByRole("tab", { name: "Selling Options" }));
    expect(screen.getByRole("tab", { name: "Buying Help" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("link", { name: "Open full form" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send Seller Details" })).not.toBeInTheDocument();
    expect(requests).toHaveLength(1);
    expect(readPendingHomeValueRequest()?.key).toBe(JSON.parse(requests[0]).idempotency_key);
  });
  for (const kind of ["specific", "search"] as const) {
    it(`${kind}: frozen reviewed request retains widget source independently of buyer interest when storage is denied`, async () => {
      const captures: Record<string, unknown>[] = [];
      vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        if (String(url) !== "/api/leads") throw new Error("unexpected_local_request");
        const payload = JSON.parse(String(init?.body)); captures.push(payload);
        return new Response(JSON.stringify({ lead_id: "00000000-0000-4000-8000-000000000501", session_id: payload.idempotency_key, correlation_id: "00000000-0000-4000-8000-000000000502", message: "Synthetic save only" }), { headers: { "Content-Type": "application/json", "X-AMM-Correlation-Id": "00000000-0000-4000-8000-000000000502" } });
      }));
      render(<WidgetApp />); const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: "Buying Help" }));
      if (kind === "specific") await user.type(screen.getByLabelText("Property address (or provide a listing URL)"), "101 Synthetic Road | INTERNAL QA | DO NOT CONTACT");
      else { await user.click(screen.getByRole("radio", { name: "A general home search" })); await user.type(screen.getByLabelText("Desired area"), "Synthetic Wilson area"); }
      await user.type(screen.getByLabelText("Name"), "INTERNAL QA | DO NOT CONTACT | WIDGET");
      await user.type(screen.getByLabelText("Email"), "widget-launch@example.test");
      await user.click(screen.getByRole("button", { name: "Review request" }));
      expect(captures).toHaveLength(0);
      await user.click(screen.getByRole("button", { name: "Request Buyer Plan" }));
      await waitFor(() => expect(captures).toHaveLength(1));
      expect(captures[0]).toMatchObject({ funnel_type: "buyer", lead_source_surface: "widget", buyer_interest: { version: 1, kind }, consent: false, attribution: { source: "ourtownproperties", medium: "owned_media", content: "buyer_widget" } });
      expect(captures[0].target_geography).toBeUndefined();
      expect(await screen.findByText("Your request is in.")).toBeVisible();
      expect(screen.queryByRole("button", { name: /appointment/i })).not.toBeInTheDocument();
    });
  }
});
