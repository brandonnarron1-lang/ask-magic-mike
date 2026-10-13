import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingHomeValueRequest,
  readPendingHomeValueRequest,
  rememberPendingHomeValueRequest,
  type PendingHomeValueStorage,
} from "../../app/lib/homeValuePendingRequest";

const STORAGE_KEY = "amm_home_value_pending_request_v1";
const KEY = "a1234567-89ab-4cde-8f01-23456789abcd";
const NEW_KEY = "b1234567-89ab-4cde-9f01-23456789abcd";
const AT = "2026-10-12T19:00:00.000Z";
const marker = (key = KEY, at = AT) => JSON.stringify({ version: 1, key, at });

function store(initial: string | null = null) {
  const values = new Map<string, string>(initial === null ? [] : [[STORAGE_KEY, initial]]);
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("non-PII pending Home Value request marker", () => {
  it("persists only version, UUID key and ISO timestamp under one project-specific session key", () => {
    vi.useFakeTimers();
    vi.setSystemTime(AT);
    const storage = store();
    expect(rememberPendingHomeValueRequest(KEY, storage)).toBe(true);
    expect([...storage.values.keys()]).toEqual([STORAGE_KEY]);
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY, marker());
    const data = JSON.parse(storage.values.get(STORAGE_KEY)!);
    expect(Object.keys(data).sort()).toEqual(["at", "key", "version"]);
    expect(data).toEqual({ version: 1, key: KEY, at: AT });
    expect(readPendingHomeValueRequest(storage)).toEqual({ key: KEY, at: AT });
    expect(JSON.stringify(data)).not.toMatch(/contact|address|body|hash|consent|credential|token|email|phone/i);
  });

  it("restores the reference after a new module/full reload without any frozen body or retry authority", async () => {
    const storage = store(marker());
    vi.resetModules();
    const reloaded = await import("../../app/lib/homeValuePendingRequest");
    expect(reloaded.readPendingHomeValueRequest(storage)).toEqual({ key: KEY, at: AT });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("does not automatically expire old markers or reset future timestamps", () => {
    for (const at of ["2000-01-01T00:00:00.000Z", "2099-12-31T23:59:59.999Z"]) {
      const storage = store(marker(KEY, at));
      expect(readPendingHomeValueRequest(storage)).toEqual({ key: KEY, at });
      expect(storage.removeItem).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    }
  });

  it("normalizes UUID case without accepting whitespace or retimestamping the same key", () => {
    vi.useFakeTimers();
    vi.setSystemTime("2027-01-01T00:00:00.000Z");
    const storage = store(marker(KEY.toUpperCase()));
    expect(readPendingHomeValueRequest(storage)).toEqual({ key: KEY, at: AT });
    expect(rememberPendingHomeValueRequest(KEY.toUpperCase(), storage)).toBe(true);
    expect(JSON.parse(storage.values.get(STORAGE_KEY)!)).toEqual({ version: 1, key: KEY, at: AT });
  });

  it("returns copies so a consumer cannot change the in-memory guard", () => {
    const storage = store();
    storage.setItem.mockImplementation(() => { throw new Error("blocked"); });
    expect(rememberPendingHomeValueRequest(KEY, storage)).toBe(false);
    const restored = readPendingHomeValueRequest(storage)!;
    restored.key = NEW_KEY;
    restored.at = "corrupted";
    expect(readPendingHomeValueRequest(storage)?.key).toBe(KEY);
    expect(readPendingHomeValueRequest(storage)?.at).not.toBe("corrupted");
  });

  it.each([
    "", "not-a-uuid", "person@example.test", "100 Fictional Street", "2525550100",
    ` ${KEY}`, `${KEY} `, "00000000-0000-0000-0000-000000000000",
    "a1234567-89ab-0cde-8f01-23456789abcd", "a1234567-89ab-4cde-0f01-23456789abcd",
    null, undefined, 123, { key: KEY },
  ])("never persists an invalid/PII-like request key (%#)", (value) => {
    const storage = store(marker());
    expect(rememberPendingHomeValueRequest(value as string, storage)).toBe(false);
    clearPendingHomeValueRequest(value as string, storage);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.values.get(STORAGE_KEY)).toBe(marker());
  });

  it.each([
    "not JSON", "null", "true", "[]", '"text"', "{}", " ".repeat(257),
    JSON.stringify({ version: 2, key: KEY, at: AT }),
    JSON.stringify({ version: "1", key: KEY, at: AT }),
    JSON.stringify({ key: KEY, at: AT }),
    JSON.stringify({ version: 1, key: KEY }),
    JSON.stringify({ version: 1, key: KEY, at: AT, email: "person@example.test" }),
    JSON.stringify({ version: 1, key: KEY, at: AT, body: { consent: true } }),
    JSON.stringify({ version: 1, key: KEY, at: AT, hash: "not-permitted" }),
    JSON.stringify({ version: 1, key: KEY, at: AT, __proto__: null, constructor: "unexpected" }),
    marker("person@example.test"), marker("00000000-0000-0000-0000-000000000000"),
    marker(KEY, "2026-02-30T19:00:00.000Z"), marker(KEY, "2026-13-12T19:00:00.000Z"),
    marker(KEY, "2026-10-12"), marker(KEY, "2026-10-12T19:00:00Z"),
    marker(KEY, "2026-10-12T19:00:00.000+00:00"),
    JSON.stringify({ version: 1, key: KEY, at: 123 }),
  ])("rejects malformed/extended storage without logging, expiry, or automatic deletion (%#)", (raw) => {
    const storage = store(raw);
    const log = vi.spyOn(console, "log");
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    expect(readPendingHomeValueRequest(storage)).toBeNull();
    clearPendingHomeValueRequest(KEY, storage);
    expect(storage.values.get(STORAGE_KEY)).toBe(raw);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("clears only the matching stored UUID, including equivalent upper-case UUIDs", () => {
    const storage = store(marker());
    clearPendingHomeValueRequest(NEW_KEY, storage);
    expect(storage.values.get(STORAGE_KEY)).toBe(marker());
    clearPendingHomeValueRequest(KEY.toUpperCase(), storage);
    expect(storage.values.has(STORAGE_KEY)).toBe(false);
    expect(readPendingHomeValueRequest(storage)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith(STORAGE_KEY);
  });

  it("cannot let a stale response clear a newer remembered pending request", () => {
    const storage = store();
    expect(rememberPendingHomeValueRequest(KEY, storage)).toBe(true);
    expect(rememberPendingHomeValueRequest(NEW_KEY, storage)).toBe(true);
    clearPendingHomeValueRequest(KEY, storage);
    expect(readPendingHomeValueRequest(storage)?.key).toBe(NEW_KEY);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("rechecks durable storage before clearing, even when memory still holds an older marker", () => {
    const storage = store(marker());
    expect(readPendingHomeValueRequest(storage)?.key).toBe(KEY);
    storage.values.set(STORAGE_KEY, marker(NEW_KEY));
    clearPendingHomeValueRequest(KEY, storage);
    expect(readPendingHomeValueRequest(storage)?.key).toBe(NEW_KEY);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("keeps unrelated injected storage contexts isolated", () => {
    const first = store(marker());
    const second = store(marker(NEW_KEY));
    clearPendingHomeValueRequest(KEY, first);
    expect(readPendingHomeValueRequest(first)).toBeNull();
    expect(readPendingHomeValueRequest(second)?.key).toBe(NEW_KEY);
  });
});

describe("blocked storage and server-safe behavior", () => {
  it("returns false for blocked writes while retaining a matching in-memory guard", () => {
    const storage = store();
    storage.setItem.mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    expect(rememberPendingHomeValueRequest(KEY, storage)).toBe(false);
    expect(storage.values.size).toBe(0);
    expect(readPendingHomeValueRequest(storage)?.key).toBe(KEY);
    clearPendingHomeValueRequest(NEW_KEY, storage);
    expect(readPendingHomeValueRequest(storage)?.key).toBe(KEY);
    clearPendingHomeValueRequest(KEY, storage);
    expect(readPendingHomeValueRequest(storage)).toBeNull();
  });

  it("does not claim persistence when a storage write silently fails verification", () => {
    const storage = store();
    storage.setItem.mockImplementation(() => {});
    expect(rememberPendingHomeValueRequest(KEY, storage)).toBe(false);
    expect(readPendingHomeValueRequest(storage)?.key).toBe(KEY);
  });

  it("keeps the newer volatile marker even when an old durable value survives a failed write", () => {
    const storage = store(marker());
    expect(readPendingHomeValueRequest(storage)?.key).toBe(KEY);
    storage.setItem.mockImplementation(() => { throw new Error("quota"); });
    expect(rememberPendingHomeValueRequest(NEW_KEY, storage)).toBe(false);
    clearPendingHomeValueRequest(KEY, storage);
    expect(readPendingHomeValueRequest(storage)?.key).toBe(NEW_KEY);
    expect(storage.values.get(STORAGE_KEY)).toBe(marker());
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("catches failed reads and does not remove an unreadable marker", () => {
    const storage = store();
    expect(rememberPendingHomeValueRequest(KEY, storage)).toBe(true);
    storage.getItem.mockImplementation(() => { throw new Error("blocked"); });
    expect(readPendingHomeValueRequest(storage)?.key).toBe(KEY);
    clearPendingHomeValueRequest(KEY, storage);
    expect(readPendingHomeValueRequest(storage)).toBeNull();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.values.has(STORAGE_KEY)).toBe(true);
  });

  it("retains the guard if removal throws rather than silently claiming it was cleared", () => {
    const storage = store(marker());
    storage.removeItem.mockImplementation(() => { throw new Error("blocked"); });
    expect(() => clearPendingHomeValueRequest(KEY, storage)).not.toThrow();
    expect(readPendingHomeValueRequest(storage)?.key).toBe(KEY);
    expect(storage.values.get(STORAGE_KEY)).toBe(marker());
  });

  it("catches a third-party sessionStorage getter refusal and explicitly degrades to volatile memory", async () => {
    vi.resetModules();
    const pendingHelper = await import("../../app/lib/homeValuePendingRequest");
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    expect(pendingHelper.readPendingHomeValueRequest()).toBeNull();
    expect(pendingHelper.rememberPendingHomeValueRequest(KEY)).toBe(false);
    expect(pendingHelper.readPendingHomeValueRequest()?.key).toBe(KEY);
    pendingHelper.clearPendingHomeValueRequest(NEW_KEY);
    expect(pendingHelper.readPendingHomeValueRequest()?.key).toBe(KEY);
    pendingHelper.clearPendingHomeValueRequest(KEY);
    expect(pendingHelper.readPendingHomeValueRequest()).toBeNull();
  });

  it("default browser calls use only sessionStorage, not cookies or persistent localStorage", async () => {
    vi.resetModules();
    const pendingHelper = await import("../../app/lib/homeValuePendingRequest");
    window.sessionStorage.clear();
    const localStorage = vi.spyOn(window, "localStorage", "get");
    const cookie = vi.spyOn(document, "cookie", "set");
    expect(pendingHelper.rememberPendingHomeValueRequest(KEY)).toBe(true);
    expect(window.sessionStorage.length).toBe(1);
    expect(window.sessionStorage.key(0)).toBe(STORAGE_KEY);
    expect(Object.keys(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)!)).sort()).toEqual(["at", "key", "version"]);
    pendingHelper.clearPendingHomeValueRequest(KEY);
    expect(pendingHelper.readPendingHomeValueRequest()).toBeNull();
    expect(localStorage).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
    window.sessionStorage.clear();
  });

  it("SSR calls are inert and never retain module-global pending data across requests", async () => {
    vi.resetModules();
    const pendingHelper = await import("../../app/lib/homeValuePendingRequest");
    vi.stubGlobal("window", undefined);
    expect(pendingHelper.readPendingHomeValueRequest()).toBeNull();
    expect(pendingHelper.rememberPendingHomeValueRequest(KEY)).toBe(false);
    expect(() => pendingHelper.clearPendingHomeValueRequest(KEY)).not.toThrow();
    expect(pendingHelper.readPendingHomeValueRequest()).toBeNull();
    expect(pendingHelper.readPendingHomeValueRequest(null)).toBeNull();
    expect(pendingHelper.rememberPendingHomeValueRequest(KEY, null)).toBe(false);
  });

  it("accepts a narrow explicit storage double without browser globals", () => {
    vi.stubGlobal("window", undefined);
    const storage: PendingHomeValueStorage = store();
    expect(rememberPendingHomeValueRequest(KEY, storage)).toBe(true);
    expect(readPendingHomeValueRequest(storage)?.key).toBe(KEY);
    clearPendingHomeValueRequest(KEY, storage);
    expect(readPendingHomeValueRequest(storage)).toBeNull();
  });
});
