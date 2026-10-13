import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BuyerIntentSection } from "../../app/components/black-diamond/BuyerIntentSection";
import { clearPendingHomeValueRequest, readPendingHomeValueRequest } from "../../app/lib/homeValuePendingRequest";
import { PUBLIC_LEAD_SAVED_MESSAGE } from "../../app/lib/publicLeadReceipt";

const fixture = vi.hoisted(() => ({ mode: "live" as "live" | "checking" | "read_only" | "synthetic_qa" }));
vi.mock("../../app/lib/publicIntakeCapability", () => ({ usePublicIntakeCapability: () => fixture.mode }));
const NAME = "SYNTHETIC FIXTURE | INTERNAL QA | DO NOT CONTACT";
const EMAIL = "buyer-fixture@example.test";
const PHONE = "+12025550194";
const CORRELATION = "00000000-0000-4000-8000-000000000611";
const LEAD = "00000000-0000-4000-8000-000000000612";
type Call = { body: string; key: string };
let calls: Call[];
let ledger: Record<string, unknown>[];
let analytics: string[];
let listener: (event: Event) => void;
let previousUrl: string;
let previousTitle: string;

function response(call: Call, status = 200, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ lead_id: LEAD, session_id: call.key, correlation_id: CORRELATION, ...extra }), {
    status, headers: { "Content-Type": "application/json", "X-AMM-Correlation-Id": CORRELATION, ...headers },
  });
}
function transport(reply: (call: Call, index: number, init: RequestInit) => Promise<Response> | Response = call => response(call)) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/events") {
      ledger.push(JSON.parse(String(init?.body)));
      return Promise.resolve(new Response(null, { status: 202 }));
    }
    expect(url).toBe("/api/leads"); // No real network, lookup, or other provider request.
    const call = { body: String(init?.body), key: new Headers(init?.headers).get("Idempotency-Key")! };
    calls.push(call);
    return Promise.resolve(reply(call, calls.length, init!));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
function fillBuyer() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: NAME } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: EMAIL } });
  fireEvent.change(screen.getByLabelText("Property address (or provide a listing URL)"), { target: { value: "101 Synthetic Fixture Road, Wilson NC" } });
}
function review() { fireEvent.click(screen.getByRole("button", { name: "Review request" })); }
function send(label = "Request Buyer Plan") { fireEvent.click(screen.getByRole("button", { name: label })); }

beforeEach(() => {
  previousUrl = window.location.pathname + window.location.search + window.location.hash;
  previousTitle = document.title;
  const pending = readPendingHomeValueRequest();
  if (pending) clearPendingHomeValueRequest(pending.key);
  window.sessionStorage.clear();
  fixture.mode = "live"; calls = []; ledger = []; analytics = [];
  listener = event => analytics.push(String((event as CustomEvent).detail?.event));
  window.addEventListener("askmagicmike:event", listener);
  vi.stubGlobal("matchMedia", () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => {
  cleanup(); window.removeEventListener("askmagicmike:event", listener);
  const pending = readPendingHomeValueRequest();
  if (pending) clearPendingHomeValueRequest(pending.key);
  window.sessionStorage.clear();
  window.history.replaceState({}, "", previousUrl); document.title = previousTitle;
  vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers();
});

describe("buyer-family native review and durable receipt integrity (intercepted UI only)", () => {
  it("keeps both native interest radio labels at the 44px minimum touch-target utility", () => {
    transport(); render(<BuyerIntentSection />);
    for (const name of ["A specific property", "A general home search"]) {
      const radio = screen.getByRole("radio", { name });
      expect(radio.closest("label")).toHaveClass("min-h-11", "cursor-pointer");
    }
  });

  it("accepts widget/embed defaults from its caller on a no-query widget with storage denied", async () => {
    window.history.replaceState({}, "", "/widget/v1");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    transport(); render(<BuyerIntentSection surface="widget" attributionOverrides={{ source: "widget", medium: "embed", placement: "sitewide-floating" }} />);
    fillBuyer(); review(); expect(calls).toHaveLength(0); send(); await screen.findByText("Your request is in.");
    expect(JSON.parse(calls[0].body)).toMatchObject({ funnel_type: "buyer", lead_source_surface: "widget", attribution: {
      source: "widget", medium: "embed", placement: "sitewide-floating",
      first_touch: { source: "widget", medium: "embed" }, last_touch: { source: "widget", medium: "embed" },
    } });
  });

  it("retains caller-supplied parent identity/title instead of the iframe title with storage denied", async () => {
    window.history.replaceState({}, "", "/widget/v1"); document.title = "SYNTHETIC IFRAME TITLE";
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    const overrides = { source: "ourtownproperties", medium: "owned_media", parent_url: "https://parent.example.test/synthetic/", embed_host: "parent.example.test", page_title: "SYNTHETIC PARENT TITLE", placement: "owned-seller-buyer-launch", property_id: "synthetic-property-17" };
    transport(); render(<BuyerIntentSection surface="widget" attributionOverrides={overrides} />);
    fillBuyer(); review(); send(); await screen.findByText("Your request is in.");
    const payload = JSON.parse(calls[0].body);
    expect(payload.attribution).toMatchObject({ ...overrides, first_touch: overrides, last_touch: overrides });
    expect(payload.attribution.page_title).not.toBe(document.title);
    expect(payload.buyer_interest).toMatchObject({ kind: "specific", properties: [{ address_text: "101 Synthetic Fixture Road, Wilson NC" }] });
    expect(payload).not.toHaveProperty("property_id"); // Attribution is not submitted property identity.
  });

  it("preserves standalone URL attribution when no override prop is supplied", async () => {
    window.history.replaceState({}, "", "/buy?utm_source=facebook&utm_medium=organic_social&utm_campaign=launch&utm_content=buyer_feed&placement=buyer_sidebar&property_id=synthetic-source-property");
    transport(); render(<BuyerIntentSection />); fillBuyer(); review(); send(); await screen.findByText("Your request is in.");
    expect(JSON.parse(calls[0].body).attribution).toMatchObject({ source: "facebook", medium: "organic_social", campaign: "launch", content: "buyer_feed", placement: "buyer_sidebar", property_id: "synthetic-source-property" });
  });

  it("explains either-or contact and focuses a recoverable inline error", async () => {
    const user = userEvent.setup(); transport(); render(<BuyerIntentSection />);
    const email = screen.getByLabelText("Email"); const phone = screen.getByLabelText("Phone");
    expect(screen.getByLabelText("Timeline (optional)")).toHaveValue("");
    expect(screen.getByText(/Email or phone is required for follow-up/i)).toBeVisible();
    expect(email).toHaveAttribute("aria-describedby", "buyer-contact-requirement");
    expect(phone).toHaveAttribute("aria-describedby", "buyer-contact-requirement");
    review();
    expect(screen.getByRole("alert")).toHaveTextContent("Add an email or phone number so Mike can follow up.");
    expect(email).toHaveAttribute("aria-invalid", "true"); expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveFocus(); expect(calls).toHaveLength(0);
    review(); expect(email).toHaveFocus(); expect(calls).toHaveLength(0);
    await user.type(phone, PHONE);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute("aria-invalid"); expect(phone).not.toHaveAttribute("aria-invalid");
  });

  it("retains renter fields and optional name while suppressing replay lead-created analytics", async () => {
    transport(call => response(call, 200, {}, { "X-AMM-Idempotent-Replay": "1" }));
    render(<BuyerIntentSection surface="renter_page" preset="renter" />);
    expect(screen.getByLabelText("Financing context (optional)")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: PHONE } });
    fireEvent.change(screen.getByLabelText("Target area"), { target: { value: "Wilson" } });
    fireEvent.change(screen.getByLabelText("Timeline (optional)"), { target: { value: "3-6 months" } });
    fireEvent.change(screen.getByLabelText("Financing context (optional)"), { target: { value: "Cash" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /preapproval or lender conversation/i }));
    review(); expect(calls).toHaveLength(0); send("Request Renter Review");
    expect(await screen.findByText(PUBLIC_LEAD_SAVED_MESSAGE)).toBeVisible();
    expect(JSON.parse(calls[0].body)).toMatchObject({ funnel_type: "renter", lead_type: "renter", lead_source_surface: "renter_page", name: "", email: "", phone: PHONE, target_geography: "Wilson", timeline: "3-6 months", financing: "Cash", preapproval: true });
    expect(JSON.parse(calls[0].body)).not.toHaveProperty("buyer_interest");
    expect(analytics).toContain("funnel_started"); expect(analytics).toContain("contact_submitted"); expect(analytics).not.toContain("lead_created");
    expect(screen.getByRole("button", { name: "Request a conversation" })).toBeVisible();
  });

  it("retains open-house identity, default location, source and genuine receipt CTA path", async () => {
    transport(); render(<BuyerIntentSection preset="open_house" surface="open_house" propertyId="synthetic-property-17" propertyLabel="Synthetic Open House" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: EMAIL } });
    review(); send("Register for Open House");
    await screen.findByRole("heading", { name: "Your request is in." });
    expect(JSON.parse(calls[0].body)).toMatchObject({ funnel_type: "open_house", lead_type: "open_house", lead_source_surface: "open_house", target_geography: "Synthetic Open House", property_id: "synthetic-property-17", attribution: { placement: "open-house-registration", placement_id: "open-house:synthetic-property-17", property_id: "synthetic-property-17" } });
    expect(screen.getByRole("button", { name: "Request a conversation" })).toBeVisible();
  });

  it("requires an explicit native review and emits one privacy-safe new buyer conversion", async () => {
    transport(); render(<BuyerIntentSection />); fillBuyer();
    fireEvent.click(screen.getByRole("checkbox", { name: /Our Town Properties may contact me/i }));
    review();
    expect(calls).toHaveLength(0); expect(screen.getByRole("heading", { name: "Review your request" })).toHaveFocus();
    expect(screen.getByText("Email: " + EMAIL)).toBeVisible(); send();
    const heading = await screen.findByRole("heading", { name: "Your request is in." });
    expect(heading).toHaveFocus(); expect(screen.getByText(CORRELATION)).toBeVisible();
    expect(analytics.filter(name => name === "lead_created")).toHaveLength(1);
    const payload = JSON.parse(calls[0].body);
    expect(payload).toMatchObject({ buyer_interest: { version: 1, kind: "specific", properties: [{ address_text: "101 Synthetic Fixture Road, Wilson NC" }] }, name: NAME, email: EMAIL, consent: true, consent_email: true, consent_call: false });
    for (const field of ["address", "target_geography", "timeline", "financing", "preapproval", "status", "assigned_agent_id"]) expect(payload).not.toHaveProperty(field);
    expect(payload.idempotency_key).toBe(calls[0].key); expect(payload.widget_session_id).toBe(calls[0].key);
    expect(ledger.every(event => event.session_id === calls[0].key)).toBe(true);
    expect(ledger.map(event => event.event_name)).toContain("thank_you_viewed");
    expect(ledger.map(event => event.event_name)).not.toContain("lead_created");
    expect(JSON.stringify(ledger)).not.toContain(EMAIL); expect(JSON.stringify(ledger)).not.toContain("101 Synthetic");
    expect(screen.queryByRole("button", { name: "Request a conversation" })).not.toBeInTheDocument();
  });

  it("stores a URL-only property reference with optional unit/reference and no fetch", async () => {
    transport(); render(<BuyerIntentSection />); fillBuyer();
    fireEvent.change(screen.getByLabelText("Property address (or provide a listing URL)"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Listing URL (or provide an address)"), { target: { value: "https://listing.example.test/home/17" } });
    fireEvent.change(screen.getByLabelText("Unit or apartment (optional)"), { target: { value: "Unit 4" } });
    fireEvent.change(screen.getByLabelText("Listing reference (optional)"), { target: { value: "SYNTHETIC-17" } });
    review(); send(); await screen.findByText("Your request is in.");
    expect(JSON.parse(calls[0].body).buyer_interest).toEqual({ version: 1, kind: "specific", properties: [{ listing_url: "https://listing.example.test/home/17", unit: "Unit 4", reference: "SYNTHETIC-17" }] });
  });

  it("captures general desired area/budget, retaining top-level timeframe/question without residential address", async () => {
    transport(); render(<BuyerIntentSection />); fillBuyer();
    fireEvent.click(screen.getByRole("radio", { name: "A general home search" }));
    fireEvent.change(screen.getByLabelText("Desired area"), { target: { value: "Wilson and Elm City" } });
    fireEvent.change(screen.getByLabelText("Budget range (optional)"), { target: { value: "Approx. 250–350k" } });
    fireEvent.change(screen.getByLabelText("Timeline (optional)"), { target: { value: "Just planning" } });
    fireEvent.change(screen.getByLabelText("What would be most helpful?"), { target: { value: "A practical search plan." } });
    review(); send(); await screen.findByText("Your request is in.");
    const payload = JSON.parse(calls[0].body);
    expect(payload).toMatchObject({ buyer_interest: { version: 1, kind: "search", desired_area: "Wilson and Elm City", budget_range: "Approx. 250–350k" }, timeline: "Just planning", question: "A practical search plan." });
    expect(payload).not.toHaveProperty("address"); expect(payload).not.toHaveProperty("target_geography");
    expect(JSON.stringify(payload.buyer_interest)).not.toContain("101 Synthetic");
  });

  it("supports phone-only in intercepted LIVE mode with no implicit email permission", async () => {
    transport(); render(<BuyerIntentSection />); fillBuyer();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: PHONE } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Our Town Properties may contact me/i }));
    review(); expect(screen.getByText("Phone: " + PHONE)).toBeVisible(); send(); await screen.findByText("Your request is in.");
    expect(JSON.parse(calls[0].body)).toMatchObject({ email: "", phone: PHONE, consent: true, consent_email: false, consent_call: true });
  });

  it.each(["name", "interest", "email", "phone", "url"])("rejects invalid %s locally, without a POST", invalid => {
    transport(); render(<BuyerIntentSection />); fillBuyer();
    if (invalid === "name") fireEvent.change(screen.getByLabelText("Name"), { target: { value: "" } });
    if (invalid === "interest") fireEvent.change(screen.getByLabelText("Property address (or provide a listing URL)"), { target: { value: "" } });
    if (invalid === "email") fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    if (invalid === "phone") fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "252" } });
    if (invalid === "url") fireEvent.change(screen.getByLabelText("Listing URL (or provide an address)"), { target: { value: "javascript:alert(1)" } });
    review(); expect(screen.getByRole("alert")).toBeVisible(); expect(calls).toHaveLength(0);
  });

  it("retains native values across path switches, capability rerenders and Edit review", () => {
    transport(); const view = render(<BuyerIntentSection />); fillBuyer();
    const phone = screen.getByLabelText("Phone") as HTMLInputElement;
    phone.value = PHONE;
    fireEvent.click(screen.getByRole("radio", { name: "A general home search" }));
    fireEvent.change(screen.getByLabelText("Desired area"), { target: { value: "Wilson" } });
    fireEvent.click(screen.getByRole("radio", { name: "A specific property" }));
    fixture.mode = "checking"; view.rerender(<BuyerIntentSection />);
    expect(phone).toHaveValue(PHONE); expect(screen.getByRole("button", { name: "Review request" })).toBeDisabled();
    fixture.mode = "live"; view.rerender(<BuyerIntentSection />);
    review(); expect(screen.getByText("Phone: " + PHONE)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Edit request" }));
    expect(screen.getByLabelText("Email")).toHaveValue(EMAIL); expect(phone).toHaveValue(PHONE);
    expect(screen.getByLabelText("Property address (or provide a listing URL)")).toHaveValue("101 Synthetic Fixture Road, Wilson NC");
    expect(calls).toHaveLength(0);
  });

  it("requires a fresh review for eventless contact and consent changes before confirmation", async () => {
    transport(); render(<BuyerIntentSection />); fillBuyer(); review();
    (screen.getByLabelText("Email") as HTMLInputElement).value = "eventless@example.test";
    (screen.getByLabelText("Phone") as HTMLInputElement).value = PHONE;
    (screen.getByRole("checkbox", { name: /Our Town Properties may contact me/i }) as HTMLInputElement).checked = true;
    send(); expect(calls).toHaveLength(0);
    expect(screen.getByRole("alert")).toHaveTextContent("Your details changed");
    expect(screen.getByText("Email: eventless@example.test")).toBeVisible();
    send(); await screen.findByText("Your request is in.");
    expect(JSON.parse(calls[0].body)).toMatchObject({ email: "eventless@example.test", phone: PHONE, consent: true, consent_email: true, consent_call: true });
  });

  it("suppresses immediate double-submit and keeps the native payload frozen during a late receipt", async () => {
    let settle!: (reply: Response) => void; transport(() => new Promise(resolve => { settle = resolve; }));
    render(<BuyerIntentSection />); fillBuyer(); review();
    const form = screen.getByLabelText("Email").closest("form")!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); }); expect(calls).toHaveLength(1);
    expect(analytics.filter(name => name === "contact_submitted")).toHaveLength(1);
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(readPendingHomeValueRequest()?.key).toBe(calls[0].key);
    await act(async () => settle(response(calls[0])));
    expect(await screen.findByText("Your request is in.")).toBeVisible();
    expect(readPendingHomeValueRequest()).toBeNull();
  });

  it.each(["missing identifiers", "wrong session", "non-JSON", "server failure"])("keeps %s UNCONFIRMED with exact same-key manual replay", async reason => {
    transport((call, index) => index > 1 ? response(call, 200, {}, { "X-AMM-Idempotent-Replay": "1" }) :
      reason === "missing identifiers" ? new Response(JSON.stringify({ message: "saved" }), { headers: { "Content-Type": "application/json" } }) :
      reason === "wrong session" ? response(call, 200, { session_id: CORRELATION }) :
      reason === "non-JSON" ? new Response("<html>OK</html>", { headers: { "Content-Type": "text/html" } }) : response(call, 500, { error: "PRIVATE RAW ERROR" }));
    render(<BuyerIntentSection />); fillBuyer(); review(); send();
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't confirm");
    expect(screen.getByLabelText("Email")).toHaveValue(EMAIL); expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.queryByText("PRIVATE RAW ERROR")).not.toBeInTheDocument(); expect(analytics).not.toContain("lead_created");
    (screen.getByLabelText("Email") as HTMLInputElement).value = "must-not-replace-frozen@example.test";
    fireEvent.click(screen.getByRole("button", { name: "Retry identical request" }));
    await screen.findByText("Your request is in.");
    expect(calls[1]).toEqual(calls[0]); expect(analytics).not.toContain("lead_created");
    expect(ledger.map(event => event.event_name)).toContain("lead_submit_failed");
    expect(ledger.every(event => event.session_id === calls[0].key)).toBe(true);
    expect(JSON.stringify(ledger)).not.toContain(EMAIL);
  });

  it("restores only an unresolved reference after remount and blocks a fresh request", async () => {
    transport(call => response(call, 500)); const view = render(<BuyerIntentSection />); fillBuyer(); review(); send();
    await screen.findByRole("alert"); const key = calls[0].key;
    view.unmount(); render(<BuyerIntentSection />);
    expect(screen.getByRole("alert")).toHaveTextContent("private form details were not stored");
    expect(screen.getByText(key)).toBeVisible(); expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Retry identical request" })).not.toBeInTheDocument();
    expect(JSON.stringify(window.sessionStorage)).not.toContain(EMAIL); expect(calls).toHaveLength(1);
  });

  it("retains uncertainty after timeout, never automatically retrying or creating a new reference", async () => {
    vi.useFakeTimers();
    transport((call, index, init) => index === 1 ? new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }) : response(call, 200, {}, { "X-AMM-Idempotent-Replay": "1" }));
    render(<BuyerIntentSection />); fillBuyer(); review(); send();
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't confirm"); expect(calls).toHaveLength(1);
    expect(readPendingHomeValueRequest()?.key).toBe(calls[0].key);
    fireEvent.click(screen.getByRole("button", { name: "Retry identical request" }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText("Your request is in.")).toBeVisible(); expect(calls[1]).toEqual(calls[0]);
  });

  it("truthfully warns when session storage is denied and retains only the volatile same-key guard", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    transport((call, index) => index === 1 ? response(call, 500) : response(call, 200, {}, { "X-AMM-Idempotent-Replay": "1" }));
    render(<BuyerIntentSection />); fillBuyer(); review(); send();
    expect(await screen.findByRole("alert")).toHaveTextContent("could not retain the reference across a reload");
    expect(readPendingHomeValueRequest()?.key).toBe(calls[0].key); expect(window.sessionStorage.length).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Retry identical request" })); await screen.findByText("Your request is in.");
    expect(calls[1]).toEqual(calls[0]); expect(readPendingHomeValueRequest()).toBeNull();
  });

  it("does not turn the canonical honeypot 202 into a saved receipt, retry or conversion", async () => {
    transport(() => new Response(JSON.stringify({ message: "Got it.", correlation_id: CORRELATION }), {
      status: 202, headers: { "Content-Type": "application/json", "X-AMM-Correlation-Id": CORRELATION },
    }));
    render(<BuyerIntentSection />); fillBuyer(); review(); send(); await screen.findByRole("alert");
    expect(screen.queryByText("Your request is in.")).not.toBeInTheDocument(); expect(analytics).not.toContain("lead_created");
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Retry identical request" })).not.toBeInTheDocument();
  });

  it("blocks conflicts without a new key, retry or saved claim", async () => {
    transport(call => response(call, 409, { code: "idempotency_conflict" })); render(<BuyerIntentSection />); fillBuyer(); review(); send();
    expect(await screen.findByRole("alert")).toHaveTextContent("conflicts with an existing request");
    expect(screen.queryByRole("button", { name: "Retry identical request" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeDisabled(); expect(readPendingHomeValueRequest()?.key).toBe(calls[0].key);
  });

  it("allows edit after a proven precommit refusal, retaining the same reference", async () => {
    transport((call, index) => index === 1 ? response(call, 400, { code: "invalid_lead_payload", error: "Enter a valid email address." }) : response(call));
    render(<BuyerIntentSection />); fillBuyer(); review(); send();
    await screen.findByRole("alert"); expect(screen.getByLabelText("Email")).toBeEnabled(); expect(readPendingHomeValueRequest()).toBeNull();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "corrected@example.test" } }); review(); send();
    await screen.findByText("Your request is in.");
    expect(calls[1].key).toBe(calls[0].key); expect(JSON.parse(calls[1].body).email).toBe("corrected@example.test");
  });

  it("honors the server cooldown before identical manual retry", async () => {
    vi.useFakeTimers(); transport((call, index) => index === 1 ? response(call, 429, { code: "rate_limited" }, { "Retry-After": "2" }) : response(call));
    render(<BuyerIntentSection />); fillBuyer(); review(); send(); await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("button", { name: "Retry identical request" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Wait 2 seconds");
    await act(async () => { vi.advanceTimersByTime(2000); });
    fireEvent.click(screen.getByRole("button", { name: "Retry identical request" }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText("Your request is in.")).toBeVisible(); expect(calls[1]).toEqual(calls[0]);
  });

  it("ignores a stale response after pagehide and permits only identical manual retry", async () => {
    let settle!: (reply: Response) => void;
    transport((call, index) => index === 1 ? new Promise(resolve => { settle = resolve; }) : response(call, 200, {}, { "X-AMM-Idempotent-Replay": "1" }));
    render(<BuyerIntentSection />); fillBuyer(); review(); send();
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't confirm");
    await act(async () => settle(response(calls[0])));
    expect(screen.queryByText("Your request is in.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry identical request" })); await screen.findByText("Your request is in.");
    expect(calls[1]).toEqual(calls[0]); expect(analytics).not.toContain("lead_created");
  });

  it("does not advance or emit conversion for a late response after unmount", async () => {
    let settle!: (reply: Response) => void; transport(() => new Promise(resolve => { settle = resolve; }));
    const view = render(<BuyerIntentSection />); fillBuyer(); review(); send(); view.unmount();
    await act(async () => settle(response(calls[0])));
    expect(analytics).not.toContain("lead_created"); expect(readPendingHomeValueRequest()?.key).toBe(calls[0].key);
  });

  it("does not report a duplicate-of receipt as a new lead-created event", async () => {
    transport(call => response(call, 200, { duplicate_of_lead_id: CORRELATION }));
    render(<BuyerIntentSection />); fillBuyer(); review(); send(); await screen.findByText("Your request is in.");
    expect(analytics).not.toContain("lead_created");
  });

  it("fails closed in read-only mode without any capture", () => {
    fixture.mode = "read_only"; transport(); render(<BuyerIntentSection />); fillBuyer(); review();
    expect(screen.getByRole("alert")).toHaveTextContent("Entries here are not saved"); expect(calls).toHaveLength(0);
  });

  it("preserves synthetic-QA email markers and rejects unmarked or phone-only inputs", async () => {
    fixture.mode = "synthetic_qa"; transport(); render(<BuyerIntentSection />); fillBuyer();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "SYNTHETIC FIXTURE — NOT A CONSUMER" } });
    review(); expect(screen.getByRole("alert")).toHaveTextContent("Synthetic QA only"); expect(calls).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: NAME } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: PHONE } });
    review(); expect(screen.getByRole("alert")).toHaveTextContent("Synthetic QA only"); expect(calls).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: EMAIL } });
    review(); send(); await waitFor(() => expect(calls).toHaveLength(1)); await screen.findByText("Your request is in.");
    expect(screen.queryByRole("button", { name: "Request a conversation" })).not.toBeInTheDocument();
  });
});
