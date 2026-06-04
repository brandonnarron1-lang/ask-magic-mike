import { describe, expect, it } from "vitest";
import {
  detectProvider,
  normalizeEmailEvent,
} from "@/lib/adapters/email-webhook-normalizer";

describe("detectProvider", () => {
  it("detects resend", () => {
    expect(
      detectProvider({ type: "email.delivered", data: { id: "x" } })
    ).toBe("resend");
  });
  it("detects sendgrid", () => {
    expect(
      detectProvider({
        event: "delivered",
        email: "a@b.com",
        sg_message_id: "sg-1",
      })
    ).toBe("sendgrid");
  });
  it("detects postmark", () => {
    expect(detectProvider({ RecordType: "Delivery", MessageID: "pm-1" })).toBe(
      "postmark"
    );
  });
  it("falls back to mock", () => {
    expect(detectProvider({ event: "delivered", message_id: "m-1" })).toBe(
      "mock"
    );
    expect(detectProvider({})).toBe("mock");
  });
});

describe("normalizeEmailEvent — Resend", () => {
  it("normalizes a delivered event", () => {
    const n = normalizeEmailEvent({
      type: "email.delivered",
      data: { id: "rid_1", to: ["jane@example.com"] },
      created_at: "2026-06-04T12:00:00Z",
    });
    expect(n.provider).toBe("resend");
    expect(n.eventType).toBe("delivered");
    expect(n.providerMessageId).toBe("rid_1");
    expect(n.email).toBe("jane@example.com");
    expect(n.timestamp).toBe("2026-06-04T12:00:00Z");
  });
  it("classifies bounce / complaint / unsubscribe", () => {
    expect(
      normalizeEmailEvent({ type: "email.bounced", data: { id: "x" } })
        .eventType
    ).toBe("bounced");
    expect(
      normalizeEmailEvent({ type: "email.complained", data: { id: "x" } })
        .eventType
    ).toBe("complained");
    expect(
      normalizeEmailEvent({ type: "email.unsubscribed", data: { id: "x" } })
        .eventType
    ).toBe("unsubscribed");
  });
});

describe("normalizeEmailEvent — SendGrid", () => {
  it("normalizes a delivered event", () => {
    const n = normalizeEmailEvent({
      event: "delivered",
      email: "jane@example.com",
      sg_message_id: "sg-42",
      timestamp: "2026-06-04T12:00:00Z",
    });
    expect(n.provider).toBe("sendgrid");
    expect(n.eventType).toBe("delivered");
    expect(n.providerMessageId).toBe("sg-42");
    expect(n.email).toBe("jane@example.com");
  });
});

describe("normalizeEmailEvent — Postmark", () => {
  it("normalizes a Postmark Delivery event", () => {
    const n = normalizeEmailEvent({
      RecordType: "Delivery",
      MessageID: "pm-abc",
      Recipient: "jane@example.com",
      ReceivedAt: "2026-06-04T12:00:00Z",
    });
    expect(n.provider).toBe("postmark");
    expect(n.eventType).toBe("delivered");
    expect(n.providerMessageId).toBe("pm-abc");
    expect(n.email).toBe("jane@example.com");
  });

  it("normalizes a Postmark SpamComplaint event", () => {
    const n = normalizeEmailEvent({
      RecordType: "SpamComplaint",
      MessageID: "pm-2",
      Email: "spam@example.com",
    });
    expect(n.eventType).toBe("complained");
    expect(n.email).toBe("spam@example.com");
  });
});

describe("normalizeEmailEvent — mock", () => {
  it("normalizes the simple { event, message_id, email } shape", () => {
    const n = normalizeEmailEvent({
      event: "unsubscribed",
      message_id: "m_1",
      email: "jane@example.com",
    });
    expect(n.provider).toBe("mock");
    expect(n.eventType).toBe("unsubscribed");
    expect(n.providerMessageId).toBe("m_1");
  });

  it("returns unknown on a payload without a recognizable event field", () => {
    const n = normalizeEmailEvent({ foo: "bar" });
    expect(n.eventType).toBe("unknown");
  });
});
