import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mintPhoneSetupToken, verifyPhoneSetupToken } from "../../app/lib/phoneSetupSession";

describe("phone setup sessions", () => {
  const originalSecret = process.env.PHONE_SETUP_SIGNING_SECRET;

  beforeEach(() => {
    process.env.PHONE_SETUP_SIGNING_SECRET = "test-phone-setup-signing-secret-that-is-long-enough";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.PHONE_SETUP_SIGNING_SECRET;
    else process.env.PHONE_SETUP_SIGNING_SECRET = originalSecret;
  });

  it("mints a bounded Brandon-copy-only session", () => {
    const now = Date.parse("2026-08-12T18:00:00.000Z");
    const { token, claims } = mintPhoneSetupToken(now, 10 * 60 * 1000);
    expect(claims).toMatchObject({ v: 1, role: "copy", iat: now, exp: now + 10 * 60 * 1000 });
    expect(verifyPhoneSetupToken(token, now + 1)).toEqual(claims);
  });

  it("rejects tampered, expired, and wrong-secret tokens", () => {
    const now = Date.parse("2026-08-12T18:00:00.000Z");
    const { token } = mintPhoneSetupToken(now, 5 * 60 * 1000);
    expect(verifyPhoneSetupToken(`${token.slice(0, -1)}x`, now + 1)).toBeNull();
    expect(verifyPhoneSetupToken(token, now + 5 * 60 * 1000 + 1)).toBeNull();
    process.env.PHONE_SETUP_SIGNING_SECRET = "another-phone-setup-signing-secret-long-enough";
    expect(verifyPhoneSetupToken(token, now + 1)).toBeNull();
  });

  it("fails closed when the signing secret is missing or too short", () => {
    process.env.PHONE_SETUP_SIGNING_SECRET = "short";
    expect(() => mintPhoneSetupToken()).toThrow("phone_setup_signing_secret_missing");
    expect(verifyPhoneSetupToken("anything")).toBeNull();
  });
});
