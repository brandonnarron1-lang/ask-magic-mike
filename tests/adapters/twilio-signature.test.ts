import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  computeTwilioSignature,
  verifyTwilioSignature,
} from "@/lib/adapters/twilio-signature";

const URL_BASE = "https://example.com/api/webhooks/sms/inbound";
const TOKEN = "test_auth_token_v0";

function sign(url: string, params: Record<string, string> = {}): string {
  let payload = url;
  for (const k of Object.keys(params).sort()) payload += k + params[k];
  return createHmac("sha1", TOKEN).update(payload).digest("base64");
}

describe("computeTwilioSignature", () => {
  it("matches the documented Twilio algorithm for URL-only requests", () => {
    const sig = computeTwilioSignature({ url: URL_BASE, authToken: TOKEN });
    expect(sig).toBe(sign(URL_BASE));
  });

  it("appends sorted param name+value for form-encoded bodies", () => {
    const params = { From: "+12525551234", Body: "STOP" };
    const sig = computeTwilioSignature({
      url: URL_BASE,
      authToken: TOKEN,
      formParams: params,
    });
    expect(sig).toBe(sign(URL_BASE, params));
  });
});

describe("verifyTwilioSignature", () => {
  it("returns missing_signature when nothing supplied", () => {
    const r = verifyTwilioSignature({
      url: URL_BASE,
      providedSignature: null,
      authToken: TOKEN,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("missing_signature");
  });

  it("returns missing_token when token is empty", () => {
    const r = verifyTwilioSignature({
      url: URL_BASE,
      providedSignature: "anything",
      authToken: "",
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("missing_token");
  });

  it("returns mismatch on a forged signature", () => {
    const r = verifyTwilioSignature({
      url: URL_BASE,
      providedSignature: "definitely-not-real",
      authToken: TOKEN,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("mismatch");
  });

  it("accepts a correctly-signed JSON request", () => {
    const sig = sign(URL_BASE);
    const r = verifyTwilioSignature({
      url: URL_BASE,
      providedSignature: sig,
      authToken: TOKEN,
    });
    expect(r.ok).toBe(true);
  });

  it("accepts a correctly-signed form-encoded request", () => {
    const params = { From: "+12525551234", Body: "STOP", MessageSid: "SM_test" };
    const sig = sign(URL_BASE, params);
    const r = verifyTwilioSignature({
      url: URL_BASE,
      providedSignature: sig,
      authToken: TOKEN,
      formParams: params,
    });
    expect(r.ok).toBe(true);
  });

  it("rejects when params differ from what was signed", () => {
    const signedParams = { From: "+12525551234", Body: "STOP" };
    const sig = sign(URL_BASE, signedParams);
    const r = verifyTwilioSignature({
      url: URL_BASE,
      providedSignature: sig,
      authToken: TOKEN,
      formParams: { From: "+19195550100", Body: "STOP" },
    });
    expect(r.ok).toBe(false);
  });
});
