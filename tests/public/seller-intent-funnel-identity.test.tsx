import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SellerIntentSection } from "../../app/components/black-diamond/SellerIntentSection";
import { WidgetApp } from "../../app/components/black-diamond/WidgetApp";
import { clearPendingHomeValueRequest, readPendingHomeValueRequest } from "../../app/lib/homeValuePendingRequest";
import { PUBLIC_LEAD_SAVED_MESSAGE, PUBLIC_LEAD_UNCONFIRMED_MESSAGE } from "../../app/lib/publicLeadReceipt";

const fixture = vi.hoisted(() => ({ mode: "live" as "live" | "checking" | "read_only" | "synthetic_qa" }));
vi.mock("../../app/lib/publicIntakeCapability", () => ({ usePublicIntakeCapability: () => fixture.mode }));
const LEAD = "00000000-0000-4000-8000-000000000721";
const CORRELATION = "00000000-0000-4000-8000-000000000722";
const NAME = "INTERNAL QA | DO NOT CONTACT | SYNTHETIC SELLER";
const EMAIL = "seller-fixture@example.test";
const ADDRESS = "123 Synthetic Fixture Road, Wilson NC";
const PHONE = "2525550194";
type LeadCall = { key: string; body: string };
let leadCalls: LeadCall[];
let previousUrl: string;

function jsonResponse(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    "Content-Type": "application/json", "X-AMM-Correlation-Id": CORRELATION, ...headers,
  } });
}
function savedResponse(call: LeadCall, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return jsonResponse({ lead_id: LEAD, session_id: call.key, correlation_id: CORRELATION, ...extra }, 200, headers);
}
function transport(reply: (call: LeadCall, index: number, init: RequestInit) => Response | Promise<Response> = call => savedResponse(call)) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/events") return Promise.resolve(new Response(null, { status: 202 }));
    if (url === "/api/address-suggestions" && (!init?.method || init.method === "GET")) return Promise.resolve(jsonResponse({ enabled: false }));
    if (url !== "/api/leads") throw new Error("unexpected_local_request");
    const call = { key: new Headers(init?.headers).get("Idempotency-Key")!, body: String(init?.body) };
    leadCalls.push(call);
    return Promise.resolve(reply(call, leadCalls.length, init!));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
function fillSeller(name = NAME) {
  fireEvent.change(screen.getByLabelText("Property address"), { target: { value: ADDRESS } });
  fireEvent.change(screen.getByLabelText("Name optional"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Phone required"), { target: { value: PHONE } });
}
function send() { fireEvent.click(screen.getByRole("button", { name: "Send Seller Details" })); }
function clearPending() { const pending = readPendingHomeValueRequest(); if (pending) clearPendingHomeValueRequest(pending.key); }

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
  previousUrl = window.location.pathname + window.location.search + window.location.hash;
  clearPending();
  window.sessionStorage.clear();
  fixture.mode = "live";
  leadCalls = [];
});

afterEach(() => {
  cleanup();
  clearPending();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", previousUrl);
});

describe("seller funnel identity integrity", () => {
  it("links every canonical client event to the seller submission and narrows channel consent", async () => {
    const user = userEvent.setup();
    const fetchMock = transport();
    render(<SellerIntentSection />);

    expect(screen.getByLabelText("Condition (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Timeline (optional)")).toHaveValue("");
    await user.type(screen.getByLabelText("Property address"), "123 Internal QA Road, Wilson NC");
    await user.type(screen.getByLabelText("Phone required"), "2525550194");
    await user.click(screen.getByRole("checkbox", { name: /Our Town Properties may contact me/i }));
    await user.click(screen.getByRole("button", { name: "Send Seller Details" }));

    expect(await screen.findByText(PUBLIC_LEAD_SAVED_MESSAGE)).toBeVisible();
    const leadCall = fetchMock.mock.calls.find(([input]) => String(input) === "/api/leads");
    const leadPayload = JSON.parse(String(leadCall?.[1]?.body)) as Record<string, unknown>;
    expect(leadPayload.consent_call).toBe(true);
    expect(leadPayload.consent_email).toBe(false);
    expect(leadPayload).not.toHaveProperty("condition");
    expect(leadPayload).not.toHaveProperty("timeline");
    expect(typeof leadPayload.idempotency_key).toBe("string");
    expect(screen.getByLabelText("Property address")).toHaveValue("123 Internal QA Road, Wilson NC");
    expect(screen.getByLabelText("Phone required")).toHaveValue(PHONE);
    expect(screen.getByLabelText("Phone required")).toBeDisabled();
    expect(readPendingHomeValueRequest()).toBeNull();

    const events = analyticsBodies(fetchMock);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.session_id === leadPayload.idempotency_key)).toBe(true);
    expect(events.map((event) => event.event_name)).toContain("thank_you_viewed");
    expect(events.map((event) => event.event_name)).not.toContain("lead_created");
  });

  it("keeps a failed seller request recoverable and records one linked privacy-safe failure", async () => {
    const user = userEvent.setup();
    const fetchMock = transport(() => jsonResponse({ error: "SYNTHETIC private storage failure" }, 500));
    render(<SellerIntentSection />);

    await user.type(screen.getByLabelText("Property address"), "456 Internal QA Lane, Wilson NC");
    await user.type(screen.getByLabelText("Phone required"), "2525550194");
    await user.selectOptions(screen.getByLabelText("Condition (optional)"), "Needs major repairs");
    await user.selectOptions(screen.getByLabelText("Timeline (optional)"), "30-60 days");
    await user.click(screen.getByRole("button", { name: "Send Seller Details" }));

    expect(await screen.findByRole("status")).toHaveTextContent(PUBLIC_LEAD_UNCONFIRMED_MESSAGE);
    expect(screen.getByRole("status")).not.toHaveTextContent("SYNTHETIC private storage failure");
    expect(screen.getByLabelText("Property address")).toHaveValue("456 Internal QA Lane, Wilson NC");
    expect(screen.getByLabelText("Condition (optional)")).toHaveValue("Needs major repairs");
    expect(screen.getByLabelText("Timeline (optional)")).toHaveValue("30-60 days");
    expect(screen.getByRole("button", { name: "Retry identical request" })).toBeEnabled();
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
    expect(events.map((event) => event.event_name)).not.toContain("thank_you_viewed");
  });

  for (const kind of ["bare_202", "missing_ids", "invalid_ids", "wrong_session", "wrong_correlation"] as const) {
    it(`${kind}: never reports saved, resets fields, or invents an appointment`, async () => {
      transport(call => {
        if (kind === "bare_202") return jsonResponse({ message: "Got it." }, 202, { "X-AMM-Correlation-Id": "" });
        if (kind === "missing_ids") return jsonResponse({ message: "Synthetic acceptance only" });
        if (kind === "invalid_ids") return savedResponse(call, { lead_id: "qa-seller-lead" });
        if (kind === "wrong_session") return savedResponse(call, { session_id: LEAD });
        return savedResponse(call, {}, { "X-AMM-Correlation-Id": LEAD });
      });
      render(<SellerIntentSection />); fillSeller(); send();
      expect(await screen.findByRole("status")).toHaveTextContent(PUBLIC_LEAD_UNCONFIRMED_MESSAGE);
      expect(screen.queryByText(PUBLIC_LEAD_SAVED_MESSAGE)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Request a conversation" })).not.toBeInTheDocument();
      expect(screen.getByLabelText("Property address")).toHaveValue(ADDRESS);
      expect(screen.getByLabelText("Name optional")).toHaveValue(NAME);
      expect(screen.getByLabelText("Phone required")).toBeDisabled();
      expect(readPendingHomeValueRequest()?.key).toBe(leadCalls[0].key);
      expect(leadCalls).toHaveLength(1);
    });
  }

  it("canonical honeypot 202 is blocked rather than a saved receipt or retry permission", async () => {
    const fetchMock = transport(() => jsonResponse({ message: "Got it.", correlation_id: CORRELATION }, 202));
    render(<SellerIntentSection />); fillSeller(); send();
    await waitFor(() => expect(analyticsBodies(fetchMock).filter(event => event.event_name === "lead_submit_failed")).toHaveLength(1));
    expect(screen.queryByText(PUBLIC_LEAD_SAVED_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry identical request" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request a conversation" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Phone required")).toBeDisabled();
    expect(readPendingHomeValueRequest()?.key).toBe(leadCalls[0].key);
    expect(analyticsBodies(fetchMock).map(event => event.event_name)).not.toContain("thank_you_viewed");
  });

  it("a lost response keeps native contact, optional fields, consent and exact same-key bytes for manual replay", async () => {
    const fetchMock = transport((call, index) => {
      if (index === 1) throw new TypeError("SYNTHETIC lost response");
      return savedResponse(call, {}, { "X-AMM-Idempotent-Replay": "1" });
    });
    render(<SellerIntentSection />); fillSeller();
    fireEvent.change(screen.getByLabelText("Email optional"), { target: { value: EMAIL } });
    fireEvent.change(screen.getByLabelText("Condition (optional)"), { target: { value: "Needs major repairs" } });
    fireEvent.change(screen.getByLabelText("Timeline (optional)"), { target: { value: "30-60 days" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "SYNTHETIC private fixture context" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Our Town Properties may contact me/i }));
    send();
    const retry = await screen.findByRole("button", { name: "Retry identical request" });
    expect(leadCalls).toHaveLength(1);
    const payload = JSON.parse(leadCalls[0].body);
    expect(payload).toMatchObject({ address: ADDRESS, name: NAME, email: EMAIL, phone: PHONE,
      condition: "Needs major repairs", timeline: "30-60 days", notes: "SYNTHETIC private fixture context",
      consent: true, consent_email: true, consent_call: true, status: "new", assigned_agent_id: null,
      idempotency_key: leadCalls[0].key, widget_session_id: leadCalls[0].key,
    });
    expect(Object.keys(JSON.parse(window.sessionStorage.getItem("amm_home_value_pending_request_v1")!)).sort()).toEqual(["at", "key", "version"]);
    // Even an eventless native mutation cannot change the frozen retry body.
    (screen.getByLabelText("Phone required") as HTMLInputElement).value = "2025550199";
    fireEvent.click(retry);
    expect(await screen.findByText(PUBLIC_LEAD_SAVED_MESSAGE)).toBeVisible();
    expect(leadCalls).toHaveLength(2);
    expect(leadCalls[1]).toEqual(leadCalls[0]);
    expect(readPendingHomeValueRequest()).toBeNull();
    expect(analyticsBodies(fetchMock).filter(event => event.event_name === "contact_submitted")).toHaveLength(1);
    expect(analyticsBodies(fetchMock).filter(event => event.event_name === "thank_you_viewed")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Request a conversation" })).not.toBeInTheDocument();
  });

  it("preserves eventless native values and uses a genuine saved receipt for the shared appointment CTA", async () => {
    const fetchMock = transport();
    render(<SellerIntentSection />); fillSeller("SYNTHETIC FIXTURE — NOT A CONSUMER");
    (screen.getByLabelText("Name optional") as HTMLInputElement).value = "SYNTHETIC native fixture";
    (screen.getByLabelText("Email optional") as HTMLInputElement).value = EMAIL;
    (screen.getByRole("checkbox", { name: /Our Town Properties may contact me/i }) as HTMLInputElement).checked = true;
    send(); await screen.findByText(PUBLIC_LEAD_SAVED_MESSAGE);
    expect(JSON.parse(leadCalls[0].body)).toMatchObject({ name: "SYNTHETIC native fixture", email: EMAIL, consent: true, consent_email: true, consent_call: true });
    expect(screen.getByLabelText("Name optional")).toHaveValue("SYNTHETIC native fixture");
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/events") return Promise.resolve(new Response(null, { status: 202 }));
      expect(String(input)).toBe("/api/appointments/request");
      expect(JSON.parse(String(init?.body))).toEqual({ lead_id: LEAD, session_id: leadCalls[0].key, request_surface: "seller_page" });
      return Promise.resolve(jsonResponse({ status: "requested" }));
    });
    fireEvent.click(screen.getByRole("button", { name: "Request a conversation" }));
    expect(await screen.findByText("Your appointment request has been received.")).toBeVisible();
  });

  for (const marker of ["INTERNAL QA", "DO NOT CONTACT"] as const) {
    it(`saved ${marker} notes suppress appointment UI without changing the classifier or payload`, async () => {
      transport(); render(<SellerIntentSection />); fillSeller("SYNTHETIC FIXTURE");
      fireEvent.change(screen.getByLabelText("Notes"), { target: { value: `SYNTHETIC ${marker}` } });
      send(); await screen.findByText(PUBLIC_LEAD_SAVED_MESSAGE);
      expect(JSON.parse(leadCalls[0].body).notes).toBe(`SYNTHETIC ${marker}`);
      expect(JSON.parse(leadCalls[0].body)).not.toHaveProperty("is_test");
      expect(screen.queryByRole("button", { name: "Request a conversation" })).not.toBeInTheDocument();
    });
  }

  for (const mode of ["checking", "read_only", "synthetic_qa"] as const) {
    it(`${mode}: cannot submit an unmarked seller request`, async () => {
      fixture.mode = mode; transport(); render(<SellerIntentSection />); fillSeller("SYNTHETIC FIXTURE"); send();
      expect(leadCalls).toHaveLength(0);
      expect(readPendingHomeValueRequest()).toBeNull();
      if (mode === "checking") expect(screen.getByRole("button", { name: "Send Seller Details" })).toBeDisabled();
      else expect(screen.getByRole("status")).toHaveTextContent(mode === "synthetic_qa" ? "Synthetic QA only" : "Preview only");
    });
  }

  it("synthetic QA accepts only the existing marked name and example.test email boundary", async () => {
    fixture.mode = "synthetic_qa"; transport(); render(<SellerIntentSection />); fillSeller();
    send(); expect(leadCalls).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Email optional"), { target: { value: EMAIL } });
    send(); await screen.findByText(PUBLIC_LEAD_SAVED_MESSAGE);
    expect(leadCalls).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Request a conversation" })).not.toBeInTheDocument();
  });

  it("only a correlated precommit validation refusal unlocks edits without losing native fields or rotating the key", async () => {
    transport((call, index) => index === 1
      ? jsonResponse({ code: "invalid_lead_payload", error: "Enter a valid phone number.", correlation_id: CORRELATION }, 400)
      : savedResponse(call));
    render(<SellerIntentSection />); fillSeller(); send();
    expect(await screen.findByRole("status")).toHaveTextContent("Enter a valid phone number.");
    expect(screen.getByLabelText("Property address")).toHaveValue(ADDRESS);
    expect(screen.getByLabelText("Phone required")).toBeEnabled();
    expect(readPendingHomeValueRequest()).toBeNull();
    fireEvent.change(screen.getByLabelText("Phone required"), { target: { value: "2025550199" } });
    send(); await screen.findByText(PUBLIC_LEAD_SAVED_MESSAGE);
    expect(leadCalls[1].key).toBe(leadCalls[0].key);
    expect(JSON.parse(leadCalls[1].body).phone).toBe("2025550199");
  });

  it("409 remains blocked with retained fields and no blind retry", async () => {
    transport(() => jsonResponse({ code: "idempotency_conflict", correlation_id: CORRELATION }, 409));
    render(<SellerIntentSection />); fillSeller(); send();
    expect(await screen.findByRole("status")).toHaveTextContent("conflicts with an existing request");
    expect(screen.getByLabelText("Property address")).toHaveValue(ADDRESS);
    expect(screen.getByLabelText("Phone required")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Retry identical request" })).not.toBeInTheDocument();
    expect(readPendingHomeValueRequest()?.key).toBe(leadCalls[0].key);
  });

  it("429 honors the supplied cooldown and replays only the frozen bytes", async () => {
    vi.useFakeTimers();
    transport((call, index) => index === 1
      ? jsonResponse({ code: "rate_limited", correlation_id: CORRELATION }, 429, { "Retry-After": "2" })
      : savedResponse(call, {}, { "X-AMM-Idempotent-Replay": "1" }));
    render(<SellerIntentSection />); fillSeller();
    await act(async () => { send(); });
    const retry = screen.getByRole("button", { name: "Retry identical request" });
    expect(retry).toBeDisabled(); fireEvent.click(retry); expect(leadCalls).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(retry).toBeEnabled();
    await act(async () => { fireEvent.click(retry); });
    expect(screen.getByText(PUBLIC_LEAD_SAVED_MESSAGE)).toBeVisible();
    expect(leadCalls[1]).toEqual(leadCalls[0]);
  });

  it("a remount retains only an unresolved reference, not a new key, private payload or replay permission", async () => {
    transport(() => { throw new TypeError("SYNTHETIC lost response"); });
    const mounted = render(<SellerIntentSection />); fillSeller(); send();
    await screen.findByRole("button", { name: "Retry identical request" });
    const key = leadCalls[0].key; mounted.unmount(); render(<SellerIntentSection />);
    expect(screen.getByRole("status")).toHaveTextContent("private form details were not stored");
    expect(screen.getByRole("status")).toHaveTextContent(key);
    expect(screen.getByLabelText("Property address")).toHaveValue("");
    expect(screen.getByLabelText("Phone required")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Retry identical request" })).not.toBeInTheDocument();
    send(); expect(leadCalls).toHaveLength(1);
  });

  for (const storageDenied of [false, true]) {
    it(`actual widget keeps pending seller mounted and blocks every tab direction/fallback${storageDenied ? " with storage denied" : ""}`, async () => {
      window.history.replaceState({}, "", "/widget/v1");
      if (storageDenied) {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
      }
      let rejectFirst!: (reason: unknown) => void;
      transport((call, index) => index === 1 ? new Promise<Response>((_resolve, reject) => { rejectFirst = reject; }) : savedResponse(call, {}, { "X-AMM-Idempotent-Replay": "1" }));
      render(<WidgetApp />); const user = userEvent.setup();
      const sellerTab = screen.getByRole("tab", { name: "Selling Options" });
      await user.click(sellerTab); fillSeller();
      const form = screen.getByLabelText("Phone required").closest("form")!;
      // Two synchronous submits must neither bypass the guard nor duplicate telemetry.
      fireEvent.submit(form); fireEvent.submit(form);
      expect(leadCalls).toHaveLength(1);
      expect(readPendingHomeValueRequest()?.key).toBe(leadCalls[0].key);
      for (const name of ["Get My Home Value", "Find a Home", "Ask a Question"]) {
        const tab = screen.getByRole("tab", { name }); expect(tab).toBeDisabled();
        fireEvent.click(tab); expect(sellerTab).toHaveAttribute("aria-selected", "true");
      }
      for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
        fireEvent.keyDown(sellerTab, { key }); expect(sellerTab).toHaveAttribute("aria-selected", "true");
      }
      expect(screen.queryByRole("link", { name: "Open full form" })).not.toBeInTheDocument();
      await act(async () => { rejectFirst(new TypeError("SYNTHETIC lost response")); });
      expect(screen.getByLabelText("Property address")).toHaveValue(ADDRESS);
      expect(screen.getByLabelText("Name optional")).toHaveValue(NAME);
      const retry = screen.getByRole("button", { name: "Retry identical request" });
      if (storageDenied) expect(screen.getByText(/could not retain the reference across a reload/)).toBeVisible();
      fireEvent.click(retry); await screen.findByText(PUBLIC_LEAD_SAVED_MESSAGE);
      expect(leadCalls).toHaveLength(2); expect(leadCalls[1]).toEqual(leadCalls[0]);
      expect(readPendingHomeValueRequest()).toBeNull();
      expect(screen.getByRole("tab", { name: "Find a Home" })).toBeEnabled();
      expect(screen.getByRole("link", { name: "Open full form" })).toBeVisible();
    });
  }
});
