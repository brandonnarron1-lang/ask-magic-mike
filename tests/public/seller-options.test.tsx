import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SellerIntentSection } from "../../app/components/black-diamond/SellerIntentSection";
import SellPage from "../../app/sell/page";
import { PUBLIC_LEAD_SAVED_MESSAGE } from "../../app/lib/publicLeadReceipt";

const mode = vi.hoisted(() => ({ value: "live" }));
vi.mock("../../app/lib/publicIntakeCapability", () => ({ usePublicIntakeCapability: () => mode.value }));
vi.mock("next/navigation", () => ({ usePathname: () => "/sell" }));
const calls: Array<{ body: string; key: string }> = [];
let respond: (call: typeof calls[number]) => Response;
const id = "00000000-0000-4000-8000-000000000845";
function transport() {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === "/api/events") return new Response(null, { status: 202 });
    if (String(input) === "/api/address-suggestions") return Response.json({ enabled: false });
    if (String(input) !== "/api/leads") throw new Error("unexpected_synthetic_request");
    const call = { body: String(init?.body), key: new Headers(init?.headers).get("Idempotency-Key")! };
    calls.push(call); return respond(call);
  }));
}
function fill() {
  fireEvent.change(screen.getByLabelText("Property address"), { target: { value: "101 Synthetic Fixture Road, Unit B, Wilson NC" } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "INTERNAL QA — DO NOT CONTACT — SELLER OPTIONS" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "seller-options@example.test" } });
}
function send() { fireEvent.click(screen.getByRole("button", { name: "Send property review request" })); }
beforeEach(() => {
  sessionStorage.clear(); calls.length = 0; mode.value = "live";
  vi.stubGlobal("matchMedia", vi.fn((media: string) => ({ matches: false, media,
    addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  respond = call => Response.json({ lead_id: id, session_id: call.key, correlation_id: id }, { headers: { "X-AMM-Correlation-Id": id } });
  transport();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); sessionStorage.clear(); vi.restoreAllMocks(); });

describe("opt-in seller options without replacing accepted intake", () => {
  it("keeps absent configuration on the legacy seller contract", () => {
    render(<SellerIntentSection />);
    expect(screen.getByLabelText("Phone required")).toBeRequired();
    expect(screen.getByLabelText("Name optional")).not.toBeRequired();
    expect(screen.queryByRole("combobox", { name: "Selling goal" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Review property request" })).toBeNull();
  });

  it("requires a committed final review and accepts email-only with declined permission", async () => {
    render(<SellerIntentSection variant="options" initialOption="as-is" />); fill();
    expect(screen.getByRole("combobox", { name: "Selling goal" })).toHaveValue("as-is");
    fireEvent.click(screen.getByRole("button", { name: "Review property request" }));
    expect(calls).toHaveLength(0);
    expect(screen.getByRole("region", { name: "Review your property request" })).toHaveTextContent("101 Synthetic Fixture Road, Unit B");
    expect(screen.getByRole("region", { name: "Review your property request" })).toHaveTextContent("Permission declined");
    send(); await screen.findByText(PUBLIC_LEAD_SAVED_MESSAGE);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0].body)).toMatchObject({ funnel_type: "seller", lead_source_surface: "seller_page",
      name: "INTERNAL QA — DO NOT CONTACT — SELLER OPTIONS", email: "seller-options@example.test", phone: "",
      consent: false, consent_email: false, consent_call: false,
      address_entry: { validation: "not_performed", confirmation: "manual" },
      question: "Seller option requested: Consider an as-is/direct-purchase option." });
    expect(screen.queryByRole("button", { name: /request.*appointment/i })).toBeNull();
  });

  it("reads native autofill and manual unit/locality without needing React input events", async () => {
    render(<SellerIntentSection variant="options" initialOption="compare" />); fill();
    fireEvent.click(screen.getByRole("button", { name: "Enter / edit address manually" }));
    (screen.getByLabelText("Street address") as HTMLInputElement).value = "102 Synthetic Fixture Lane";
    (screen.getByLabelText("Unit / apartment (if applicable)") as HTMLInputElement).value = "Suite 2";
    (screen.getByLabelText("City / locality") as HTMLInputElement).value = "Wilson";
    (screen.getByLabelText("State / region") as HTMLInputElement).value = "NC";
    (screen.getByLabelText("ZIP / postal code") as HTMLInputElement).value = "27893";
    fireEvent.click(screen.getByRole("button", { name: "Review property request" }));
    (screen.getByLabelText("Email") as HTMLInputElement).value = "changed@example.test";
    send(); expect(calls).toHaveLength(0);
    expect(screen.getByRole("region", { name: "Review your property request" })).toHaveTextContent("changed@example.test");
    send(); await screen.findByText(PUBLIC_LEAD_SAVED_MESSAGE);
    expect(JSON.parse(calls[0].body)).toMatchObject({ email: "changed@example.test",
      address: "102 Synthetic Fixture Lane, Suite 2, Wilson, NC 27893",
      address_entry: { components: { line2: "Suite 2", locality: "Wilson", postalCode: "27893" } } });
  });

  it("never derives permission from a goal, rejects missing contacts and honors Preview", async () => {
    render(<SellerIntentSection variant="options" initialOption="guidance" />); fill();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Review property request" }));
    expect(await screen.findByText(/Add an email or phone/)).toBeVisible();
    expect(calls).toHaveLength(0);
    cleanup(); mode.value = "read_only";
    render(<SellerIntentSection variant="options" initialOption="guidance" />); fill();
    fireEvent.click(screen.getByRole("button", { name: "Review property request" }));
    expect(await screen.findByText(/Preview only/)).toBeVisible(); expect(calls).toHaveLength(0);
  });

  it("freezes purpose, consent, address and request key on an unknown outcome", async () => {
    respond = () => new Response("not a receipt", { status: 502 });
    render(<SellerIntentSection variant="options" initialOption="compare" />); fill();
    fireEvent.click(screen.getByRole("button", { name: "Review property request" })); send();
    await screen.findByRole("button", { name: "Retry identical request" });
    expect(screen.getByLabelText("Selling goal")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry identical request" }));
    await waitFor(() => expect(calls).toHaveLength(2)); expect(calls[1]).toEqual(calls[0]);
    expect(sessionStorage.getItem("amm-home-value-pending-v1") || "").not.toContain("seller-options@example.test");
  });

  it("only explicit allowlisted URL configuration activates the variant", async () => {
    const legacy = await SellPage({ searchParams: Promise.resolve({ seller_option: "untrusted-claim" }) });
    render(legacy); expect(screen.getByLabelText("Phone required")).toBeRequired(); cleanup();
    const options = await SellPage({ searchParams: Promise.resolve({ seller_option: "compare" }) });
    render(options); expect(screen.getByRole("combobox", { name: "Selling goal" })).toHaveValue("compare");
  });
});
