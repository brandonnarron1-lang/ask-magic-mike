import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const query = vi.fn();
const verify = vi.fn();

vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));
vi.mock("@/lib/adapters/twilio-signature", () => ({
  verifyTwilioSignature: (...args: unknown[]) => verify(...args),
}));

import { POST } from "../../app/api/webhooks/sms/status/route";

function request(status = "delivered") {
  return new NextRequest("https://www.askmagicmike.com/api/webhooks/sms/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Twilio-Signature": "synthetic-signature",
    },
    body: new URLSearchParams({
      MessageSid: `SM${"a".repeat(32)}`,
      MessageStatus: status,
    }).toString(),
  });
}

describe("Twilio internal lead delivery status callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://synthetic.invalid/test";
    process.env.TWILIO_AUTH_TOKEN = "synthetic-token";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.askmagicmike.com";
    verify.mockReturnValue({ ok: true });
    query.mockResolvedValue([{ id: "notification-1" }]);
  });

  it("verifies the signature and records a matched terminal delivery", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, matched: 1 });
    expect(verify).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://www.askmagicmike.com/api/webhooks/sms/status",
      authToken: "synthetic-token",
    }));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("provider_message_id = $1"), [
      `SM${"a".repeat(32)}`,
      false,
      null,
      "delivered",
      true,
    ]);
  });

  it("rejects a forged callback before any database write", async () => {
    verify.mockReturnValue({ ok: false, reason: "mismatch" });
    const response = await POST(request("failed"));
    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });
});
