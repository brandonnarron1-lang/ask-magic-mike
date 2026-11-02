import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { siteConfig } from "../../src/lib/site-config";
import { PublicMikeContact } from "../../app/components/black-diamond/PublicMikeContact";
import { safePublicAnalyticsProperties, isCanonicalLedgerProtectedEvent } from "../../src/lib/analytics/privacy";

const track = vi.hoisted(() => vi.fn());
vi.mock("../../app/lib/analytics", () => ({ trackEvent: track }));
vi.mock("../../app/lib/attribution", () => ({ readAttribution: () => ({}) }));

afterEach(() => { cleanup(); track.mockClear(); });

describe("public Mike contact contract", () => {
  it("separates the owner-supplied direct line from the office", () => {
    expect(siteConfig.agentPhone).toBe("+12522454337");
    expect(siteConfig.agentPhoneDisplay).toBe("(252) 245-4337");
    expect(siteConfig.officePhone).toBe("252-243-7700");
  });
  it("uses ordinary number-only anchors and explains the desktop/text limitation", () => {
    render(<PublicMikeContact surface="thank_you" />);
    expect(screen.getByRole("link", { name: /Call Magic Mike/ })).toHaveAttribute("href", "tel:+12522454337");
    expect(screen.getByRole("link", { name: /Text Magic Mike/ })).toHaveAttribute("href", "sms:+12522454337");
    expect(screen.getByText(/Text receipt has not been verified/)).toBeVisible();
    expect(document.querySelector("button, input")).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
  it("records only intent, not submission, contact or an outcome", () => {
    const submitted = vi.fn();
    render(<form onSubmit={submitted}><PublicMikeContact surface="widget" compact /></form>);
    for (const [name, event] of [[/Call Magic Mike/, "phone_click"], [/Text Magic Mike/, "sms_composer_opened"]] as const) {
      const link = screen.getByRole("link", { name });
      link.addEventListener("click", e => e.preventDefault()); // no external app in test
      fireEvent.click(link);
      expect(track).toHaveBeenLastCalledWith(event, {}, { surface: "widget" });
      expect(isCanonicalLedgerProtectedEvent(event)).toBe(false);
    }
    expect(submitted).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledTimes(2);
  });
  it("keeps contact intent analytics limited to registered non-private dimensions", () => {
    expect(safePublicAnalyticsProperties("sms_composer_opened", {
      surface: "public_header", phone: siteConfig.agentPhone, message: "private response",
      address: "101 Synthetic Road", lead_id: "private", current_path: "/admin/leads/private",
    })).toEqual({ surface: "public_header" });
  });
});
