import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConsumerReferralHandoff } from "../../app/components/black-diamond/ConsumerReferralHandoff";
import { buildPublicReferralPacket } from "../../app/lib/publicReferral";

const { trackEventMock, readAttributionMock } = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
  readAttributionMock: vi.fn(() => ({
    source: "direct",
    medium: "website",
    campaign: "direct-contact",
  })),
}));

vi.mock("../../app/lib/analytics", () => ({
  trackEvent: trackEventMock,
}));

vi.mock("../../app/lib/attribution", () => ({
  readAttribution: readAttributionMock,
}));

function setNavigatorCapability(
  key: "share" | "clipboard",
  value: unknown,
) {
  Object.defineProperty(navigator, key, {
    configurable: true,
    value,
  });
}

beforeEach(() => {
  trackEventMock.mockClear();
  readAttributionMock.mockClear();
  setNavigatorCapability("share", undefined);
  setNavigatorCapability("clipboard", undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("public owned-referral handoff", () => {
  it("replaces the internal social-asset promotion on the active homepage", () => {
    const shell = readFileSync(
      "app/components/black-diamond/BlackDiamondShell.tsx",
      "utf8",
    );

    expect(shell).toContain("<ConsumerReferralHandoff surface=\"homepage\" />");
    expect(shell).not.toContain("SocialAdSupportSection");
  });

  it("builds one fixed, generic, canonical referral packet", () => {
    const packet = buildPublicReferralPacket("homepage");
    const url = new URL(packet.url);

    expect(url.origin).toBe("https://www.askmagicmike.com");
    expect(url.pathname).toBe("/ask");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: "consumer_share",
      utm_medium: "referral",
      utm_campaign: "amm_owned_demand_2026",
      utm_content: "homepage_referral_share",
    });
    expect(JSON.stringify(packet)).not.toMatch(
      /email|phone|address|session|token|password|lead_id/i,
    );
  });

  it("rejects an unregistered runtime surface", () => {
    expect(() => buildPublicReferralPacket("lead-detail" as never)).toThrow(
      "Unsupported public referral surface.",
    );
  });

  it("hands the generic packet to the native share sheet after a direct click", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigatorCapability("share", share);
    render(<ConsumerReferralHandoff surface="homepage" />);

    fireEvent.click(screen.getByRole("button", { name: "Share Ask Magic Mike" }));

    await waitFor(() => expect(share).toHaveBeenCalledWith(
      buildPublicReferralPacket("homepage"),
    ));
    expect(trackEventMock).toHaveBeenCalledWith(
      "referral_share_handoff",
      expect.objectContaining({ source: "direct" }),
      { surface: "homepage", share_method: "native" },
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Share options opened. You choose the person and app.",
    );
  });

  it("does not claim a handoff when the user cancels the native chooser", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("Canceled", "AbortError"));
    setNavigatorCapability("share", share);
    render(<ConsumerReferralHandoff surface="homepage" />);

    fireEvent.click(screen.getByRole("button", { name: "Share Ask Magic Mike" }));

    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(trackEventMock).not.toHaveBeenCalled();
    expect(screen.getByText("Nothing is sent until you choose a person or copy the link.")).toBeVisible();
  });

  it("copies the fixed referral URL when native sharing is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigatorCapability("clipboard", { writeText });
    render(<ConsumerReferralHandoff surface="homepage" />);

    fireEvent.click(screen.getByRole("button", { name: "Share Ask Magic Mike" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(
      buildPublicReferralPacket("homepage").url,
    ));
    expect(trackEventMock).toHaveBeenCalledWith(
      "referral_link_copied",
      expect.objectContaining({ source: "direct" }),
      { surface: "homepage", share_method: "clipboard" },
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Referral link copied.",
    );
  });

  it("selects the visible URL without recording a copy when Clipboard is denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
    setNavigatorCapability("clipboard", { writeText });
    render(<ConsumerReferralHandoff surface="homepage" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy referral link" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const input = screen.getByLabelText("Ask Magic Mike referral link") as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
    expect(trackEventMock).not.toHaveBeenCalled();
    expect(screen.getByText(/full link is selected/i)).toBeVisible();
  });
});
