import type { NativeSessionAdapter, QaBinding } from "./transport";
import type { SecureStore } from "./localPlan";
import { utf8Bytes } from "./protectedStore";

export type VerifiedGuestQa = Pick<QaBinding, "origin" | "verificationReceipt" | "localScopeId"> & { kind: "verified-isolated-qa"; expiresAt: number };
export type VerifiedLocalLoopbackQa = Omit<VerifiedGuestQa, "kind"> & {
  kind: "verified-local-loopback"; platform: "ios" | "android";
};
export type VerifiedInternalBeta = Omit<VerifiedGuestQa, "kind"> & { kind: "connected-internal-beta"; createdAt: number; source: string };
export type GuestQaDescriptor = VerifiedGuestQa | VerifiedLocalLoopbackQa | VerifiedInternalBeta;
export type HttpResponse = {
  status: number; url: string; redirected: boolean;
  headers: { get(name: string): string | null; getSetCookie?(): string[] };
  body: { getReader(): { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel(): Promise<unknown>; releaseLock(): void } } | null;
};
export type NativeFetch = (url: string, init: {
  method: "GET" | "POST"; headers: Record<string, string>; body?: string;
  credentials: "omit"; redirect: "manual"; signal: AbortSignal;
}) => Promise<HttpResponse>;
export const HTTP_TIMEOUT_MS = 12000;
export const MAX_RESPONSE_BYTES = 65536;
const DEVICE_CLOCK_SKEW_MS = 120000; // Does not extend the server's five-minute CSRF lifetime.
const COOKIE = "amm-r2-guest"; // Actual R2 guest cookie, never a staff/account jar.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const failed = () => Error("Native guest request unconfirmed. Recheck explicitly; no automatic retry.");
function checkedDescriptor(d: GuestQaDescriptor, now: number) {
  const u = new URL(d.origin);
  const remote = (d.kind === "verified-isolated-qa" || d.kind === "connected-internal-beta") && u.protocol === "https:";
  if (d.kind === "connected-internal-beta" && (!/^https:\/\/amm-internal-beta-[a-f0-9]{12}\.vercel\.app$/.test(d.origin)
    || !Number.isSafeInteger(d.createdAt) || now < d.createdAt || d.expiresAt - d.createdAt > 7 * 86400000
    || !/^[a-f0-9]{40}$/.test(d.source) || !/^beta-provenance:[a-f0-9]{64}$/.test(d.verificationReceipt))) throw failed();
  const local = d.kind === "verified-local-loopback" && u.protocol === "http:" && Number(u.port) >= 1024 && Number(u.port) <= 65535
    && ((d.platform === "ios" && u.hostname === "127.0.0.1") || (d.platform === "android" && u.hostname === "10.0.2.2"));
  if ((!remote && !local) || u.origin !== d.origin
      || u.username || u.password || !d.verificationReceipt.trim() || d.verificationReceipt.length > 500
      || !new RegExp(`^${UUID}$`, "i").test(d.localScopeId) || !Number.isFinite(d.expiresAt) || d.expiresAt <= now) throw failed();
}
function validRoute(path: string, method: string) {
  return (method === "POST" && (path === "/api/chat/message" || path === "/api/intelligence/feedback"))
    || (method === "GET" && (new RegExp(`^/api/intelligence/answers\\?id=${UUID}$`, "i").test(path)
      || new RegExp(`^/api/intelligence/feedback\\?answerId=${UUID}&revision=[1-9][0-9]{0,14}$`, "i").test(path)));
}
type Cookie = { value: string; expiresAt: number };
function checkedCookie(v: unknown, now: number, ceiling: number): Cookie {
  const c = v as Cookie;
  if (!c || typeof c !== "object" || Object.keys(c).length !== 2 || !/^[A-Za-z0-9_-]{43}$/.test(c.value)
      || !Number.isFinite(c.expiresAt) || c.expiresAt <= now || c.expiresAt > ceiling) throw failed();
  return c;
}
function readCookie(headers: string[], now: number, ceiling: number): Cookie | null | undefined {
  if (headers.length > 8 || headers.some(h => h.length > 4096 || /[\r\n]/.test(h))) throw failed();
  let result: Cookie | null | undefined;
  for (const header of headers) {
    const [pair, ...attributes] = header.split(";").map(s => s.trim());
    const equals = pair.indexOf("=");
    if (pair.slice(0, equals) !== COOKIE) throw failed(); // Refuse ALL account/staff/unknown cookies.
    if (result !== undefined) throw failed();
    const attrs = new Map(attributes.map(a => { const i = a.indexOf("="); return i < 0 ? [a.toLowerCase(), ""] : [a.slice(0, i).toLowerCase(), a.slice(i + 1)]; }));
    if (!attrs.has("secure") || !attrs.has("httponly") || attrs.get("path") !== "/" || attrs.has("domain")
        || !["lax", "strict"].includes((attrs.get("samesite") ?? "").toLowerCase())) throw failed();
    const seconds = attrs.get("max-age");
    if (!seconds || !/^-?[0-9]{1,10}$/.test(seconds)) throw failed();
    if (Number(seconds) <= 0) { result = null; continue; }
    result = checkedCookie({ value: pair.slice(equals + 1), expiresAt: Math.min(ceiling, now + Number(seconds) * 1000) }, now, ceiling);
  }
  return result;
}

/** Explicitly injected verified QA ONLY. No request/auth/restore on creation.
 * Expo native fetch credentials:omit disables OS/shared cookie jars on BOTH
 * platforms; only this encrypted, scope-bound guest cookie is sent manually.
 * No Origin/Referer/Authorization, no staff credentials, redirects or retries.
 * Server origin/CSRF rejection remains rejection; main must supply a legitimate
 * native contract, not a browser-header spoof. Cookie state commits before any
 * response is returned. dispose() aborts and permanently fences this adapter. */
export function createGuestSessionAdapter(descriptor: GuestQaDescriptor, store: SecureStore, fetchNative: NativeFetch,
  options: { now?: () => number; timeoutMs?: number } = {}): NativeSessionAdapter & { dispose(): void; clear(): Promise<void>; admit(code: string): Promise<void> } {
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS;
  // Expired beta builds retain local planning; the request/admission checks
  // enforce expiry. Construction performs no network or credential mutation.
  checkedDescriptor(descriptor, descriptor.kind === "connected-internal-beta" ? descriptor.createdAt : now());
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > HTTP_TIMEOUT_MS) throw failed();
  const d = Object.freeze({ ...descriptor });
  const key = `amm-r3-guest-cookie-v1.${d.localScopeId}`;
  let disposed = false, busy = false;
  let active: AbortController | undefined;
  return {
    audience: "consumer-or-guest",
    dispose() { disposed = true; active?.abort(); },
    async clear() { disposed = true; active?.abort(); await store.removeItem(key); },
    async admit(code) {
      if (d.kind !== "connected-internal-beta" || disposed || busy || !/^[A-Za-z0-9_-]{43}$/.test(code)) throw failed();
      checkedDescriptor(d, now());
      busy = true;
      try {
        const prior = await store.getItem(key);
        // Never silently replace a revoked identity or a pending exact-action
        // journal. This app has no automatic new-key/re-enrollment path.
        if (prior && checkedCookie(JSON.parse(prior), now(), d.expiresAt).value !== code) throw failed();
        await store.setItem(key, JSON.stringify({ value: code, expiresAt: d.expiresAt }));
      } finally { busy = false; }
    },
    async request(input) {
      if (disposed || busy || input.origin !== d.origin || !validRoute(input.path, input.method)
          || (input.method === "GET" && input.body !== undefined)
          || (input.body !== undefined && utf8Bytes(input.body) > 16384)) throw failed();
      checkedDescriptor(d, now());
      busy = true;
      const controller = new AbortController(); active = controller;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(failed()); }, timeoutMs);
      });
      const live = () => { if (disposed || controller.signal.aborted || now() >= d.expiresAt) throw failed(); };
      try {
        return await Promise.race([deadline, (async () => {
          const raw = await store.getItem(key); live();
          if (raw && raw.length > 256) throw failed();
          let cookie: Cookie | null = null;
          if (raw) {
            const parsed = JSON.parse(raw) as Cookie;
            if (parsed.expiresAt <= now()) { await store.removeItem(key); live(); }
            else cookie = checkedCookie(parsed, now(), d.expiresAt);
          }
          if (d.kind === "connected-internal-beta" && !cookie) throw failed();
          async function send(path: string, method: "GET" | "POST", requestBody?: string, extraHeaders: Record<string, string> = {}) {
          live();
          const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json", ...extraHeaders };
          if (d.kind === "connected-internal-beta") headers["x-amm-beta-source"] = d.source;
          if (cookie) headers.Cookie = `${COOKIE}=${cookie.value}`;
          const url = d.origin + (d.kind === "connected-internal-beta" ? "/api/native/beta/v1" : "") + path;
          const response = await fetchNative(url, { method, headers, ...(requestBody === undefined ? {} : { body: requestBody }),
            credentials: "omit", redirect: "manual", signal: controller.signal });
          live();
          if (response.redirected || response.url !== url || response.status < 200 || response.status >= 300
              || !/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "")) throw failed();
          const length = response.headers.get("content-length");
          if (length && (!/^[0-9]+$/.test(length) || Number(length) > MAX_RESPONSE_BYTES)) throw failed();
          const reader = response.body?.getReader();
          if (!reader) throw failed();
          let count = 0;
          const buffers: Uint8Array[] = [];
          try {
            while (true) {
              const { done, value } = await reader.read(); live();
              if (done) break;
              if (!value) throw failed();
              count += value.byteLength;
              if (count > MAX_RESPONSE_BYTES) throw failed();
              buffers.push(value);
            }
          } catch { void reader.cancel().catch(() => {}); throw failed(); }
          finally { reader.releaseLock(); }
          const bytes = new Uint8Array(count); let offset = 0;
          for (const buffer of buffers) { bytes.set(buffer, offset); offset += buffer.byteLength; }
          const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); live();
          // RN's installed whatwg Headers has no getSetCookie(). The one
          // permitted guest cookie has no Expires comma. Combined/unrecognized
          // cookie headers fail closed in readCookie rather than being guessed.
          const header = response.headers.get("set-cookie");
          const values = response.headers.getSetCookie?.() ?? (header === null ? [] : [header]);
          const next = readCookie(values, now(), d.expiresAt);
          if (next === null) await store.removeItem(key);
          else if (next) await store.setItem(key, JSON.stringify(next));
          live();
          if (next !== undefined) cookie = next;
          return { status: response.status, body };
          }
          if (input.method === "POST" && input.path === "/api/intelligence/feedback") {
            // One deliberate feedback action: fresh viewer-bound CSRF token,
            // then exactly the journaled payload. Neither request is retried.
            const pending = JSON.parse(input.body ?? "null") as { answerId?: unknown; revision?: unknown } | null;
            if (!pending || typeof pending.answerId !== "string" || !new RegExp(`^${UUID}$`, "i").test(pending.answerId)
                || !Number.isSafeInteger(pending.revision) || Number(pending.revision) < 1) throw failed();
            const tokenResponse = await send(`/api/native/v1/feedback-token?answerId=${pending.answerId}&revision=${pending.revision}`, "GET");
            const csrf = tokenResponse.body as { ok?: unknown; token?: unknown; expiresAt?: unknown } | null;
            if (!csrf || csrf.ok !== true || typeof csrf.token !== "string" || !/^[A-Za-z0-9_.-]{20,4096}$/.test(csrf.token)
                || typeof csrf.expiresAt !== "string" || !Number.isFinite(Date.parse(csrf.expiresAt))
                || Date.parse(csrf.expiresAt) <= now() || Date.parse(csrf.expiresAt) > now() + 300000 + DEVICE_CLOCK_SKEW_MS) throw failed();
            return send("/api/native/v1/feedback", "POST", input.body, { "x-amm-feedback-csrf": csrf.token });
          }
          return send(input.path, input.method, input.body);
        })()]);
      } catch { controller.abort(); throw failed(); }
      finally { clearTimeout(timer); if (active === controller) active = undefined; busy = false; }
    },
  };
}
