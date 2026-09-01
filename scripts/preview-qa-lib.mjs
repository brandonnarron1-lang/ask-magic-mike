/**
 * Pure helpers for the preview QA runner.
 *
 * Kept dependency-free and side-effect-free so unit tests can cover
 * the bypass / classification / redaction logic without spinning up
 * a server or making network calls.
 */

/**
 * @typedef {Object} BypassConfig
 * @property {boolean}     present       A bypass env var held a non-empty raw
 *                                       value (even if it turns out invalid).
 * @property {string|null} source        Name of the env var the value came
 *                                       from, or null when none present.
 * @property {boolean}     valid         The value normalized to a clean,
 *                                       header-safe token.
 * @property {string|null} invalidReason Why the value was rejected (no secret
 *                                       material), or null when valid/absent.
 * @property {string|null} secret        Normalized secret, or null when the
 *                                       value is absent or invalid. Never
 *                                       logged or written to artifacts.
 * @property {boolean}     setCookie     SET_VERCEL_BYPASS_COOKIE flag.
 */

/**
 * Normalize a raw bypass secret into a clean, header-safe token.
 *
 * Rules:
 *   - strip trailing CR/LF
 *   - trim leading/trailing whitespace
 *   - reject empty values after trim
 *   - reject values containing embedded CR/LF (header injection)
 *   - reject values containing non-printable characters
 *
 * Returns the normalized secret plus a validity verdict. The reason string
 * never contains any secret material.
 *
 * @param {string} raw
 * @returns {{ secret: string|null, valid: boolean, invalidReason: string|null }}
 */
function normalizeBypassSecret(raw) {
  // Strip trailing CR/LF first (the classic GitHub-Actions / `echo` artifact),
  // then trim any remaining surrounding whitespace.
  const s = String(raw).replace(/[\r\n]+$/, "").trim();
  if (s.length === 0) {
    return { secret: null, valid: false, invalidReason: "empty after trim" };
  }
  if (/[\r\n]/.test(s)) {
    return {
      secret: null,
      valid: false,
      invalidReason: "contains embedded CR/LF",
    };
  }
  // Header values must be a single clean token of printable ASCII
  // (0x20–0x7E). Anything else (NUL, tab, control bytes, smart-quoted
  // pastes) would make Node's fetch throw before it ever gets a response.
  if (/[^\x20-\x7E]/.test(s)) {
    return {
      secret: null,
      valid: false,
      invalidReason: "contains non-printable characters",
    };
  }
  return { secret: s, valid: true, invalidReason: null };
}

/**
 * Resolve and normalize the Vercel deployment-protection bypass secret.
 *
 * Precedence (highest first):
 *   1. VERCEL_AUTOMATION_BYPASS_SECRET
 *   2. VERCEL_PROTECTION_BYPASS_TOKEN
 *   3. VERCEL_BYPASS_SECRET
 *
 * The first env var holding a non-empty raw value wins; its value is then
 * normalized (see {@link normalizeBypassSecret}). A value can therefore be
 * `present` but not `valid` — the runner reports the reason without ever
 * exposing the secret. The secret MUST NOT be logged or written to artifacts.
 *
 * @param {Record<string, string|undefined>} env
 * @returns {BypassConfig}
 */
export function getBypassConfig(env) {
  const order = [
    "VERCEL_AUTOMATION_BYPASS_SECRET",
    "VERCEL_PROTECTION_BYPASS_TOKEN",
    "VERCEL_BYPASS_SECRET",
  ];
  const setCookie =
    (env.SET_VERCEL_BYPASS_COOKIE ?? "false").toLowerCase() === "true";

  for (const name of order) {
    const raw = env[name];
    if (typeof raw !== "string" || raw.length === 0) continue;
    const { secret, valid, invalidReason } = normalizeBypassSecret(raw);
    return {
      present: true,
      source: name,
      valid,
      invalidReason,
      secret: valid ? secret : null,
      setCookie,
    };
  }
  return {
    present: false,
    source: null,
    valid: false,
    invalidReason: null,
    secret: null,
    setCookie,
  };
}

/**
 * Merge bypass headers into a base header set. Never mutates the input.
 *
 * The bypass header is set ONLY when the configured value is present, valid,
 * and yields a normalized secret — never from an untrimmed or invalid value.
 *
 * @param {Record<string, string>} baseHeaders
 * @param {Record<string, string|undefined>} env
 * @returns {Record<string, string>}
 */
export function buildRequestHeaders(baseHeaders, env) {
  const cfg = getBypassConfig(env);
  const out = { ...baseHeaders };
  if (cfg.present && cfg.valid && cfg.secret) {
    out["x-vercel-protection-bypass"] = cfg.secret;
    if (cfg.setCookie) {
      out["x-vercel-set-bypass-cookie"] = "true";
    }
  }
  return out;
}

/**
 * Extract a safe, secret-free summary from a fetch/network exception.
 *
 * Node's `fetch` throws a `TypeError` whose `cause` carries the underlying
 * system error (DNS, TLS, socket). None of these fields contain secret
 * material, but callers still redact them defensively before emitting.
 *
 * @param {unknown} err
 * @returns {{ error_name: string|null, error_message: string|null,
 *   cause_code: string|null, cause_hostname: string|null,
 *   cause_syscall: string|null }}
 */
export function summarizeFetchError(err) {
  const e = err && typeof err === "object" ? err : {};
  const cause = e.cause && typeof e.cause === "object" ? e.cause : {};
  const str = (v) => (typeof v === "string" && v.length ? v : v == null ? null : String(v));
  return {
    error_name: str(e.name),
    error_message: str(e.message),
    cause_code: str(cause.code),
    cause_hostname: str(cause.hostname),
    cause_syscall: str(cause.syscall),
  };
}

/**
 * Render a fetch-error summary as a single human-readable line for the
 * report message. Pure / side-effect-free.
 *
 * @param {ReturnType<typeof summarizeFetchError>|null|undefined} summary
 * @returns {string}
 */
export function formatFetchErrorSummary(summary) {
  if (!summary || typeof summary !== "object") return "";
  const parts = [];
  if (summary.error_name) parts.push(String(summary.error_name));
  if (summary.error_message) parts.push(String(summary.error_message));
  const cause = [];
  if (summary.cause_code) cause.push(`code=${summary.cause_code}`);
  if (summary.cause_syscall) cause.push(`syscall=${summary.cause_syscall}`);
  if (summary.cause_hostname) cause.push(`hostname=${summary.cause_hostname}`);
  if (cause.length) parts.push(`(${cause.join(" ")})`);
  return parts.join(": ");
}

/**
 * Resolve the HTTP transport used by the Preview QA runner.
 *
 * `fetch` remains the portable default for CI. `vercel_cli` is an explicit
 * local-operator mode that delegates deployment-protection authentication to
 * an already-authenticated Vercel CLI session. The linked project directory is
 * required and must be absolute so the runner cannot silently target whatever
 * project happens to be linked from the caller's current directory.
 *
 * @param {Record<string, string|undefined>} env
 * @returns {{ mode: "fetch"|"vercel_cli", valid: boolean,
 *   invalidReason: string|null, cliCwd: string|null }}
 */
export function getPreviewTransportConfig(env) {
  const rawMode = (env.PREVIEW_TRANSPORT ?? "fetch").trim().toLowerCase();
  if (rawMode !== "fetch" && rawMode !== "vercel_cli") {
    return {
      mode: "fetch",
      valid: false,
      invalidReason:
        'PREVIEW_TRANSPORT must be either "fetch" or "vercel_cli"',
      cliCwd: null,
    };
  }
  if (rawMode === "fetch") {
    return {
      mode: "fetch",
      valid: true,
      invalidReason: null,
      cliCwd: null,
    };
  }

  const cliCwd = (env.VERCEL_CLI_CWD ?? "").trim();
  if (!cliCwd) {
    return {
      mode: "vercel_cli",
      valid: false,
      invalidReason:
        "VERCEL_CLI_CWD is required when PREVIEW_TRANSPORT=vercel_cli",
      cliCwd: null,
    };
  }
  if (!cliCwd.startsWith("/") || /[\r\n\0]/.test(cliCwd)) {
    return {
      mode: "vercel_cli",
      valid: false,
      invalidReason:
        "VERCEL_CLI_CWD must be an absolute path without control characters",
      cliCwd: null,
    };
  }
  return {
    mode: "vercel_cli",
    valid: true,
    invalidReason: null,
    cliCwd,
  };
}

function quoteCurlConfigValue(value) {
  const text = String(value);
  if (/[\r\n\0]/.test(text)) {
    throw new Error("curl config value contains a forbidden control character");
  }
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Build a curl config file for `vercel curl` without putting sensitive header
 * values or request bodies in process arguments. Callers must write the
 * returned string to a mode-0600 temporary file and delete it after use.
 *
 * @param {{ method: string; headers: Record<string, string>;
 *   outputPath: string; headerPath: string; requestBodyPath?: string|null;
 *   followRedirects?: boolean }} input
 * @returns {string}
 */
export function buildVercelCurlConfig(input) {
  const method = String(input.method ?? "GET").toUpperCase();
  if (!/^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/.test(method)) {
    throw new Error("unsupported HTTP method for Vercel CLI transport");
  }
  const lines = [
    "silent",
    "show-error",
    `request = ${quoteCurlConfigValue(method)}`,
    `output = ${quoteCurlConfigValue(input.outputPath)}`,
    `dump-header = ${quoteCurlConfigValue(input.headerPath)}`,
  ];
  if (input.followRedirects) lines.push("location");

  for (const [name, value] of Object.entries(input.headers ?? {})) {
    if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(name)) {
      throw new Error("invalid HTTP header name for Vercel CLI transport");
    }
    lines.push(
      `header = ${quoteCurlConfigValue(`${name}: ${String(value)}`)}`
    );
  }
  if (input.requestBodyPath) {
    lines.push(
      `data-binary = ${quoteCurlConfigValue(`@${input.requestBodyPath}`)}`
    );
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Parse the final HTTP response block from curl's `--dump-header` output.
 * Redirect-following requests can contain multiple response blocks; only the
 * final block represents the body saved by curl.
 *
 * @param {string} raw
 * @returns {{ status: number; headers: Record<string, string> }}
 */
export function parseCurlHeaderDump(raw) {
  const blocks = String(raw ?? "")
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter((block) => /^HTTP\/\S+\s+\d{3}\b/i.test(block));
  const finalBlock = blocks.at(-1) ?? "";
  const lines = finalBlock.split(/\r?\n/);
  const statusMatch = lines[0]?.match(/^HTTP\/\S+\s+(\d{3})\b/i);
  const status = statusMatch ? Number(statusMatch[1]) : 0;
  /** @type {Record<string, string>} */
  const headers = {};
  for (const line of lines.slice(1)) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (!name) continue;
    headers[name] = headers[name]
      ? `${headers[name]}, ${value}`
      : value;
  }
  return { status, headers };
}

/**
 * Classify an HTTP status returned by the preview's public surface
 * relative to whether a bypass secret was supplied.
 *
 * @param {number}  status
 * @param {boolean} hasBypass
 * @param {string|null|undefined} location Redirect target from a manual
 *   redirect response, when present.
 * @returns {"ok" | "missing_bypass" | "rejected_bypass" | "network_error" | "fail"}
 */
export function classifyAccessStatus(status, hasBypass, location = "") {
  if (status === 0) return "network_error";
  const isVercelSsoRedirect =
    status >= 300 &&
    status < 400 &&
    /^https:\/\/vercel\.com\/sso-api(?:\?|$)/i.test(String(location ?? ""));
  if (isVercelSsoRedirect) {
    return hasBypass ? "rejected_bypass" : "missing_bypass";
  }
  if (status >= 200 && status < 400) return "ok";
  if (status === 401 || status === 403) {
    return hasBypass ? "rejected_bypass" : "missing_bypass";
  }
  return "fail";
}

/**
 * Strip any of the provided secret strings from a text blob, replacing
 * them with `***redacted***`. Empty / non-string secrets are ignored.
 *
 * Also redacts common token shapes (sk_*, Bearer values) as a defence
 * in depth in case a secret was passed in unexpectedly shaped.
 *
 * @param {string} text
 * @param {Array<string|null|undefined>} secrets
 * @returns {string}
 */
export function redactSecrets(text, secrets) {
  let out = String(text ?? "");
  for (const s of secrets ?? []) {
    if (typeof s === "string" && s.length >= 4) {
      // Escape regex metacharacters in the secret.
      const re = new RegExp(
        s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g"
      );
      out = out.replace(re, "***redacted***");
    }
  }
  out = out.replace(/sk_[A-Za-z0-9_]{8,}/g, "sk_***redacted***");
  out = out.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer ***redacted***");
  return out;
}

/**
 * Decide whether mutation checks may run.
 *
 * The health endpoint is the single source of truth: if it reports
 * `safe_for_preview_mutation: false`, mutation is never allowed —
 * not even with FORCE_DB_WRITE. The only way to mutate is:
 *
 *   1. The health endpoint reports `safe_for_preview_mutation: true`
 *      (which itself requires DATABASE_ENV/VERCEL_ENV=preview,
 *      PREVIEW_DATA_MODE=enabled, ALLOW_PREVIEW_DB_MUTATION=true, a
 *      Neon endpoint attested as Preview and distinct from Production,
 *      live sends off, migration 00012
 *      applied, and DB reachable).
 *   2. SAFE_DB_WRITE=true, OR
 *      (FORCE_DB_WRITE=true AND CONFIRM_FORCE_DB_WRITE === the exact
 *      confirm token).
 *
 * If both 1 and 2 are satisfied, mutation may run. Otherwise it is
 * blocked. There is no escape hatch when health says unsafe.
 *
 * @param {{ safety?: { safe_for_preview_mutation?: boolean } } | null} health
 * @param {Record<string, string|undefined>} env
 * @returns {{ allowed: boolean; reason: string }}
 */
export function shouldRunMutationChecks(health, env) {
  const FORCE_CONFIRM_TOKEN =
    "I_UNDERSTAND_THIS_WRITES_TO_THE_CONFIGURED_DATABASE";
  const safe = (env.SAFE_DB_WRITE ?? "false").toLowerCase() === "true";
  const force = (env.FORCE_DB_WRITE ?? "false").toLowerCase() === "true";
  const confirm = env.CONFIRM_FORCE_DB_WRITE ?? "";

  if (!safe && !force) {
    return { allowed: false, reason: "SAFE_DB_WRITE not set" };
  }
  if (force && confirm !== FORCE_CONFIRM_TOKEN) {
    return {
      allowed: false,
      reason: `FORCE_DB_WRITE=true requires CONFIRM_FORCE_DB_WRITE="${FORCE_CONFIRM_TOKEN}"`,
    };
  }
  if (!health) {
    return { allowed: false, reason: "no health response to inspect" };
  }
  // Health endpoint is the single source of truth. No escape hatch.
  if (!health.safety?.safe_for_preview_mutation) {
    return {
      allowed: false,
      reason:
        "health.safety.safe_for_preview_mutation=false — refusing to mutate. " +
        "The health endpoint is the single source of truth and FORCE_DB_WRITE " +
        "does not override it. Configure DATABASE_ENV=preview, " +
        "PREVIEW_DATA_MODE=enabled, ALLOW_PREVIEW_DB_MUTATION=true, " +
        "PREVIEW_NEON_ENDPOINT_ID, and PRODUCTION_NEON_ENDPOINT_ID.",
    };
  }
  return { allowed: true, reason: "ok" };
}
