import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddressEntry } from "../../app/components/black-diamond/AddressEntry";
const accept = vi.fn(); const submit = vi.fn();
const components = { line1: "101 Synthetic Fixture Road", line2: "", locality: "Wilson", region: "NC", postalCode: "27893", country: "US" };
const result = { id: "synthetic_1", label: "101 Synthetic Fixture Road, Wilson, NC 27893", components };
const suggestion = { id: result.id, label: "101 Synthetic Fixture Road", secondary: "Wilson, NC 27893", token: "signed_fixture_only" };
let calls: Array<Record<string, unknown>>;
const json = (value: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } }));
function transport(handler: (input: Record<string, unknown>) => Promise<Response> = input => json(input.operation === "suggest" ? { state: "results", suggestions: [suggestion] } : { state: "resolved", result }), enabled = true) {
  vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => { if (!init?.body) return json({ enabled }); const input = JSON.parse(String(init.body)); calls.push(input); return handler(input); }));
}
function Fixture() { const ref = useRef<HTMLInputElement>(null); return <form onSubmit={event => { event.preventDefault(); submit(); }}><AddressEntry inputRef={ref} value={null} initialText="" disabled={false} onChange={() => {}} onAccept={accept} /><button>Continue</button></form>; }
async function type(query = "101 Synthetic Fixture Rd Apt 4") {
  render(<Fixture />); await act(async () => { await Promise.resolve(); });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: query } });
  await act(async () => { vi.advanceTimersByTime(260); await Promise.resolve(); });
}
async function select() {
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
  await act(async () => { fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" }); await Promise.resolve(); });
}
beforeEach(() => { vi.useFakeTimers(); calls = []; accept.mockClear(); submit.mockClear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("manual-selection address entry", () => {
  it("disabled lookup offers only usable manual fields, no fabricated list", async () => {
    transport(undefined, false); await type(); expect(calls).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Enter / edit address manually" }));
    expect(screen.getByLabelText("Street address")).toBeVisible(); expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("keyboard selection does not submit and correction is explicit; unit survives a building result", async () => {
    transport(); await type(); expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
    await select(); expect(submit).not.toHaveBeenCalled(); expect(accept).not.toHaveBeenCalled();
    expect(screen.getByText("Suggested:").parentElement).toHaveTextContent("Apt 4");
    fireEvent.click(screen.getByRole("button", { name: "Use suggested address" }));
    expect(accept).toHaveBeenCalledWith(expect.objectContaining({ enteredText: "101 Synthetic Fixture Rd Apt 4", confirmation: "user_confirmed_suggestion", validation: "not_performed", components: { ...components, line2: "Apt 4" } }));
    expect(screen.getByLabelText("Unit / apartment (if applicable)")).toHaveValue("Apt 4");
    expect(calls.every(call => Object.keys(call).every(key => ["operation", "query", "sessionToken", "candidateToken"].includes(key)))).toBe(true);
  });
  it("keeps original, dismisses Escape/Tab and never chooses first option on blur", async () => {
    transport(); await type(); fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" }); expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" }); fireEvent.keyDown(screen.getByRole("combobox"), { key: "Tab" });
    expect(accept).not.toHaveBeenCalled(); fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" }); await select();
    fireEvent.click(screen.getByRole("button", { name: "Keep my entry" })); expect(screen.getByRole("combobox")).toHaveValue("101 Synthetic Fixture Rd Apt 4"); expect(accept).not.toHaveBeenCalled();
  });
  it.each(["no_results", "unavailable", "rate_limited"])("%s preserves entered text and manual continuation", async state => {
    transport(() => json({ state })); await type(); expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("combobox")).toHaveValue("101 Synthetic Fixture Rd Apt 4");
    fireEvent.click(screen.getByRole("button", { name: "Enter / edit address manually" })); expect(screen.getByLabelText("Street address")).toBeVisible();
  });
  it("failed detail lookup applies nothing", async () => {
    transport(input => input.operation === "resolve" ? Promise.reject(new Error("offline")) : json({ state: "results", suggestions: [suggestion] }));
    await type(); await select(); expect(accept).not.toHaveBeenCalled(); expect(screen.getByRole("combobox")).toHaveValue("101 Synthetic Fixture Rd Apt 4");
    expect(screen.getByRole("status")).toHaveTextContent("unchanged");
  });
  it("ignores delayed results after a later query and detail response after editing", async () => {
    let release!: (value: Response) => void;
    transport(() => new Promise(resolve => { release = resolve; })); await type();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "555 Different Synthetic Property" } });
    await act(async () => release(new Response(JSON.stringify({ state: "results", suggestions: [suggestion] }))));
    expect(screen.queryByRole("listbox")).toBeNull(); expect(screen.getByRole("combobox")).toHaveValue("555 Different Synthetic Property");
  });
});
