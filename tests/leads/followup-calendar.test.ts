import { describe, expect, it } from "vitest";
import { buildFollowUpCalendar, type FollowUpCalendarInput } from "@/lib/leads/followup-calendar";

function base(overrides: Partial<FollowUpCalendarInput> = {}): FollowUpCalendarInput {
  return {
    leadType:    "seller",
    temperature: "warm",
    grade:       "B",
    hasPhone:    true,
    hasEmail:    true,
    consentSms:  true,
    consentEmail: true,
    firstName:   "Alex",
    status:      "new",
    ...overrides,
  };
}

describe("buildFollowUpCalendar", () => {
  it("returns touchpoints array and metadata", () => {
    const r = buildFollowUpCalendar(base());
    expect(Array.isArray(r.touchpoints)).toBe(true);
    expect(r.totalTouchpoints).toBe(r.touchpoints.length);
    expect(r.primaryChannel).toBeTruthy();
    expect(r.urgencyLevel).toBeTruthy();
  });

  it("immediate urgency for A+ urgent leads", () => {
    const r = buildFollowUpCalendar(base({ grade: "A+", temperature: "urgent" }));
    expect(r.urgencyLevel).toBe("immediate");
    expect(r.touchpoints[0].delayHours).toBeLessThanOrEqual(0.1); // ~5 min
    expect(r.touchpoints[0].priority).toBe("critical");
  });

  it("same-day urgency for hot/A leads", () => {
    const r = buildFollowUpCalendar(base({ temperature: "hot", grade: "A" }));
    expect(r.urgencyLevel).toBe("same-day");
  });

  it("this-week urgency for warm/B leads", () => {
    const r = buildFollowUpCalendar(base({ temperature: "warm", grade: "B" }));
    expect(r.urgencyLevel).toBe("this-week");
  });

  it("nurture urgency for low temperature", () => {
    const r = buildFollowUpCalendar(base({ temperature: "low", grade: "C" }));
    expect(r.urgencyLevel).toBe("nurture");
  });

  it("urgent path includes 6 touchpoints up to 30 days", () => {
    const r = buildFollowUpCalendar(base({ grade: "A+", temperature: "urgent" }));
    expect(r.totalTouchpoints).toBe(6);
    const last = r.touchpoints[r.touchpoints.length - 1];
    expect(last.delayHours).toBeGreaterThanOrEqual(700); // ~30 days
  });

  it("returns empty calendar for closed_won leads", () => {
    const r = buildFollowUpCalendar(base({ status: "closed_won" }));
    expect(r.touchpoints).toHaveLength(0);
    expect(r.totalTouchpoints).toBe(0);
  });

  it("returns empty calendar for disqualified leads", () => {
    const r = buildFollowUpCalendar(base({ status: "disqualified" }));
    expect(r.touchpoints).toHaveLength(0);
  });

  it("message template includes first name when provided", () => {
    const r = buildFollowUpCalendar(base({ firstName: "Jordan", leadType: "seller_cash_offer", temperature: "urgent", grade: "A+" }));
    expect(r.touchpoints[0].messageTemplate).toContain("Jordan");
  });

  it("touchpoints have non-empty reason and templateId", () => {
    const r = buildFollowUpCalendar(base());
    for (const tp of r.touchpoints) {
      expect(tp.reason.length).toBeGreaterThan(0);
      expect(tp.templateId.length).toBeGreaterThan(0);
    }
  });

  it("primary channel is call when phone + call consent", () => {
    const r = buildFollowUpCalendar(base({ hasPhone: true, consentCall: true }));
    expect(r.primaryChannel).toBe("call");
  });

  it("primary channel is email when no phone", () => {
    const r = buildFollowUpCalendar(base({ hasPhone: false, consentSms: false, consentCall: false }));
    expect(r.primaryChannel).toBe("email");
  });

  it("delay hours increase monotonically within a track", () => {
    const r = buildFollowUpCalendar(base({ grade: "A+", temperature: "urgent" }));
    for (let i = 1; i < r.touchpoints.length; i++) {
      expect(r.touchpoints[i].delayHours).toBeGreaterThan(r.touchpoints[i - 1].delayHours);
    }
  });
});
