/**
 * Pure helpers for the preview QA runner.
 *
 * Kept dependency-free and side-effect-free so unit tests can cover
 * the bypass / classification / redaction logic without spinning up
 * a server or making network calls.
 */

/**
 * @typedef {Object} BypassConfig
 * @property {string|null} secret    Raw secret value (never logged).
 * @property {string|null} source    Name of the env var the value came from.
 * @property {boolean}     present   Convenience flag.
 * @property {boolean}     setCookie SET_VERCEL_BYPASS_COOKIE flag.
 */

/**
 * Resolve the Vercel deployment-protection bypass secret from env.
 *
 * Precedence (highest first):
 *   1. VERCEL_AUTOMATION_BYPASS_SECRET
 *   2. VERCEL_PROTECTION_BYPASS_TOKEN
 *   3. VERCEL_BYPASS_SECRET
 *
 * The first nonempty value wins. The secret is returned but MUST NOT
 * be logged or written to artifacts.
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
  for (const name of order) {
    const v = env[name];
    if (typeof v === "string" && v.length > 0) {
      const setCookie =
        (env.SET_VERCEL_BYPASS_COOKIE ?? "false").toLowerCase() === "true";
      return { secret: v, source: name, present: true, setCookie };
    }
  }
  const setCookie =
    (env.SET_VERCEL_BYPASS_COOKIE ?? "false").toLowerCase() === "true";
  return { secret: null, source: null, present: false, setCookie };
}

/**
 * Merge bypass headers into a base header set. Never mutates the input.
 *
 * @param {Record<string, string>} baseHeaders
 * @param {Record<string, string|undefined>} env
 * @returns {Record<string, string>}
 */
export function buildRequestHeaders(baseHeaders, env) {
  const cfg = getBypassConfig(env);
  const out = { ...baseHeaders };
  if (cfg.secret) {
    out["x-vercel-protection-bypass"] = cfg.secret;
    if (cfg.setCookie) {
      out["x-vercel-set-bypass-cookie"] = "true";
    }
  }
  return out;
}

/**
 * Classify an HTTP status returned by the preview's public surface
 * relative to whether a bypass secret was supplied.
 *
 * @param {number}  status
 * @param {boolean} hasBypass
 * @returns {"ok" | "missing_bypass" | "rejected_bypass" | "network_error" | "fail"}
 */
export function classifyAccessStatus(status, hasBypass) {
  if (status === 0) return "network_error";
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
 * Hard rules:
 *   - default off (SAFE_DB_WRITE=false blocks)
 *   - FORCE_DB_WRITE requires the explicit confirm token
 *   - the health endpoint must report safe_for_preview_mutation=true
 *     unless FORCE_DB_WRITE is set
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
  if (!health.safety?.safe_for_preview_mutation && !force) {
    return {
      allowed: false,
      reason:
        "health.safety.safe_for_preview_mutation=false. " +
        "Set FORCE_DB_WRITE=true + CONFIRM_FORCE_DB_WRITE if you really mean it.",
    };
  }
  return { allowed: true, reason: "ok" };
}
