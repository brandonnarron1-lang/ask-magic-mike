import { createHmac, timingSafeEqual } from "node:crypto";
import { env as runtimeEnv } from "node:process";
import type { AddressComponents, AddressResolvedSuggestion, AddressSuggestion } from "./addressValue";
import { formatAddress } from "./addressValue";

/**
 * Server-only, disabled-by-default Places REST (New) candidate; not Address Validation.
 * Activation additionally requires approved billing/API/key restrictions and privacy/terms,
 * reviewed Google Maps attribution beside results (official logo or permitted compact text),
 * and an approved content-use/retention decision. The approval gate attests these prerequisites.
 * No suggestion lists or raw responses are persisted. Selection is not postal/parcel verification.
 * https://developers.google.com/maps/documentation/places/web-service/policies
 * https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
 * https://developers.google.com/maps/documentation/places/web-service/place-details
 * https://developers.google.com/maps/documentation/places/web-service/place-session-tokens
 * UI must create a fresh UUID after a Details attempt terminates its autocomplete session.
 */
export const ADDRESS_LOOKUP_LIMITS = {
  query: 500,
  candidateToken: 1_024,
  requestBytes: 8_192,
  responseBytes: 32_768,
  bodyTimeoutMs: 1_000,
  rateLimitTimeoutMs: 1_000,
  providerTimeoutMs: 2_500,
  candidateTtlMs: 3 * 60 * 1_000,
  suggestions: 5,
} as const;

type Environment = Record<string, string | undefined>;
type Failure = { state: "no_results" | "unavailable" | "rate_limited" };
export type AddressSuggestResponse = { state: "results"; suggestions: AddressSuggestion[] } | Failure;
export type AddressResolveResponse = { state: "resolved"; result: AddressResolvedSuggestion } | Failure;
export type AddressLookupRequest =
  | { operation: "suggest"; query: string; sessionToken: string }
  | { operation: "resolve"; query: string; sessionToken: string; candidateToken: string };

type Dependencies = { env?: Environment; fetch?: typeof fetch; now?: () => number; signal?: AbortSignal };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLACE_ID = /^[a-zA-Z0-9_-]{1,256}$/;
const ORIGIN = "https://places.googleapis.com";
const AUTOCOMPLETE_MASK = "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text,suggestions.placePrediction.text.text";
const DETAILS_MASK = "id,formattedAddress,addressComponents,attributions";
// Approximate Wilson city-center bias only; out-of-area input remains unchanged and allowed.
const WILSON_BIAS = { circle: { center: { latitude: 35.7213, longitude: -77.9155 }, radius: 50_000 } };

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function text(value: unknown, max = 500): string | null {
  return typeof value === "string" && value.length <= max && !Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  })
    ? value : null;
}

export function parseAddressLookupRequest(value: unknown): AddressLookupRequest | null {
  const input = object(value);
  if (!input || !["suggest", "resolve"].includes(String(input.operation))) return null;
  const keys = input.operation === "suggest"
    ? ["operation", "query", "sessionToken"] : ["operation", "query", "sessionToken", "candidateToken"];
  if (Object.keys(input).sort().join() !== keys.sort().join()) return null;
  const query = text(input.query, ADDRESS_LOOKUP_LIMITS.query);
  if (!query || query.trim().length < 3 || typeof input.sessionToken !== "string" || !UUID.test(input.sessionToken)) return null;
  if (input.operation === "suggest") return { operation: "suggest", query, sessionToken: input.sessionToken };
  if (typeof input.candidateToken !== "string" || input.candidateToken.length > ADDRESS_LOOKUP_LIMITS.candidateToken || !input.candidateToken) return null;
  return { operation: "resolve", query, sessionToken: input.sessionToken, candidateToken: input.candidateToken };
}

function configuration(env: Environment, explicitlyMocked = false) {
  const production = env.VERCEL_ENV === "production" && !env.PREVIEW_URL;
  // No environment flag can enable local outbound lookup. Only explicit dependency injection
  // in a non-cloud test can exercise deterministic fixtures; Preview is never eligible.
  const localMock = explicitlyMocked && env.NODE_ENV === "test" &&
    (!env.VERCEL_ENV || env.VERCEL_ENV === "development") &&
    !env.VERCEL && !env.VERCEL_URL && !env.PREVIEW_URL;
  const secret = env.ADDRESS_LOOKUP_SIGNING_SECRET ?? "";
  return (production || localMock) && env.ADDRESS_LOOKUP_ENABLED === "true" &&
    env.ADDRESS_GOOGLE_CONTENT_USE_APPROVED === "true" &&
    Boolean(env.GOOGLE_PLACES_API_KEY?.trim()) && secret.trim().length >= 32
    ? { key: env.GOOGLE_PLACES_API_KEY!, secret } : null;
}

/** Configuration eligibility only. CONTENT_USE_APPROVED must remain unset until actual
 * logo/compact-text rendering and permitted transaction-specific content use are reviewed.
 * A generic "Google Maps suggestions" placeholder is not that approval. */
export function getAddressLookupCapability(env: Environment = runtimeEnv) {
  const enabled = configuration(env) !== null;
  return { enabled };
}

function digest(secret: string, domain: string, value: string) {
  return createHmac("sha256", secret).update(`amm:address:v1:${domain}\0${value}`).digest("base64url");
}

function candidate(secret: string, id: string, request: AddressLookupRequest, now: number) {
  const payload = Buffer.from(JSON.stringify({ id, q: digest(secret, "query", request.query),
    s: digest(secret, "session", request.sessionToken), exp: now + ADDRESS_LOOKUP_LIMITS.candidateTtlMs })).toString("base64url");
  return `v1.${payload}.${digest(secret, "candidate", payload)}`;
}

function resolveCandidate(secret: string, request: Extract<AddressLookupRequest, { operation: "resolve" }>, now: number) {
  const parts = request.candidateToken.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || !/^[a-zA-Z0-9_-]+$/.test(parts[1]) || !/^[a-zA-Z0-9_-]{43}$/.test(parts[2])) return null;
  const expected = Buffer.from(digest(secret, "candidate", parts[1]));
  if (!timingSafeEqual(expected, Buffer.from(parts[2]))) return null;
  try {
    const p = object(JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")));
    if (!p || typeof p.id !== "string" || !PLACE_ID.test(p.id) ||
      p.q !== digest(secret, "query", request.query) || p.s !== digest(secret, "session", request.sessionToken) ||
      typeof p.exp !== "number" || !Number.isSafeInteger(p.exp) || p.exp <= now ||
      p.exp > now + ADDRESS_LOOKUP_LIMITS.candidateTtlMs) return null;
    return p.id;
  } catch { return null; }
}

/** Bounded stream + deadline, including streams that never finish. No raw error escapes. */
export async function readAddressLookupBody(body: ReadableStream<Uint8Array> | null, bytes: number, timeoutMs: number): Promise<unknown> {
  if (!body) throw new Error("address_body_unavailable");
  const reader = body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { void reader.cancel().catch(() => {}); reject(new Error("address_body_unavailable")); }, timeoutMs);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > bytes) throw new Error("address_body_unavailable");
        chunks.push(chunk.value);
      }
      return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))) as unknown;
    })()]);
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function components(value: unknown): AddressComponents | null {
  if (!Array.isArray(value) || value.length > 40) return null;
  const parts = new Map<string, { long: string; short: string }>();
  for (const entry of value) {
    const p = object(entry);
    if (!p || !Array.isArray(p.types) || p.types.length > 8) return null;
    const long = text(p.longText), short = text(p.shortText);
    if (!long || (p.shortText !== undefined && short === null)) return null;
    for (const type of p.types) if (typeof type === "string" && !parts.has(type)) parts.set(type, { long, short: short || long });
  }
  const long = (type: string) => parts.get(type)?.long ?? "";
  const short = (type: string) => parts.get(type)?.short ?? "";
  const route = long("route");
  if (!route) return null;
  const postal = long("postal_code"), suffix = long("postal_code_suffix");
  const result: AddressComponents = {
    line1: [long("street_number"), route].filter(Boolean).join(" "),
    // Absence is not permission for the UI to discard an independently entered unit.
    line2: long("subpremise"),
    locality: long("locality") || long("postal_town") || long("sublocality_level_1"),
    region: short("administrative_area_level_1"),
    postalCode: postal && suffix ? `${postal}-${suffix}` : postal,
    country: /^[A-Z]{2}$/.test(short("country")) ? short("country") : "",
  };
  const maximum: Record<keyof AddressComponents, number> = { line1: 200, line2: 100, locality: 100, region: 80, postalCode: 24, country: 2 };
  return formatAddress(result).length <= 500 &&
    (Object.keys(maximum) as Array<keyof AddressComponents>).every(key => result[key].length <= maximum[key]) ? result : null;
}

export function createAddressProvider(dependencies: Dependencies = {}) {
  const env = dependencies.env ?? runtimeEnv;
  const configured = configuration(env, Boolean(dependencies.fetch));
  const fetcher = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? Date.now;

  async function google(url: string, init: RequestInit): Promise<{ data: unknown } | Failure> {
    if (!configured || dependencies.signal?.aborted) return { state: "unavailable" };
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel: () => void = () => {};
    const deadline = new Promise<never>((_, reject) => {
      cancel = () => { controller.abort(); reject(new Error("address_provider_unavailable")); };
      timer = setTimeout(cancel, ADDRESS_LOOKUP_LIMITS.providerTimeoutMs);
      dependencies.signal?.addEventListener("abort", cancel, { once: true });
    });
    try {
      return await Promise.race([deadline, (async () => {
        const response = await fetcher(url, { ...init, signal: controller.signal, cache: "no-store",
          redirect: "error", credentials: "omit", referrerPolicy: "no-referrer" });
        if (response.redirected) return { state: "unavailable" } as const;
        if (response.status === 429) return { state: "rate_limited" } as const;
        if (response.status === 404) return { state: "no_results" } as const;
        if (!response.ok || response.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json") return { state: "unavailable" } as const;
        const length = response.headers.get("content-length");
        if (length && (!/^\d+$/.test(length) || Number(length) > ADDRESS_LOOKUP_LIMITS.responseBytes)) return { state: "unavailable" } as const;
        return { data: await readAddressLookupBody(response.body, ADDRESS_LOOKUP_LIMITS.responseBytes, ADDRESS_LOOKUP_LIMITS.providerTimeoutMs) };
      })()]);
    } catch { return { state: "unavailable" }; }
    finally { clearTimeout(timer); dependencies.signal?.removeEventListener("abort", cancel); controller.abort(); }
  }

  return {
    async suggest(request: Extract<AddressLookupRequest, { operation: "suggest" }>): Promise<AddressSuggestResponse> {
      if (!configured || !parseAddressLookupRequest(request)) return { state: "unavailable" };
      const response = await google(`${ORIGIN}/v1/places:autocomplete`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": configured.key, "X-Goog-FieldMask": AUTOCOMPLETE_MASK },
        body: JSON.stringify({ input: request.query, sessionToken: request.sessionToken, locationBias: WILSON_BIAS,
          includedPrimaryTypes: ["street_address", "premise", "subpremise"], includeQueryPredictions: false, languageCode: "en" }),
      });
      if ("state" in response) return response;
      const data = object(response.data);
      // Protobuf JSON can omit an empty repeated suggestions field.
      if (data && !Object.keys(data).length) return { state: "no_results" };
      if (!data || !Array.isArray(data.suggestions)) return { state: "unavailable" };
      if (!data.suggestions.length) return { state: "no_results" };
      const suggestions: AddressSuggestion[] = [];
      const seen = new Set<string>();
      for (const entry of data.suggestions.slice(0, ADDRESS_LOOKUP_LIMITS.suggestions)) {
        const p = object(object(entry)?.placePrediction), format = object(p?.structuredFormat);
        const id = p?.placeId, label = text(object(format?.mainText)?.text) || text(object(p?.text)?.text);
        const secondary = text(object(format?.secondaryText)?.text) ?? "";
        if (typeof id !== "string" || !PLACE_ID.test(id) || !label?.trim() || seen.has(id)) continue;
        seen.add(id);
        suggestions.push({ id, label, secondary, token: candidate(configured.secret, id, request, now()) });
      }
      return suggestions.length ? { state: "results", suggestions } : { state: "unavailable" };
    },
    async resolve(request: Extract<AddressLookupRequest, { operation: "resolve" }>): Promise<AddressResolveResponse> {
      if (!configured || !parseAddressLookupRequest(request)) return { state: "unavailable" };
      const id = resolveCandidate(configured.secret, request, now());
      if (!id) return { state: "unavailable" };
      const url = new URL(`${ORIGIN}/v1/places/${id}`);
      url.searchParams.set("sessionToken", request.sessionToken);
      url.searchParams.set("languageCode", "en");
      const response = await google(url.toString(), { method: "GET", headers: { "X-Goog-Api-Key": configured.key, "X-Goog-FieldMask": DETAILS_MASK } });
      if ("state" in response) return response;
      const data = object(response.data), label = text(data?.formattedAddress), address = components(data?.addressComponents);
      // Third-party attribution needs its own reviewed display path; never silently omit it.
      if (!data || data.id !== id || (data.attributions !== undefined && (!Array.isArray(data.attributions) || data.attributions.length))) return { state: "unavailable" };
      if (!label || !address) return { state: "no_results" };
      return { state: "resolved", result: { id, label, components: address } };
    },
  };
}
