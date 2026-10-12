import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeValueFunnel } from "../../app/components/black-diamond/HomeValueFunnel";
import { clearPendingHomeValueRequest, readPendingHomeValueRequest } from "../../app/lib/homeValuePendingRequest";

const fixture = vi.hoisted(() => ({ mode: "live" as "live" | "checking" | "read_only" | "synthetic_qa", events: vi.fn() }));
vi.mock("../../app/lib/publicIntakeCapability", () => ({ usePublicIntakeCapability: () => fixture.mode }));
vi.mock("../../app/lib/analytics", () => ({ trackEvent: fixture.events }));
vi.mock("../../app/lib/widgetMessaging", () => ({ postToWidgetParent: vi.fn() }));
const correlation = "00000000-0000-4000-8000-000000000401";
const lead = "00000000-0000-4000-8000-000000000402";
type Call = { body: string; key: string };
let calls: Call[];
function response(call: Call, status = 200, extra: Record<string, unknown> = {}, headers: Record<string,string> = {}) {
  return new Response(JSON.stringify({ lead_id: lead, session_id: call.key, correlation_id: correlation, ...extra }), {
    status, headers: { "Content-Type": "application/json", "X-AMM-Correlation-Id": correlation, ...headers },
  });
}
function transport(handler: (call: Call, index: number) => Promise<Response> | Response) {
  vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit) => {
    expect(url).toBe("/api/leads");
    const call = { body: String(init.body), key: new Headers(init.headers).get("Idempotency-Key")! };
    calls.push(call);
    return handler(call, calls.length);
  }));
}
async function contact(phone = "") {
  render(<HomeValueFunnel />);
  fireEvent.change(screen.getByLabelText("Property address"), { target: { value: "101 Synthetic Fixture Road, Wilson NC" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByLabelText("Your name");
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "SYNTHETIC OWNER | INTERNAL QA | DO NOT CONTACT" } });
  fireEvent.change(screen.getByLabelText("Email for your valuation follow-up"), { target: { value: "fixture@example.test" } });
  fireEvent.change(screen.getByLabelText("Phone (optional)"), { target: { value: phone } });
}
function submit() { fireEvent.click(screen.getByRole("button", { name: "Request Valuation" })); }
beforeEach(() => {
  const pending = readPendingHomeValueRequest();
  if (pending) clearPendingHomeValueRequest(pending.key);
  window.sessionStorage.clear();
  fixture.mode = "live"; fixture.events.mockClear(); calls = [];
  vi.stubGlobal("matchMedia", () => ({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
});
afterEach(() => {
  cleanup();
  const pending = readPendingHomeValueRequest();
  if (pending) clearPendingHomeValueRequest(pending.key);
  window.sessionStorage.clear();
  vi.unstubAllGlobals(); vi.useRealTimers();
});

describe("Home Value logical-request integrity", () => {
  it("requires real identifiers and focuses an accurate saved receipt without promising a valuation or booking", async () => {
    transport(call => response(call));
    await contact("+12025550199"); submit();
    const heading = await screen.findByRole("heading", { name: "Your request is in." });
    expect(heading).toHaveFocus();
    expect(screen.getByText(correlation)).toBeVisible();
    expect(calls).toHaveLength(1);
    const body = JSON.parse(calls[0].body);
    expect(body).toMatchObject({phone:"+12025550199",consent:false,consent_email:false,consent_call:false});
    expect(screen.queryByRole("button", { name: "Request a conversation" })).not.toBeInTheDocument();
    expect(JSON.stringify(fixture.events.mock.calls)).not.toContain("fixture@example.test");
    expect(JSON.stringify(fixture.events.mock.calls)).not.toContain("101 Synthetic");
  });

  it.each([
    ["missing identifiers", () => new Response(JSON.stringify({message:"saved"}), {headers:{"Content-Type":"application/json"}})],
    ["non-JSON success", () => new Response("<html>OK</html>", {headers:{"Content-Type":"text/html"}})],
    ["malformed JSON", () => new Response("{bad", {headers:{"Content-Type":"application/json"}})],
  ])("%s is UNCONFIRMED, not a saved or editable new request", async (_name, reply) => {
    transport(() => reply()); await contact(); submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't confirm");
    expect(screen.queryByRole("heading", {name:"Your request is in."})).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email for your valuation follow-up")).toBeDisabled();
    expect(screen.getByLabelText("Email for your valuation follow-up")).toHaveValue("fixture@example.test");
    expect(screen.getByRole("button", {name:"Edit address"})).toBeDisabled();
    expect(calls).toHaveLength(1);
  });

  it("rejects a structurally valid receipt for another session", async () => {
    transport(call => response(call,200,{session_id:"00000000-0000-4000-8000-000000000403"}));
    await contact(); submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't confirm");
    expect(screen.queryByText("Your request is in.")).not.toBeInTheDocument();
  });

  it("blocks double tap and Enter-plus-tap immediately, before React rerenders", async () => {
    let settle!: (r: Response)=>void;
    transport(()=>new Promise(resolve=>{settle=resolve;}));
    await contact();
    const form = screen.getByLabelText("Your name").closest("form")!;
    const button = screen.getByRole("button", {name:"Request Valuation"});
    fireEvent.submit(form); fireEvent.submit(form); fireEvent.click(button);
    expect(calls).toHaveLength(1);
    expect(screen.getByRole("button",{name:"Submitting"})).toBeDisabled();
    await act(async()=>settle(response(calls[0])));
    expect(await screen.findByText("Your request is in.")).toBeVisible();
  });

  it("reads native autofill values that did not emit React changes", async () => {
    transport(call=>response(call)); await contact();
    (screen.getByLabelText("Email for your valuation follow-up") as HTMLInputElement).value="  autofilled@example.test  ";
    (screen.getByLabelText("Phone (optional)") as HTMLInputElement).value="+12025550188";
    submit(); await screen.findByText("Your request is in.");
    expect(JSON.parse(calls[0].body)).toMatchObject({email:"autofilled@example.test",phone:"+12025550188"});
  });

  it("distinguishes omitted phone from invalid phone without discarding a supplied value", async () => {
    transport(call=>response(call)); await contact("252"); submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("area code");
    expect(calls).toHaveLength(0);
    expect(screen.getByLabelText("Phone (optional)")).toHaveValue("252");
    fireEvent.change(screen.getByLabelText("Phone (optional)"), {target:{value:""}});
    submit(); await screen.findByText("Your request is in.");
    expect(JSON.parse(calls[0].body).phone).toBe("");
  });

  it("retains contact values, timeline and deliberate consent while editing the address", async () => {
    await contact("+12025550199");
    fireEvent.click(screen.getByRole("checkbox"));
    const timeline = screen.getByLabelText("Timeline") as HTMLSelectElement;
    const selected = timeline.options[timeline.options.length-1].value;
    fireEvent.change(timeline,{target:{value:selected}});
    fireEvent.click(screen.getByRole("button",{name:"Edit address"}));
    expect(screen.getByLabelText("Property address")).toHaveValue("101 Synthetic Fixture Road, Wilson NC");
    fireEvent.change(screen.getByLabelText("Property address"),{target:{value:"102 Synthetic Fixture Road, Wilson NC"}});
    fireEvent.click(screen.getByRole("button",{name:"Continue"}));
    expect(screen.getByLabelText("Phone (optional)")).toHaveValue("+12025550199");
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByLabelText("Timeline")).toHaveValue(selected);
    expect(screen.getByText("102 Synthetic Fixture Road, Wilson NC")).toBeVisible();
    expect(calls).toHaveLength(0);
  });

  it("keeps a conflicting key frozen for operator reconciliation", async () => {
    transport(call=>response(call,409,{code:"idempotency_conflict",error:"untrusted"}));
    await contact(); submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("conflicts with an existing request");
    expect(screen.getByLabelText("Your name")).toBeDisabled();
    expect(screen.queryByRole("button",{name:"Retry identical request"})).not.toBeInTheDocument();
    expect(calls).toHaveLength(1);
  });

  it("uses actual Retry-After guidance without automatic retries", async () => {
    transport(call=>response(call,429,{code:"rate_limited"},{"Retry-After":"60"}));
    await contact(); submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");
    expect(screen.getByRole("button",{name:"Retry identical request"})).toBeDisabled();
    expect(screen.getByText(/Wait \d+ seconds/)).toBeVisible();
    expect(screen.getByLabelText("Your name")).toBeDisabled();
    expect(calls).toHaveLength(1);
  });

  it("retries uncertainty only with identical bytes/key and honors the real replay header", async () => {
    transport((call,index)=>index===1?Promise.reject(new Error("synthetic-sensitive-diagnostic")):response(call,200,{}, {"X-AMM-Idempotent-Replay":"1"}));
    await contact("+12025550199"); submit();
    expect(await screen.findByRole("alert")).not.toHaveTextContent("synthetic-sensitive-diagnostic");
    expect(calls).toHaveLength(1);
    fireEvent.click(screen.getByRole("button",{name:"Retry identical request"}));
    await screen.findByText("Your request is in.");
    expect(calls).toHaveLength(2); expect(calls[1]).toEqual(calls[0]);
    expect(fixture.events.mock.calls.some(([name])=>name==="lead_created")).toBe(false);
    expect(readPendingHomeValueRequest()).toBeNull();
  });

  it("restores only a pending reference after remount and blocks a fresh payload/key", async () => {
    transport(()=>Promise.reject(new Error("synthetic interruption")));
    await contact("+12025550199"); submit();
    await screen.findByRole("alert");
    const pending = readPendingHomeValueRequest();
    expect(pending?.key).toBe(calls[0].key);
    const stored = window.sessionStorage.getItem("amm_home_value_pending_request_v1")!;
    expect(Object.keys(JSON.parse(stored)).sort()).toEqual(["at","key","version"]);
    expect(stored).not.toContain("fixture@example.test");
    expect(stored).not.toContain("101 Synthetic");
    cleanup(); render(<HomeValueFunnel />);
    expect(await screen.findByRole("alert")).toHaveTextContent("private form details were not stored");
    expect(screen.getByLabelText("Property address")).toHaveValue("");
    expect(screen.getByLabelText("Property address")).toBeDisabled();
    expect(screen.getByRole("button",{name:"Continue"})).toBeDisabled();
    expect(screen.queryByRole("button",{name:"Retry identical request"})).not.toBeInTheDocument();
    expect(screen.getByText(pending!.key)).toBeVisible();
    expect(calls).toHaveLength(1);
  });

  it("clears a validated pre-commit rejection without treating it as saved", async () => {
    transport(call=>response(call,400,{code:"invalid_payload"}));
    await contact(); submit();
    await screen.findByRole("alert");
    expect(screen.queryByText("Your request is in.")).not.toBeInTheDocument();
    expect(readPendingHomeValueRequest()).toBeNull();
    expect(screen.getByLabelText("Your name")).toBeEnabled();
  });

  it("preserves a suspended in-flight key and ignores a stale success after bfcache lifecycle events", async () => {
    let settle!: (r:Response)=>void;
    transport(()=>new Promise(resolve=>{settle=resolve;})); await contact(); submit();
    act(()=>window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true})));
    act(()=>window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true})));
    expect(screen.getByRole("alert")).toHaveTextContent("Save not confirmed");
    await act(async()=>settle(response(calls[0])));
    expect(screen.queryByText("Your request is in.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toBeDisabled();
    expect(calls).toHaveLength(1);
    // Synthetic lifecycle dispatch is NOT evidence of a real browser bfcache hit.
  });

  it("read-only disclosure is early and the demo action never calls intake", async () => {
    fixture.mode="read_only"; await contact();
    expect(screen.getByRole("link",{name:"Open the live Home Value form"})).toHaveAttribute("href","https://www.askmagicmike.com/home-value");
    fireEvent.click(screen.getByRole("button",{name:"Review demo (not saved)"}));
    expect(screen.getByRole("alert")).toHaveTextContent("Entries here are not saved");
    expect(calls).toHaveLength(0);
    expect(screen.queryByText("Your request is in.")).not.toBeInTheDocument();
  });

  it("synthetic mode rejects personal contact input even with QA markers", async () => {
    fixture.mode="synthetic_qa"; await contact();
    fireEvent.change(screen.getByLabelText("Email for your valuation follow-up"),{target:{value:"not-a-fixture@example.com"}});
    submit(); expect(screen.getByRole("alert")).toHaveTextContent("example.test email");
    expect(calls).toHaveLength(0);
  });
});
