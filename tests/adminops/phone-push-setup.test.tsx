import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhonePushSetup, phonePushCapabilityError } from "../../app/admin/notifications/phone/PhonePushSetup";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("phone push setup", () => {
  it("distinguishes missing server configuration from browser incompatibility", () => {
    expect(phonePushCapabilityError("")).toBe("Phone alerts are not configured on the server yet.");
  });

  it("does not request permission or create a subscription on an unsupported browser", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, subscriptions: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PhonePushSetup publicKey="test-public-key" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Enable free phone alerts on this device" }));

    expect(screen.getByText(/This browser cannot enable phone alerts/)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("offers a test action only for Brandon copy devices", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      subscriptions: [
        { id: "primary-id", role: "primary", device: "Mike phone" },
        { id: "copy-id", role: "copy", device: "Brandon phone" },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PhonePushSetup publicKey="test-public-key" />);

    expect(await screen.findByRole("button", { name: "Send Brandon test" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Send Brandon test" })).toHaveLength(1);
  });
});
