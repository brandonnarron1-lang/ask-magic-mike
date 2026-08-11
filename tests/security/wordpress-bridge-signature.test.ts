import { describe, expect, it } from "vitest";
import {
  signWordPressBridgeBody,
  verifyWordPressBridgeRequest,
} from "@/../app/lib/wordpressBridgeSignature";

const secret = "test-secret-that-is-at-least-thirty-two-characters";
const timestamp = "1786464000";
const entryId = "151";
const body = JSON.stringify({ funnel_type: "buyer" });

function request(overrides: Record<string, string> = {}) {
  const signature = signWordPressBridgeBody(secret, timestamp, entryId, body);
  return new Request("https://www.askmagicmike.com/api/leads", {
    method: "POST",
    headers: {
      "x-amm-wp-bridge": "v1",
      "x-amm-wp-timestamp": timestamp,
      "x-amm-wp-entry": entryId,
      "x-amm-wp-signature": `v1=${signature}`,
      ...overrides,
    },
    body,
  });
}

describe("WordPress bridge HMAC", () => {
  it("accepts a current correctly signed body", () => {
    expect(verifyWordPressBridgeRequest(request(), body, { WORDPRESS_BRIDGE_SECRET: secret }, 1_786_464_000_000))
      .toEqual({ ok: true, entryId });
  });

  it("rejects body tampering", () => {
    expect(verifyWordPressBridgeRequest(request(), `${body} `, { WORDPRESS_BRIDGE_SECRET: secret }, 1_786_464_000_000))
      .toMatchObject({ ok: false, status: 401 });
  });

  it("rejects expired requests", () => {
    expect(verifyWordPressBridgeRequest(request(), body, { WORDPRESS_BRIDGE_SECRET: secret }, 1_786_465_000_000))
      .toMatchObject({ ok: false, error: "wordpress_bridge_timestamp_expired" });
  });

  it("fails closed when the secret is absent", () => {
    expect(verifyWordPressBridgeRequest(request(), body, {}, 1_786_464_000_000))
      .toMatchObject({ ok: false, status: 503 });
  });
});
