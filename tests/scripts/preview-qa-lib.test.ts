/**
 * Pure-helper tests for the preview QA bypass / classification logic.
 * No network. No Vercel calls.
 */
import { describe, expect, it } from "vitest";
import {
  getBypassConfig,
  buildRequestHeaders,
  classifyAccessStatus,
  redactSecrets,
  shouldRunMutationChecks,
  summarizeFetchError,
  formatFetchErrorSummary,
} from "../../scripts/preview-qa-lib.mjs";

const FORCE_CONFIRM_TOKEN = "I_UNDERSTAND_THIS_WRITES_TO_THE_CONFIGURED_DATABASE";

describe("getBypassConfig", () => {
  it("returns null when no bypass env var is set", () => {
    const cfg = getBypassConfig({});
    expect(cfg.present).toBe(false);
    expect(cfg.secret).toBeNull();
    expect(cfg.source).toBeNull();
  });

  it("prefers VERCEL_AUTOMATION_BYPASS_SECRET over aliases", () => {
    const cfg = getBypassConfig({
      VERCEL_AUTOMATION_BYPASS_SECRET: "automation-secret",
      VERCEL_PROTECTION_BYPASS_TOKEN: "token-alias",
      VERCEL_BYPASS_SECRET: "legacy-alias",
    });
    expect(cfg.source).toBe("VERCEL_AUTOMATION_BYPASS_SECRET");
    expect(cfg.secret).toBe("automation-secret");
    expect(cfg.present).toBe(true);
  });

  it("falls back to VERCEL_PROTECTION_BYPASS_TOKEN when automation var is empty", () => {
    const cfg = getBypassConfig({
      VERCEL_AUTOMATION_BYPASS_SECRET: "",
      VERCEL_PROTECTION_BYPASS_TOKEN: "token-alias",
      VERCEL_BYPASS_SECRET: "legacy-alias",
    });
    expect(cfg.source).toBe("VERCEL_PROTECTION_BYPASS_TOKEN");
    expect(cfg.secret).toBe("token-alias");
  });

  it("falls back to VERCEL_BYPASS_SECRET when both prior vars are absent", () => {
    const cfg = getBypassConfig({ VERCEL_BYPASS_SECRET: "legacy-alias" });
    expect(cfg.source).toBe("VERCEL_BYPASS_SECRET");
    expect(cfg.secret).toBe("legacy-alias");
  });

  it("trims surrounding whitespace before the secret is used", () => {
    const cfg = getBypassConfig({
      VERCEL_AUTOMATION_BYPASS_SECRET: "  automation-secret  ",
    });
    expect(cfg.present).toBe(true);
    expect(cfg.valid).toBe(true);
    expect(cfg.invalidReason).toBeNull();
    expect(cfg.secret).toBe("automation-secret");
  });

  it("removes a trailing newline (the classic CI / echo artifact)", () => {
    const cfg = getBypassConfig({
      VERCEL_AUTOMATION_BYPASS_SECRET: "automation-secret\n",
    });
    expect(cfg.valid).toBe(true);
    expect(cfg.secret).toBe("automation-secret");
  });

  it("removes a trailing CRLF", () => {
    const cfg = getBypassConfig({
      VERCEL_AUTOMATION_BYPASS_SECRET: "automation-secret\r\n",
    });
    expect(cfg.valid).toBe(true);
    expect(cfg.secret).toBe("automation-secret");
  });

  it("rejects an embedded newline without exposing the secret", () => {
    const cfg = getBypassConfig({
      VERCEL_AUTOMATION_BYPASS_SECRET: "abc\ndef",
    });
    expect(cfg.present).toBe(true);
    expect(cfg.valid).toBe(false);
    expect(cfg.secret).toBeNull();
    expect(cfg.invalidReason).toMatch(/CR\/LF/);
  });

  it("rejects a non-printable control character", () => {
    const cfg = getBypassConfig({
      VERCEL_AUTOMATION_BYPASS_SECRET: "abc\x00def",
    });
    expect(cfg.valid).toBe(false);
    expect(cfg.secret).toBeNull();
    expect(cfg.invalidReason).toMatch(/non-printable/);
  });

  it("rejects a value that is empty after trim", () => {
    const cfg = getBypassConfig({
      VERCEL_AUTOMATION_BYPASS_SECRET: "   \n",
    });
    expect(cfg.present).toBe(true);
    expect(cfg.valid).toBe(false);
    expect(cfg.secret).toBeNull();
    expect(cfg.invalidReason).toMatch(/empty after trim/);
  });

  it("reads SET_VERCEL_BYPASS_COOKIE as a boolean string", () => {
    expect(
      getBypassConfig({ SET_VERCEL_BYPASS_COOKIE: "true" }).setCookie
    ).toBe(true);
    expect(
      getBypassConfig({ SET_VERCEL_BYPASS_COOKIE: "TRUE" }).setCookie
    ).toBe(true);
    expect(getBypassConfig({}).setCookie).toBe(false);
    expect(
      getBypassConfig({ SET_VERCEL_BYPASS_COOKIE: "false" }).setCookie
    ).toBe(false);
  });
});

describe("buildRequestHeaders", () => {
  it("adds x-vercel-protection-bypass when a secret is configured", () => {
    const h = buildRequestHeaders(
      { "User-Agent": "test" },
      { VERCEL_AUTOMATION_BYPASS_SECRET: "automation-secret" }
    );
    expect(h["x-vercel-protection-bypass"]).toBe("automation-secret");
    expect(h["User-Agent"]).toBe("test");
  });

  it("does not add the bypass header when no secret is configured", () => {
    const h = buildRequestHeaders({}, {});
    expect("x-vercel-protection-bypass" in h).toBe(false);
    expect("x-vercel-set-bypass-cookie" in h).toBe(false);
  });

  it("adds x-vercel-set-bypass-cookie only when explicitly enabled", () => {
    const without = buildRequestHeaders(
      {},
      { VERCEL_AUTOMATION_BYPASS_SECRET: "s" }
    );
    expect("x-vercel-set-bypass-cookie" in without).toBe(false);

    const withCookie = buildRequestHeaders(
      {},
      {
        VERCEL_AUTOMATION_BYPASS_SECRET: "s",
        SET_VERCEL_BYPASS_COOKIE: "true",
      }
    );
    expect(withCookie["x-vercel-set-bypass-cookie"]).toBe("true");
  });

  it("does not mutate the input header object", () => {
    const base = { "User-Agent": "test" };
    const out = buildRequestHeaders(base, {
      VERCEL_AUTOMATION_BYPASS_SECRET: "s",
    });
    expect("x-vercel-protection-bypass" in base).toBe(false);
    expect(out).not.toBe(base);
  });

  it("sets the bypass header to the trimmed secret, never the raw value", () => {
    const h = buildRequestHeaders(
      {},
      { VERCEL_AUTOMATION_BYPASS_SECRET: "  automation-secret\n" }
    );
    expect(h["x-vercel-protection-bypass"]).toBe("automation-secret");
  });

  it("does not set the bypass header when the secret is invalid", () => {
    const embedded = buildRequestHeaders(
      {},
      { VERCEL_AUTOMATION_BYPASS_SECRET: "abc\ndef" }
    );
    expect("x-vercel-protection-bypass" in embedded).toBe(false);

    const nonPrintable = buildRequestHeaders(
      {},
      { VERCEL_AUTOMATION_BYPASS_SECRET: "abc\x07def" }
    );
    expect("x-vercel-protection-bypass" in nonPrintable).toBe(false);

    const emptyAfterTrim = buildRequestHeaders(
      {},
      { VERCEL_AUTOMATION_BYPASS_SECRET: "   " }
    );
    expect("x-vercel-protection-bypass" in emptyAfterTrim).toBe(false);
  });
});

describe("classifyAccessStatus", () => {
  it("returns ok for 2xx/3xx", () => {
    expect(classifyAccessStatus(200, false)).toBe("ok");
    expect(classifyAccessStatus(204, false)).toBe("ok");
    expect(classifyAccessStatus(302, true)).toBe("ok");
  });

  it("returns missing_bypass for 401/403 without bypass", () => {
    expect(classifyAccessStatus(401, false)).toBe("missing_bypass");
    expect(classifyAccessStatus(403, false)).toBe("missing_bypass");
  });

  it("returns rejected_bypass for 401/403 with bypass", () => {
    expect(classifyAccessStatus(401, true)).toBe("rejected_bypass");
    expect(classifyAccessStatus(403, true)).toBe("rejected_bypass");
  });

  it("returns network_error for status 0", () => {
    expect(classifyAccessStatus(0, false)).toBe("network_error");
  });

  it("returns fail for other error statuses", () => {
    expect(classifyAccessStatus(500, true)).toBe("fail");
    expect(classifyAccessStatus(404, false)).toBe("fail");
  });
});

describe("redactSecrets", () => {
  it("replaces every occurrence of a provided secret", () => {
    const out = redactSecrets(
      "auth=topsecret in body, again topsecret",
      ["topsecret"]
    );
    expect(out).not.toContain("topsecret");
    expect(out).toContain("***redacted***");
  });

  it("ignores empty / non-string secrets", () => {
    const out = redactSecrets("hello world", [null, undefined, "", "abc"]);
    // "abc" is < 4 chars so should pass through; longer ones must redact.
    expect(out).toContain("hello world");
  });

  it("redacts sk_* tokens and Bearer values generically", () => {
    const out = redactSecrets(
      "Authorization: Bearer abcd1234.efgh-5678 sk_live_ABCD1234XYZ",
      []
    );
    expect(out).toContain("Bearer ***redacted***");
    expect(out).toContain("sk_***redacted***");
  });

  it("removes the raw bypass secret from a string", () => {
    const bypass = "amm_bypass_TOPSECRET_value";
    const out = redactSecrets(
      `fetch failed using x-vercel-protection-bypass=${bypass}`,
      [bypass]
    );
    expect(out).not.toContain(bypass);
    expect(out).toContain("***redacted***");
  });

  it("does not crash on null text", () => {
    // @ts-expect-error — intentional null input
    expect(redactSecrets(null, ["x"])).toBe("");
  });
});

describe("summarizeFetchError", () => {
  it("extracts name/message and cause fields from a fetch TypeError", () => {
    const err = Object.assign(new TypeError("fetch failed"), {
      cause: {
        code: "ENOTFOUND",
        hostname: "preview.vercel.app",
        syscall: "getaddrinfo",
      },
    });
    const s = summarizeFetchError(err);
    expect(s.error_name).toBe("TypeError");
    expect(s.error_message).toBe("fetch failed");
    expect(s.cause_code).toBe("ENOTFOUND");
    expect(s.cause_hostname).toBe("preview.vercel.app");
    expect(s.cause_syscall).toBe("getaddrinfo");
  });

  it("returns nulls for missing fields and non-objects", () => {
    const s = summarizeFetchError(undefined);
    expect(s.error_name).toBeNull();
    expect(s.error_message).toBeNull();
    expect(s.cause_code).toBeNull();
    expect(s.cause_hostname).toBeNull();
    expect(s.cause_syscall).toBeNull();
  });
});

describe("formatFetchErrorSummary", () => {
  it("formats a one-line summary with cause details", () => {
    const line = formatFetchErrorSummary({
      error_name: "TypeError",
      error_message: "fetch failed",
      cause_code: "ECONNRESET",
      cause_syscall: "read",
      cause_hostname: "preview.vercel.app",
    });
    expect(line).toBe(
      "TypeError: fetch failed: (code=ECONNRESET syscall=read hostname=preview.vercel.app)"
    );
  });

  it("omits absent fields and tolerates null", () => {
    expect(formatFetchErrorSummary(null)).toBe("");
    expect(
      formatFetchErrorSummary({
        error_name: "TypeError",
        error_message: null,
        cause_code: null,
        cause_syscall: null,
        cause_hostname: null,
      })
    ).toBe("TypeError");
  });
});

describe("shouldRunMutationChecks", () => {
  const safeHealth = { safety: { safe_for_preview_mutation: true } };
  const unsafeHealth = { safety: { safe_for_preview_mutation: false } };

  it("blocks when SAFE_DB_WRITE is not set", () => {
    const r = shouldRunMutationChecks(safeHealth, {});
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/SAFE_DB_WRITE/);
  });

  it("allows when SAFE_DB_WRITE=true and health flag is true", () => {
    const r = shouldRunMutationChecks(safeHealth, { SAFE_DB_WRITE: "true" });
    expect(r.allowed).toBe(true);
  });

  it("blocks when health flag is false and FORCE_DB_WRITE is unset", () => {
    const r = shouldRunMutationChecks(unsafeHealth, {
      SAFE_DB_WRITE: "true",
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/safe_for_preview_mutation/);
  });

  it("requires the confirm token when FORCE_DB_WRITE is true", () => {
    const r = shouldRunMutationChecks(unsafeHealth, {
      FORCE_DB_WRITE: "true",
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain(FORCE_CONFIRM_TOKEN);
  });

  it("STILL blocks when FORCE_DB_WRITE=true + confirm but health is unsafe", () => {
    // The health endpoint is the single source of truth. FORCE does not
    // override an unsafe health verdict — there is no escape hatch.
    const r = shouldRunMutationChecks(unsafeHealth, {
      FORCE_DB_WRITE: "true",
      CONFIRM_FORCE_DB_WRITE: FORCE_CONFIRM_TOKEN,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/safe_for_preview_mutation=false/);
  });

  it("allows when FORCE_DB_WRITE=true + confirm AND health is safe", () => {
    const r = shouldRunMutationChecks(safeHealth, {
      FORCE_DB_WRITE: "true",
      CONFIRM_FORCE_DB_WRITE: FORCE_CONFIRM_TOKEN,
    });
    expect(r.allowed).toBe(true);
  });

  it("blocks when there is no health response", () => {
    const r = shouldRunMutationChecks(null, { SAFE_DB_WRITE: "true" });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/no health response/);
  });
});
