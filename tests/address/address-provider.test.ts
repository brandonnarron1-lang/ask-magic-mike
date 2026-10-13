// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADDRESS_LOOKUP_LIMITS, createAddressProvider, getAddressLookupCapability,
  parseAddressLookupRequest, readAddressLookupBody } from "../../app/lib/address/addressProvider";
import { GET, POST } from "../../app/api/address-suggestions/route";
import { checkRateLimit } from "../../src/lib/security/rate-limit";

vi.mock("../../src/lib/security/rate-limit", () => ({
  checkRateLimit: vi.fn(), LIMITS: { addressLookup: { limit: 30, windowMs: 60_000 } },
  rateLimitKey: (value: string | null) => value?.split(",")[0].trim() || "anonymous",
}));

const session = "10000000-0000-4000-8000-000000000001";
const otherSession = "10000000-0000-4000-8000-000000000002";
const query = "100 Synthetic Fixture Road";
const production = { VERCEL_ENV: "production", ADDRESS_LOOKUP_ENABLED: "true",
  ADDRESS_GOOGLE_CONTENT_USE_APPROVED: "true", GOOGLE_PLACES_API_KEY: "fictional-offline-key",
  ADDRESS_LOOKUP_SIGNING_SECRET: "fictional-offline-signing-secret-not-a-real-key" };
const suggest = { operation: "suggest" as const, query, sessionToken: session };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const prediction = (id = "synthetic_place_1") => ({ placePrediction: { placeId: id,
  text: { text: "100 Synthetic Fixture Road, Fictional City" }, structuredFormat: {
    mainText: { text: "100 Synthetic Fixture Road" }, secondaryText: { text: "Fictional City, OR" },
  } } });
const part = (type: string, longText: string, shortText = longText) => ({ types: [type], longText, shortText });
const detail = (id = "synthetic_place_1") => ({ id, formattedAddress: "100 Synthetic Fixture Road, Unit 4, Fictional City, OR 97000, USA",
  addressComponents: [part("street_number", "100"), part("route", "Synthetic Fixture Road"), part("subpremise", "4"),
    part("locality", "Fictional City"), part("administrative_area_level_1", "Oregon", "OR"), part("postal_code", "97000"), part("country", "United States", "US")] });
const offline = (response: unknown = { suggestions: [prediction()] }) => vi.fn<typeof fetch>().mockImplementation(async () => json(response));
const bodyRequest = (body: unknown, origin: string | null = "https://www.askmagicmike.com", extra: Record<string, string> = {}) =>
  new Request("https://www.askmagicmike.com/api/address-suggestions", { method: "POST",
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}), ...extra }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  for (const [key, value] of Object.entries(production)) vi.stubEnv(key, value);
  vi.stubEnv("PREVIEW_URL", "");
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 29, resetAt: Date.now() + 60_000, durable: true });
  // Every test has an explicit offline fetch, including route tests. No real provider call.
  vi.stubGlobal("fetch", offline());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("disabled-by-default provider and strict address-only contract", () => {
  it("requires every explicit gate and exposes only categorical capability", () => {
    expect(getAddressLookupCapability({})).toEqual({ enabled: false });
    expect(getAddressLookupCapability(production)).toEqual({ enabled: true });
    for (const key of ["ADDRESS_LOOKUP_ENABLED", "ADDRESS_GOOGLE_CONTENT_USE_APPROVED", "GOOGLE_PLACES_API_KEY", "ADDRESS_LOOKUP_SIGNING_SECRET"]) {
      expect(getAddressLookupCapability({ ...production, [key]: undefined }).enabled).toBe(false);
    }
    expect(getAddressLookupCapability({ ...production, ADDRESS_LOOKUP_ENABLED: "1" }).enabled).toBe(false);
    expect(getAddressLookupCapability({ ...production, ADDRESS_LOOKUP_SIGNING_SECRET: "x".repeat(31) }).enabled).toBe(false);
  });

  it.each(["preview", "development", "unknown", ""])("never makes cloud calls for runtime %s", async VERCEL_ENV => {
    const fetcher = offline();
    const provider = createAddressProvider({ env: { ...production, VERCEL_ENV, NODE_ENV: "production", VERCEL: "1" }, fetch: fetcher });
    expect(await provider.suggest(suggest)).toEqual({ state: "unavailable" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("permits only explicit non-cloud local test mocks, never a local activation flag", async () => {
    const env = { ...production, VERCEL_ENV: "development", NODE_ENV: "test" };
    const fetcher = offline();
    expect(getAddressLookupCapability(env).enabled).toBe(false);
    expect(await createAddressProvider({ env, fetch: fetcher }).suggest(suggest)).toMatchObject({ state: "results" });
    expect(await createAddressProvider({ env }).suggest(suggest)).toEqual({ state: "unavailable" });
    expect(await createAddressProvider({ env: { ...env, PREVIEW_URL: "https://synthetic-preview.example.test" }, fetch: fetcher }).suggest(suggest)).toEqual({ state: "unavailable" });
    expect(await createAddressProvider({ env: { ...production, PREVIEW_URL: "https://synthetic-preview.example.test" }, fetch: fetcher }).suggest(suggest)).toEqual({ state: "unavailable" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    {}, [], { ...suggest, name: "SYNTHETIC CONTACT" }, { ...suggest, email: "fixture@example.test" },
    { ...suggest, operation: "other" }, { ...suggest, query: " " }, { ...suggest, query: "x".repeat(501) },
    { ...suggest, query: "synthetic\naddress" }, { ...suggest, sessionToken: "not-a-uuid" },
    { ...suggest, operation: "resolve", candidateToken: "x".repeat(1_025) },
  ])("rejects unexpected or unbounded input before lookup (%#)", input => {
    expect(parseAddressLookupRequest(input)).toBeNull();
  });
});

describe("Google REST New fixture boundary", () => {
  it("uses a fixed endpoint, minimal masks, explicit Wilson bias and address-only data", async () => {
    const fetcher = offline();
    const result = await createAddressProvider({ env: production, fetch: fetcher }).suggest(suggest);
    expect(result.state).toBe("results");
    if (result.state !== "results") throw new Error("fixture_result_missing");
    expect(result.suggestions[0]).toMatchObject({ id: "synthetic_place_1", label: "100 Synthetic Fixture Road", secondary: "Fictional City, OR" });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:autocomplete");
    expect(init).toMatchObject({ method: "POST", cache: "no-store", redirect: "error", credentials: "omit", referrerPolicy: "no-referrer" });
    expect(new Headers(init?.headers).get("X-Goog-FieldMask")).toBe("suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text,suggestions.placePrediction.text.text");
    expect(JSON.parse(String(init?.body))).toEqual({ input: query, sessionToken: session,
      locationBias: { circle: { center: { latitude: 35.7213, longitude: -77.9155 }, radius: 50_000 } },
      includedPrimaryTypes: ["street_address", "premise", "subpremise"], includeQueryPredictions: false, languageCode: "en" });
    const tokenPayload = JSON.parse(Buffer.from(result.suggestions[0].token.split(".")[1], "base64url").toString());
    expect(JSON.stringify(tokenPayload)).not.toContain(query);
    expect(JSON.stringify(tokenPayload)).not.toContain(session);
  });

  it("bounds and deduplicates suggestions and rejects arbitrary provider identifiers", async () => {
    const fetcher = offline({ suggestions: [prediction(), prediction(), prediction("https://attacker.test/"), prediction("safe_2"), prediction("safe_3"), prediction("safe_4")] });
    expect(await createAddressProvider({ env: production, fetch: fetcher }).suggest(suggest)).toMatchObject({ state: "results", suggestions: [{ id: "synthetic_place_1" }, { id: "safe_2" }, { id: "safe_3" }] });
  });

  it.each([{ suggestions: [] }, {}])("returns truthful no-results for empty protobuf JSON (%#)", async response => {
    expect(await createAddressProvider({ env: production, fetch: offline(response) }).suggest(suggest)).toEqual({ state: "no_results" });
  });

  it("resolves the exact issued candidate/session with actual components, including out-of-area/unit values", async () => {
    const fetcher = offline();
    fetcher.mockImplementationOnce(async () => json({ suggestions: [prediction()] })).mockImplementationOnce(async () => json(detail()));
    const provider = createAddressProvider({ env: production, fetch: fetcher });
    const issued = await provider.suggest(suggest);
    if (issued.state !== "results") throw new Error("fixture_result_missing");
    expect(await provider.resolve({ ...suggest, operation: "resolve", candidateToken: issued.suggestions[0].token })).toEqual({ state: "resolved", result: {
      id: "synthetic_place_1", label: detail().formattedAddress,
      components: { line1: "100 Synthetic Fixture Road", line2: "4", locality: "Fictional City", region: "OR", postalCode: "97000", country: "US" },
    } });
    const [url, init] = fetcher.mock.calls[1];
    expect(String(url)).toBe(`https://places.googleapis.com/v1/places/synthetic_place_1?sessionToken=${session}&languageCode=en`);
    expect(new Headers(init?.headers).get("X-Goog-FieldMask")).toBe("id,formattedAddress,addressComponents,attributions");
    expect(init?.body).toBeUndefined();
  });

  it("rejects changed query/session, tampered, expired and arbitrary-URL tokens without another fetch", async () => {
    const fetcher = offline();
    let now = 1_000_000;
    const provider = createAddressProvider({ env: production, fetch: fetcher, now: () => now });
    const issued = await provider.suggest(suggest);
    if (issued.state !== "results") throw new Error("fixture_result_missing");
    const request = { ...suggest, operation: "resolve" as const, candidateToken: issued.suggestions[0].token };
    for (const input of [{ ...request, query: query + " changed" }, { ...request, sessionToken: otherSession },
      { ...request, candidateToken: request.candidateToken + "x" }, { ...request, candidateToken: "https://attacker.test/place" }]) {
      expect(await provider.resolve(input)).toEqual({ state: "unavailable" });
    }
    now += ADDRESS_LOOKUP_LIMITS.candidateTtlMs;
    expect(await provider.resolve(request)).toEqual({ state: "unavailable" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(["wrong-id", "unsupported-attribution", "no-route", "oversized-component"])("fails atomically for %s details", async scenario => {
    const response = { ...detail(), ...(scenario === "wrong-id" ? { id: "other_id" } : {}),
      ...(scenario === "unsupported-attribution" ? { attributions: [{ provider: "synthetic third party" }] } : {}),
      addressComponents: scenario === "no-route" ? [] : scenario === "oversized-component" ? [part("route", "x".repeat(201))] : detail().addressComponents };
    const fetcher = offline();
    fetcher.mockImplementationOnce(async () => json({ suggestions: [prediction()] })).mockImplementationOnce(async () => json(response));
    const provider = createAddressProvider({ env: production, fetch: fetcher });
    const issued = await provider.suggest(suggest);
    if (issued.state !== "results") throw new Error("fixture_result_missing");
    const result = await provider.resolve({ ...suggest, operation: "resolve", candidateToken: issued.suggestions[0].token });
    expect(result.state).toBe(scenario === "wrong-id" || scenario === "unsupported-attribution" ? "unavailable" : "no_results");
    expect(result).not.toHaveProperty("result");
  });

  it("does not invent absent postal or unit fields", async () => {
    const fetcher = offline();
    fetcher.mockImplementationOnce(async () => json({ suggestions: [prediction()] })).mockImplementationOnce(async () => json({ ...detail(), addressComponents: detail().addressComponents.filter(p => !["postal_code", "subpremise"].includes(p.types[0])) }));
    const provider = createAddressProvider({ env: production, fetch: fetcher });
    const issued = await provider.suggest(suggest);
    if (issued.state !== "results") throw new Error("fixture_result_missing");
    expect(await provider.resolve({ ...suggest, operation: "resolve", candidateToken: issued.suggestions[0].token })).toMatchObject({ state: "resolved", result: { components: { line2: "", postalCode: "" } } });
  });

  it.each([429, 403, 500])("categorizes HTTP %s without disclosing provider errors", async status => {
    const result = await createAddressProvider({ env: production, fetch: vi.fn<typeof fetch>().mockResolvedValue(json({ raw: query }, status)) }).suggest(suggest);
    expect(result).toEqual({ state: status === 429 ? "rate_limited" : "unavailable" });
  });

  it.each([new Response("not-json", { headers: { "Content-Type": "application/json" } }),
    new Response("html", { headers: { "Content-Type": "text/html" } }),
    json({ suggestions: "invalid" }), new Response("x".repeat(ADDRESS_LOOKUP_LIMITS.responseBytes + 1), { headers: { "Content-Type": "application/json" } })])("bounds invalid provider responses (%#)", async response => {
    expect(await createAddressProvider({ env: production, fetch: vi.fn<typeof fetch>().mockResolvedValue(response) }).suggest(suggest)).toEqual({ state: "unavailable" });
  });

  it("times out and aborts even a fetch mock that ignores its signal", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
    const pending = createAddressProvider({ env: production, fetch: fetcher }).suggest(suggest);
    await vi.advanceTimersByTimeAsync(ADDRESS_LOOKUP_LIMITS.providerTimeoutMs);
    expect(await pending).toEqual({ state: "unavailable" });
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("bounds a request stream that never finishes", async () => {
    vi.useFakeTimers();
    const pending = readAddressLookupBody(new ReadableStream({ start() {} }), 100, 1_000).catch(() => "categorical_failure");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await pending).toBe("categorical_failure");
  });

  it("cancels a pending lookup and never calls a provider for an already-aborted caller", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
    const provider = createAddressProvider({ env: production, fetch: fetcher, signal: controller.signal });
    const pending = provider.suggest(suggest);
    controller.abort();
    expect(await pending).toEqual({ state: "unavailable" });
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(await provider.suggest(suggest)).toEqual({ state: "unavailable" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("address lookup route privacy, origin and durable rate gates", () => {
  it("GET has no provider/limiter calls or key/secret disclosure", async () => {
    const response = GET();
    expect(await response.json()).toEqual({ enabled: true });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("Preview and disabled requests stop before database limiting or Google", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await POST(bodyRequest(suggest))).status).toBe(503);
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("ADDRESS_LOOKUP_ENABLED", "false");
    expect((await POST(bodyRequest(suggest))).status).toBe(503);
    expect(checkRateLimit).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });

  it.each([null, "https://attacker.example.test", "https://askmagicmike.com"])("rejects missing or non-same origin %s", async origin => {
    expect((await POST(bodyRequest(suggest, origin))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("strictly rejects non-address input, media types and oversized bodies", async () => {
    expect((await POST(bodyRequest({ ...suggest, email: "synthetic@example.test" }))).status).toBe(400);
    expect((await POST(bodyRequest(suggest, undefined, { "Content-Type": "text/plain" }))).status).toBe(415);
    expect((await POST(bodyRequest(suggest, undefined, { "Content-Length": "9000" }))).status).toBe(413);
    expect((await POST(bodyRequest({ ...suggest, query: "x".repeat(9_000) }))).status).toBe(400);
    expect(checkRateLimit).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed for non-durable Production even with emergency memory acknowledged", async () => {
    vi.stubEnv("RATE_LIMIT_EMERGENCY_MEMORY", "1");
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 29, resetAt: Date.now() + 60_000, durable: false });
    const response = await POST(bodyRequest(suggest));
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "unavailable" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns finite retry guidance and no provider calls when server limiting rejects", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 120_000, durable: true });
    const response = await POST(bodyRequest(suggest));
    expect(response.status).toBe(429); expect(await response.json()).toEqual({ state: "rate_limited" });
    expect(response.headers.get("Retry-After")).toBe("60"); expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the address-only durable partition and relays only filtered suggestions", async () => {
    const response = await POST(bodyRequest(suggest));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ state: "results", suggestions: [{ id: "synthetic_place_1" }] });
    expect(checkRateLimit).toHaveBeenCalledWith("anonymous", 30, 60_000, "addressLookup");
  });

  it("returns the UI resolved/result contract from the same query and candidate token", async () => {
    const fetcher = offline();
    fetcher.mockImplementationOnce(async () => json({ suggestions: [prediction()] })).mockImplementationOnce(async () => json(detail()));
    vi.stubGlobal("fetch", fetcher);
    const issued = await (await POST(bodyRequest(suggest))).json();
    const response = await POST(bodyRequest({ ...suggest, operation: "resolve", candidateToken: issued.suggestions[0].token }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: "resolved", result: { id: "synthetic_place_1", components: { region: "OR" } } });
  });

  it("fails closed within a finite deadline when the shared limiter stalls", async () => {
    vi.useFakeTimers();
    vi.mocked(checkRateLimit).mockImplementation(() => new Promise(() => {}));
    const pending = POST(bodyRequest(suggest));
    await vi.advanceTimersByTimeAsync(ADDRESS_LOOKUP_LIMITS.rateLimitTimeoutMs);
    const response = await pending;
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ state: "unavailable" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
