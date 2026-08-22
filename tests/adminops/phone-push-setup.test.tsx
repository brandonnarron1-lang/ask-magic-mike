import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhonePushSetup, phonePushCapabilityError, phonePushReadiness } from "../../app/admin/notifications/phone/PhonePushSetup";
import { PhoneSetupInvite } from "../../app/admin/notifications/phone/PhoneSetupInvite";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("phone push setup", () => {
  it("generates and copies a short-lived Brandon link without exposing an admin secret", async () => {
    const inviteUrl = `${window.location.origin}/phone-alerts/install/test-token.signature`;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      url: inviteUrl,
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(<PhoneSetupInvite />);
    fireEvent.click(screen.getByRole("button", { name: "Generate Brandon setup link" }));

    expect(await screen.findByRole("button", { name: "Copy secure link" })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/admin/api/phone-alerts/invite", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));
    expect(JSON.stringify(fetchMock.mock.calls[0])).not.toContain("x-admin-secret");

    fireEvent.click(screen.getByRole("button", { name: "Copy secure link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(inviteUrl));
  });

  it("rejects an invite URL returned for another origin", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      url: "https://evil.example/phone-alerts/install/test-token.signature",
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    render(<PhoneSetupInvite />);
    fireEvent.click(screen.getByRole("button", { name: "Generate Brandon setup link" }));

    expect(await screen.findByText(/could not be generated/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Copy secure link" })).not.toBeInTheDocument();
  });

  it("distinguishes missing server configuration from browser incompatibility", () => {
    expect(phonePushCapabilityError("")).toBe("Phone alerts are not configured on the server yet.");
  });

  it("requires the installed Home Screen app for iPhone push", () => {
    expect(phonePushReadiness("test-key", {
      isIos: true,
      isStandalone: false,
      hasNotification: false,
      hasServiceWorker: true,
      hasPushManager: false,
    })).toMatchObject({ canRegister: false, needsIosHomeScreen: true });

    expect(phonePushReadiness("test-key", {
      isIos: true,
      isStandalone: true,
      hasNotification: true,
      hasServiceWorker: true,
      hasPushManager: true,
    })).toEqual({ canRegister: true, needsIosHomeScreen: false, message: "Ready to register this phone." });
  });

  it("does not request permission or create a subscription on an unsupported browser", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, subscriptions: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PhonePushSetup publicKey="test-public-key" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const enableButton = screen.getByRole("button", { name: "Enable free phone alerts on this device" });
    expect(enableButton).toBeDisabled();

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

  it("computes browser readiness even when the admin device-list API fails", async () => {
    Object.defineProperty(window, "Notification", { configurable: true, value: { requestPermission: vi.fn() } });
    Object.defineProperty(window, "PushManager", { configurable: true, value: function PushManager() {} });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {} });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })));

    render(<PhonePushSetup publicKey="test-public-key" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Enable free phone alerts on this device" })).toBeEnabled());
    expect(screen.getByText("Ready to register this phone.")).toBeVisible();
  });

  it("keeps the passwordless setup flow restricted to Brandon without loading admin devices", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<PhonePushSetup publicKey="test-public-key" mode="brandon" />);

    expect(await screen.findByText(/Brandon copy alerts only/)).toBeVisible();
    expect(screen.queryByLabelText("This phone belongs to")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
