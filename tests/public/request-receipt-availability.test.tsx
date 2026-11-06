import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadConsentField } from "../../app/components/black-diamond/LeadConsentField";
import { readRequestReceiptAvailability, usePublicIntakeReadiness } from "../../app/lib/publicIntakeCapability";

const health = (available: unknown = true, mode = "live") => ({ ok: true, service: "ask-magic-mike", public_intake: mode, request_receipts_available: available });
const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("honest receipt choice", () => {
  it("defaults unavailable without hiding manual contact permission or blocking the form", () => {
    render(<form><LeadConsentField /><button>Save request</button></form>);
    expect(screen.queryByRole("checkbox", { name: /Email me a receipt/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Email receipts are currently unavailable/)).toBeVisible();
    expect(screen.getByRole("checkbox", { name: /I agree that Our Town Properties/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save request" })).toBeEnabled();
    expect(new FormData(screen.getByRole("button").closest("form")!).has("receipt_email_requested")).toBe(false);
  });
  it("keeps the exact optional purpose unchecked and separate only when explicitly available", () => {
    const view = render(<form><LeadConsentField receiptAvailable /><button>Save</button></form>);
    const choice = screen.getByRole("checkbox", { name: /Email me a receipt/ });
    expect(choice).not.toBeChecked(); fireEvent.click(choice); expect(choice).toBeChecked();
    view.rerender(<form><LeadConsentField receiptAvailable={false} receiptDefaultChecked /><button>Save</button></form>);
    expect(screen.queryByRole("checkbox", { name: /Email me a receipt/ })).not.toBeInTheDocument();
    expect(new FormData(screen.getByRole("button").closest("form")!).has("receipt_email_requested")).toBe(false);
  });
  it.each([null, {}, { ...health(), ok: false }, { ...health(), service: "other" }, health("true"), health(true, "read_only"), health(true, "synthetic_qa")])("fails closed for unknown/legacy/invalid/nonlive capability (%#)", value => {
    expect(readRequestReceiptAvailability(value)).toBe(false);
  });
  it("uses the existing single health GET and clears availability on app return, refusing stale data", async () => {
    let finish!: (r: Response) => void;
    const fetchMock = vi.fn().mockResolvedValueOnce(response(health())).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePublicIntakeReadiness());
    expect(result.current.receiptAvailable).toBe(false);
    await waitFor(() => expect(result.current.receiptAvailable).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    act(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
    expect(result.current.receiptAvailable).toBe(false);
    await act(async () => finish(response(health(false))));
    expect(result.current.mode).toBe("live"); expect(result.current.receiptAvailable).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
