import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../app/lib/analytics", () => ({ trackEvent: vi.fn() }));

import { AppointmentRequestCTA } from "../../app/components/black-diamond/AppointmentRequestCTA";
import { trackEvent } from "../../app/lib/analytics";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("appointment funnel identity", () => {
  it("saves optional native preferences and retries the identical request after an ambiguous transport failure", async () => {
    const user = userEvent.setup(); const bodies: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      if (bodies.length === 1) throw new Error("Synthetic timeout after commit");
      return new Response(JSON.stringify({ status: "already_requested" }), { status: 200 });
    }));
    render(<AppointmentRequestCTA leadId="22222222-2222-4222-8222-222222222222" sessionId="11111111-1111-4111-8111-111111111111" requestSurface="seller_page" funnelName="seller" attribution={{}} />);
    await user.selectOptions(screen.getByLabelText("Preferred contact method"), "email");
    await user.type(screen.getByLabelText("Preferred day (optional)"), "2026-11-12");
    await user.selectOptions(screen.getByLabelText("Preferred Eastern-time window"), "afternoon");
    await user.click(screen.getByRole("button", { name: "Request a conversation" }));
    await user.click(await screen.findByRole("button", { name: "Retry identical conversation request" }));
    expect(bodies).toHaveLength(2); expect(bodies[0]).toEqual(bodies[1]);
    expect(bodies[0]).toMatchObject({ preferences: { version: 1, channel: "email", day: "2026-11-12", window: "afternoon", timezone: "America/New_York" } });
    expect(screen.queryByText(/AdminOps/)).toBeNull();
    expect(screen.getByText(/A preference is not new contact permission/)).toBeVisible();
  });
  it("keeps both appointment intent events attached to the stored lead session", async () => {
    const user = userEvent.setup();
    const sessionId = "11111111-1111-4111-8111-111111111111";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      status: "requested",
      message: "Synthetic appointment request stored.",
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    render(
      <AppointmentRequestCTA
        leadId="22222222-2222-4222-8222-222222222222"
        sessionId={sessionId}
        requestSurface="seller_page"
        funnelName="seller"
        attribution={{}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Request a conversation" }));

    expect(await screen.findByText("Synthetic appointment request stored.")).toBeVisible();
    for (const eventName of ["appointment_click", "appointment_cta_clicked", "appointment_requested"]) {
      expect(trackEvent).toHaveBeenCalledWith(
        eventName,
        {},
        expect.objectContaining({ funnel_name: "seller" }),
        { sessionId },
      );
    }
  });

  it("does not emit a new conversion event for an idempotent replay", async () => {
    const user = userEvent.setup();
    const sessionId = "11111111-1111-4111-8111-111111111111";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      status: "already_requested",
      message: "Synthetic appointment request already stored.",
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    render(
      <AppointmentRequestCTA
        leadId="22222222-2222-4222-8222-222222222222"
        sessionId={sessionId}
        requestSurface="seller_page"
        funnelName="seller"
        attribution={{}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Request a conversation" }));

    expect(await screen.findByText("Synthetic appointment request already stored.")).toBeVisible();
    expect(trackEvent).not.toHaveBeenCalledWith(
      "appointment_requested",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
