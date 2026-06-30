/**
 * Request context helpers — correlation IDs, timing, structured route logging.
 *
 * Usage in an API route:
 *
 *   const ctx = requestContext("intake/submit");
 *   // ... do work ...
 *   return NextResponse.json(body, { headers: ctx.responseHeaders(200) });
 *
 * Every response includes:
 *   X-Request-Id       — unique per-request identifier (also logged)
 *   X-Response-Time    — wall-clock ms from route entry to response
 *
 * The ctx.log logger is pre-bound with the correlation ID so all log lines
 * from the same request share a traceable request_id field.
 */

import { createLogger, type Logger } from "./logger";

export interface RequestContext {
  requestId: string;
  startMs: number;
  log: Logger;
  /** Build response headers including X-Request-Id and X-Response-Time. */
  responseHeaders(statusCode?: number): Record<string, string>;
  /** Emit a structured completion log and return response headers. */
  finish(statusCode: number, extra?: Record<string, unknown>): Record<string, string>;
}

function generateId(): string {
  // crypto.randomUUID is available in Node 14.17+ and all modern runtimes
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
    : Math.random().toString(36).slice(2, 18);
}

/**
 * Create a request context for a named route.
 * Call at the top of each API handler — before any awaits if possible.
 */
export function requestContext(routeName: string, incomingId?: string | null): RequestContext {
  const requestId = incomingId?.trim() || generateId();
  const startMs   = Date.now();
  const log       = createLogger(routeName);

  log.info("request_started", { request_id: requestId });

  return {
    requestId,
    startMs,
    log,

    responseHeaders(statusCode?: number) {
      const elapsed = Date.now() - startMs;
      return {
        "X-Request-Id":    requestId,
        "X-Response-Time": `${elapsed}ms`,
        "Cache-Control":   "no-store",
        ...(statusCode !== undefined ? {} : {}),
      };
    },

    finish(statusCode: number, extra: Record<string, unknown> = {}) {
      const elapsed = Date.now() - startMs;
      log.info("request_completed", {
        request_id:  requestId,
        status:      statusCode,
        duration_ms: elapsed,
        ...extra,
      });
      return {
        "X-Request-Id":    requestId,
        "X-Response-Time": `${elapsed}ms`,
        "Cache-Control":   "no-store",
      };
    },
  };
}
