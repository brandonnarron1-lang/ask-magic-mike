export type PendingHomeValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type PendingHomeValueRequest = { key: string; at: string };

const STORAGE_KEY = "amm_home_value_pending_request_v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type Memory = { pending: PendingHomeValueRequest | null; volatile: boolean };
type Access = { storage: PendingHomeValueStorage | null; memory: Memory };
const browserMemory: Memory = { pending: null, volatile: false };
const injectedMemory = new WeakMap<PendingHomeValueStorage, Memory>();

function normalizeKey(key: unknown) {
  return typeof key === "string" && UUID.test(key) ? key.toLowerCase() : null;
}

function parse(raw: string | null): PendingHomeValueRequest | null {
  if (typeof raw !== "string" || raw.length > 256) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const record = data as Record<string, unknown>;
    if (Object.keys(record).sort().join(",") !== "at,key,version" || record.version !== 1) return null;
    const key = normalizeKey(record.key);
    if (!key || typeof record.at !== "string" || !TIMESTAMP.test(record.at) ||
      new Date(record.at).toISOString() !== record.at) return null;
    // No age/future comparison: uncertainty never expires into a fresh capture.
    return { key, at: record.at };
  } catch {
    return null;
  }
}

function access(storage?: PendingHomeValueStorage | null): Access | null {
  if (storage != null) {
    let memory = injectedMemory.get(storage);
    if (!memory) {
      memory = { pending: null, volatile: false };
      injectedMemory.set(storage, memory);
    }
    return { storage, memory };
  }
  // Never retain cross-request memory during SSR. Explicit test storage is
  // independently scoped; no browser property is accessed on the server.
  if (typeof window === "undefined") return null;
  if (storage === null) return { storage: null, memory: browserMemory };
  try {
    return { storage: window.sessionStorage, memory: browserMemory };
  } catch {
    return { storage: null, memory: browserMemory };
  }
}

function copy(pending: PendingHomeValueRequest | null) {
  return pending ? { ...pending } : null;
}

/** Recovery/reference guard only. This marker is never a saved receipt,
 * retry payload, consent record, identity credential, or write authority. */
export function readPendingHomeValueRequest(storage?: PendingHomeValueStorage | null): PendingHomeValueRequest | null {
  const context = access(storage);
  if (!context) return null;
  if (!context.storage || (context.memory.volatile && context.memory.pending)) return copy(context.memory.pending);
  try {
    const pending = parse(context.storage.getItem(STORAGE_KEY));
    context.memory.pending = pending;
    context.memory.volatile = false;
    return copy(pending);
  } catch {
    return copy(context.memory.pending);
  }
}

/** True means verified session persistence. False may retain ONLY a volatile
 * in-document guard; it cannot promise restoration after a full reload. */
export function rememberPendingHomeValueRequest(key: string, storage?: PendingHomeValueStorage | null): boolean {
  const normalized = normalizeKey(key);
  if (!normalized) return false;
  const context = access(storage);
  if (!context) return false;
  const previous = readPendingHomeValueRequest(storage);
  let pending: PendingHomeValueRequest;
  try {
    pending = previous?.key === normalized ? previous : { key: normalized, at: new Date().toISOString() };
    if (!TIMESTAMP.test(pending.at)) return false;
  } catch {
    return false;
  }
  context.memory.pending = pending;
  context.memory.volatile = true;
  if (!context.storage) return false;
  try {
    context.storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, key: pending.key, at: pending.at }));
    const stored = parse(context.storage.getItem(STORAGE_KEY));
    if (stored?.key !== pending.key || stored.at !== pending.at) return false;
    context.memory.volatile = false;
    return true;
  } catch {
    return false;
  }
}

/** Only a caller-validated outcome may clear the matching request reference.
 * A late response for an older key must never erase a newer pending marker. */
export function clearPendingHomeValueRequest(key: string, storage?: PendingHomeValueStorage | null): void {
  const normalized = normalizeKey(key);
  if (!normalized) return;
  const context = access(storage);
  if (!context || (context.memory.pending && context.memory.pending.key !== normalized)) return;
  if (context.storage) {
    let stored: PendingHomeValueRequest | null;
    try {
      stored = parse(context.storage.getItem(STORAGE_KEY));
    } catch {
      // A matching volatile guard can be cleared explicitly, but do not delete
      // an unreadable stored value that might belong to a newer request.
      if (context.memory.pending?.key === normalized) context.memory.pending = null;
      return;
    }
    if (stored && stored.key !== normalized) {
      context.memory.pending = stored;
      context.memory.volatile = false;
      return;
    }
    if (stored) {
      try {
        context.storage.removeItem(STORAGE_KEY);
      } catch {
        context.memory.pending = stored;
        context.memory.volatile = true;
        return;
      }
    }
    // Malformed storage is neither accepted nor automatically deleted.
  }
  if (context.memory.pending?.key === normalized) context.memory.pending = null;
  context.memory.volatile = false;
}
