import { describe, expect, it } from "vitest";
import { classifyInboundSms, isWithinSmsSendWindow, smsFrequencyAllowed, smsSegmentCount } from "@/lib/messaging/sms-policy";

describe("SMS policy", () => {
  it("processes STOP and HELP keyword families", () => {
    expect(classifyInboundSms(" stop ")).toBe("stop");
    expect(classifyInboundSms("unsubscribe")).toBe("stop");
    expect(classifyInboundSms("HELP")).toBe("help");
    expect(classifyInboundSms("I have a question")).toBe("reply");
  });

  it("counts GSM and unicode message segments", () => {
    expect(smsSegmentCount("a".repeat(160))).toBe(1);
    expect(smsSegmentCount("a".repeat(161))).toBe(2);
    expect(smsSegmentCount("é".repeat(71))).toBe(2);
  });

  it("enforces Eastern quiet hours", () => {
    expect(isWithinSmsSendWindow(new Date("2026-08-15T14:00:00Z"))).toBe(true);
    expect(isWithinSmsSendWindow(new Date("2026-08-15T03:00:00Z"))).toBe(false);
  });

  it("enforces frequency caps", () => {
    expect(smsFrequencyAllowed({ sentInLast24Hours: 1, sentInLast7Days: 4 })).toBe(true);
    expect(smsFrequencyAllowed({ sentInLast24Hours: 2, sentInLast7Days: 4 })).toBe(false);
    expect(smsFrequencyAllowed({ sentInLast24Hours: 0, sentInLast7Days: 5 })).toBe(false);
  });
});
