/**
 * Structured logger for Ask Magic Mike server-side code.
 *
 * Thin wrapper around console that:
 * 1. Emits structured JSON lines in production.
 * 2. Scrubs obvious PII fields so sensitive data never reaches logs.
 * 3. Accepts an event name + safe metadata — does not accept raw strings
 *    to make accidental PII leaks harder.
 *
 * Adoption: pass `log` from `createLogger(context)` to any module that
 * currently calls `console.error` / `console.warn` directly. Existing
 * console calls are still valid — this is an incremental upgrade.
 */

/** Fields that are always scrubbed before logging. */
const PII_KEYS = new Set([
  "email",
  "phone",
  "address",
  "address1",
  "address2",
  "firstName",
  "lastName",
  "name",
  "fullName",
  "zipCode",
  "postalCode",
  "ssn",
  "dob",
  "dateOfBirth",
  "ip",
  "ipAddress",
]);

/**
 * Recursively scrub PII keys from an object. Returns a new object.
 * Arrays are preserved but their object elements are also scrubbed.
 *
 * @param value - Any serialisable value.
 * @returns Scrubbed copy of the value.
 */
export function scrubPii(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrubPii);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEYS.has(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = scrubPii(v);
      }
    }
    return out;
  }
  return value;
}

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  context: string;
  event: string;
  ts: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, context: string, event: string, meta: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    level,
    context,
    event,
    ts: new Date().toISOString(),
    ...scrubPii(meta) as Record<string, unknown>,
  };
  const line = JSON.stringify(entry);
  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export interface Logger {
  info(event: string, meta?: Record<string, unknown>): void;
  warn(event: string, meta?: Record<string, unknown>): void;
  error(event: string, meta?: Record<string, unknown>): void;
}

/**
 * Create a logger bound to a context string (e.g. module or route name).
 *
 * @example
 * const log = createLogger("sms-inbound");
 * log.error("messages.insert_failed", { leadId, code: err.code });
 */
export function createLogger(context: string): Logger {
  return {
    info: (event, meta = {}) => emit("info", context, event, meta),
    warn: (event, meta = {}) => emit("warn", context, event, meta),
    error: (event, meta = {}) => emit("error", context, event, meta),
  };
}
