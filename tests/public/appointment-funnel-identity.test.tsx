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
    for (const eventName of ["appointment_click", "appointment_cta_clicked"]) {
      expect(trackEvent).toHaveBeenCalledWith(
        eventName,
        {},
        expect.objectContaining({ funnel_name: "seller" }),
        { sessionId },
      );
    }
  });
});
