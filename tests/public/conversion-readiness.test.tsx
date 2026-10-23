import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeValueExperimentExperience } from "../../app/components/black-diamond/HomeValueExperimentExperience";
import { HomeValueFunnel } from "../../app/components/black-diamond/HomeValueFunnel";
import { readPublicIntakeReadiness, usePublicIntakeReadiness } from "../../app/lib/publicIntakeCapability";
import { clearPendingHomeValueRequest, readPendingHomeValueRequest, rememberPendingHomeValueRequest } from "../../app/lib/homeValuePendingRequest";

vi.mock("../../app/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("../../app/lib/growth/public-experiment-client", () => ({ recordExperimentEvent: vi.fn().mockResolvedValue(null) }));
vi.mock("../../app/lib/widgetMessaging", () => ({ postToWidgetParent: vi.fn() }));
const health = (mode: string) => new Response(JSON.stringify({ ok: true, service: "ask-magic-mike", public_intake: mode }), { headers: { "Content-Type": "application/json" } });
const leadCalls: Array<{ body: string; key: string }> = [];
let availability: () => Promise<Response>;
function transport() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/health/live") return availability();
    if (url === "/api/address-suggestions") return Promise.resolve(new Response('{"enabled":false}', { headers: { "Content-Type": "application/json" } }));
    expect(url).toBe("/api/leads");
    leadCalls.push({ body: String(init?.body), key: new Headers(init?.headers).get("Idempotency-Key")! });
    return Promise.reject(new Error("synthetic lost response"));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
function clearPending() { const prior = readPendingHomeValueRequest(); if (prior) clearPendingHomeValueRequest(prior.key); }
beforeEach(() => {
  clearPending(); window.sessionStorage.clear(); leadCalls.length = 0;
  availability = () => Promise.resolve(health("live"));
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); clearPending(); window.sessionStorage.clear(); });

async function contact() {
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Property address"), { target: { value: "101 Synthetic Fixture Road, Wilson NC" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "INTERNAL QA DO NOT CONTACT — Readiness Fixture" } });
  fireEvent.change(screen.getByLabelText("Email for your valuation follow-up"), { target: { value: "readiness@example.test" } });
}

describe("truthful readiness and GET-only recovery", () => {
  it.each([null, {}, { ok: true, service: "ask-magic-mike" }, { ok: false, service: "ask-magic-mike", public_intake: "read_only" }])("does not call unverified health read-only (%#)", value => {
    expect(readPublicIntakeReadiness(value)).toBe("unknown");
  });
  it("recognizes an explicit read-only attestation", () => {
    expect(readPublicIntakeReadiness({ ok: true, service: "ask-magic-mike", public_intake: "read_only" })).toBe("read_only");
  });
  it("has one real funnel-owned check and one notice, including when the experiment rerenders", async () => {
    const fetchMock = transport(); const view = render(<HomeValueExperimentExperience />);
    await waitFor(() => expect(view.container.querySelector('[data-intake-mode="live"]')).toBeInTheDocument());
    view.rerender(<HomeValueExperimentExperience />);
    expect(view.container.querySelectorAll("[data-intake-mode]")).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/health/live")).toHaveLength(1);
  });
  it("aborts old checks and ignores late live results after an explicit retry", async () => {
    const settle: Array<(response: Response) => void> = [];
    const fetchMock = vi.fn(() => new Promise<Response>(resolve => settle.push(resolve)));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePublicIntakeReadiness());
    const firstSignal = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>)[0][1].signal!;
    act(() => result.current.recheck());
    expect(firstSignal.aborted).toBe(true);
    await act(async () => settle[1](health("read_only")));
    await act(async () => settle[0](health("live")));
    expect(result.current.mode).toBe("read_only");
  });
  it("times out to unknown, not read-only, and ignores a late response", async () => {
    vi.useFakeTimers(); let settle!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { settle = resolve; })));
    const { result } = renderHook(() => usePublicIntakeReadiness());
    await act(async () => vi.advanceTimersByTime(8000));
    expect(result.current.mode).toBe("unknown");
    await act(async () => settle(health("live")));
    expect(result.current.mode).toBe("unknown");
  });
  it("keeps eventless native values mounted through unknown -> retry -> live and blocks POST", async () => {
    const fetchMock = transport(); const view = render(<HomeValueFunnel />); await contact();
    const email = screen.getByLabelText("Email for your valuation follow-up") as HTMLInputElement;
    email.value = "eventless@example.test";
    availability = () => Promise.reject(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "Check availability again" }));
    await waitFor(() => expect(view.container.querySelector('[data-intake-mode="unknown"]')).toBeInTheDocument());
    expect(email).toBe(screen.getByLabelText("Email for your valuation follow-up"));
    expect(email).toHaveValue("eventless@example.test");
    expect(screen.getByRole("button", { name: "Saving unavailable" })).toBeDisabled();
    fireEvent.submit(email.closest("form")!);
    expect(leadCalls).toHaveLength(0);
    availability = () => Promise.resolve(health("live"));
    fireEvent.click(screen.getByRole("button", { name: "Check availability again" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Request Valuation" })).toBeEnabled());
    expect(email).toHaveValue("eventless@example.test");
    for (const [, init] of fetchMock.mock.calls.filter(([url]) => url === "/api/health/live")) {
      expect(init).toMatchObject({ method: "GET", redirect: "error", referrerPolicy: "no-referrer" });
      expect(init).not.toHaveProperty("body");
    }
  });
  it("does not clear a restored unresolved reference or unlock its controls on health retry", async () => {
    const key = "00000000-0000-4000-8000-000000000991";
    rememberPendingHomeValueRequest(key); transport(); render(<HomeValueFunnel />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Check availability again" })).toBeEnabled());
    const before = readPendingHomeValueRequest();
    fireEvent.click(screen.getByRole("button", { name: "Check availability again" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Check availability again" })).toBeEnabled());
    expect(readPendingHomeValueRequest()).toEqual(before);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByText(key)).toBeVisible(); expect(leadCalls).toHaveLength(0);
  });
  it("preserves frozen body/key and contact lock with blocked storage and an unknown result", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked storage"); });
    transport(); render(<HomeValueFunnel surface="widget" />); await contact();
    fireEvent.click(screen.getByRole("button", { name: "Request Valuation" }));
    await screen.findByText(/could not retain the recovery reference across a reload/);
    const reference = readPendingHomeValueRequest(); expect(reference?.key).toBe(leadCalls[0].key);
    availability = () => Promise.reject(new Error("unknown capability"));
    fireEvent.click(screen.getByRole("button", { name: "Check availability again" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry identical request" })).toBeDisabled());
    expect(screen.getByLabelText("Your name")).toBeDisabled(); expect(leadCalls).toHaveLength(1);
    availability = () => Promise.resolve(health("live"));
    fireEvent.click(screen.getByRole("button", { name: "Check availability again" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry identical request" })).toBeEnabled());
    expect(readPendingHomeValueRequest()).toEqual(reference);
    fireEvent.click(screen.getByRole("button", { name: "Retry identical request" }));
    await waitFor(() => expect(leadCalls).toHaveLength(2));
    expect(leadCalls[1]).toEqual(leadCalls[0]);
  });
});
