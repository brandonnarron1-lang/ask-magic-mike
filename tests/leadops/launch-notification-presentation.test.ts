import { describe, expect, it } from "vitest";
import { launchNotificationStatus } from "../../app/lib/launchNotificationPresentation";
import type { LeadNotificationRecord } from "../../app/lib/leadNotificationTypes";
const fixture = (status: LeadNotificationRecord["status"], metadata: Record<string, unknown> = {}) => ({ template_version: "lead_alert_email_v6", status, metadata }) as LeadNotificationRecord;
describe("launch envelope evidence labels", () => {
  it("never calls API acceptance delivered or inbox receipt", () => {
    expect(launchNotificationStatus(fixture("sent"))).toBe("Accepted by email provider");
    expect(launchNotificationStatus(fixture("sent", { provider_delivery_confirmed: true }))).toBe("Delivered to recipient server");
  });
  it("keeps unknown acceptance distinct from a safe retry", () => {
    expect(launchNotificationStatus(fixture("processing"))).toBe("Provider outcome pending reconciliation");
    expect(launchNotificationStatus(fixture("retry_scheduled"))).toBe("Safe retry scheduled");
  });
  it("does not conceal a failure behind retained delivery metadata", () => {
    expect(launchNotificationStatus(fixture("permanently_failed", { provider_delivery_confirmed: true }))).toBe("Delivery problem — review required");
  });
  it("preserves legacy reader labels", () => {
    expect(launchNotificationStatus({ ...fixture("sent"), template_version: "lead_alert_email_v4" })).toBe("sent");
  });
});
