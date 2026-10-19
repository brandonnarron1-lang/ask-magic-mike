import type { SecureStore } from "./localPlan";

/** Native operations only; no AsyncStorage, filesystem or memory fallback. */
export interface NativeProtectedDriver {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
export const CHUNK_BYTES = 1536;
export const MAX_CHUNKS = 64;
export const MAX_PROTECTED_BYTES = CHUNK_BYTES * MAX_CHUNKS;
type Manifest = { v: 1; bank: 0 | 1; count: number; bytes: number };
const unavailable = () => Error("Protected device storage unavailable; existing data was not replaced.");

export function utf8Bytes(value: string): number {
  let size = 0;
  for (const char of value) {
    const point = char.codePointAt(0)!;
    if (point >= 0xd800 && point <= 0xdfff) throw unavailable();
    size += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return size;
}
function chunks(value: string): string[] {
  if (utf8Bytes(value) > MAX_PROTECTED_BYTES) throw unavailable();
  const result: string[] = [];
  let current = "", size = 0;
  for (const char of value) {
    const bytes = utf8Bytes(char);
    if (size + bytes > CHUNK_BYTES) { result.push(current); current = ""; size = 0; }
    current += char; size += bytes;
  }
  if (current || !result.length) result.push(current);
  if (result.length > MAX_CHUNKS) throw unavailable();
  return result;
}
function manifest(raw: string | null): Manifest | null {
  if (raw === null) return null;
  if (raw.length > 150) throw unavailable();
  const v = JSON.parse(raw) as Manifest;
  if (!v || v.v !== 1 || (v.bank !== 0 && v.bank !== 1) || !Number.isSafeInteger(v.count)
      || v.count < 1 || v.count > MAX_CHUNKS || !Number.isSafeInteger(v.bytes)
      || v.bytes < 0 || v.bytes > MAX_PROTECTED_BYTES || Object.keys(v).length !== 4) throw unavailable();
  return v;
}

/** One process/driver instance, serialized per logical key. Native writes must
 * atomically replace ONE small SecureStore item. Write the inactive bounded
 * bank first, then commit the small manifest. A crash exposes old OR complete
 * new data, never a mix. Two encrypted banks bound crash leftovers; explicit
 * remove clears both. Not a cross-process transaction or native crash proof. */
export function createProtectedStore(driver: NativeProtectedDriver): SecureStore {
  const tails = new Map<string, Promise<void>>();
  function locked<T>(key: string, work: (base: string) => Promise<T>): Promise<T> {
    if (!/^amm-r3-[a-zA-Z0-9._-]{1,120}$/.test(key)) return Promise.reject(unavailable());
    const next = (tails.get(key) ?? Promise.resolve()).then(() => work(`r3.${key}`));
    const settled = next.then(() => {}, () => {});
    tails.set(key, settled);
    void settled.then(() => { if (tails.get(key) === settled) tails.delete(key); });
    return next;
  }
  const part = (base: string, bank: number, i: number) => `${base}.b${bank}.${i}`;
  return {
    getItem(key) { return locked(key, async base => {
      const head = manifest(await driver.get(`${base}.head`));
      if (!head) return null;
      let value = "";
      for (let i = 0; i < head.count; i++) {
        const chunk = await driver.get(part(base, head.bank, i));
        if (chunk === null || utf8Bytes(chunk) > CHUNK_BYTES) throw unavailable();
        value += chunk;
      }
      if (utf8Bytes(value) !== head.bytes) throw unavailable();
      return value;
    }); },
    setItem(key, value) { return locked(key, async base => {
      const pieces = chunks(value); // Validate BEFORE touching native storage.
      const old = manifest(await driver.get(`${base}.head`));
      const bank = old?.bank === 0 ? 1 : 0;
      // Reclaim even interrupted writes; never mutate the current active bank.
      for (let i = 0; i < MAX_CHUNKS; i++) await driver.remove(part(base, bank, i));
      for (let i = 0; i < pieces.length; i++) await driver.set(part(base, bank, i), pieces[i]);
      const head: Manifest = { v: 1, bank, count: pieces.length, bytes: utf8Bytes(value) };
      // Do not clean either bank on a rejected/ambiguous commit acknowledgment.
      await driver.set(`${base}.head`, JSON.stringify(head));
    }); },
    removeItem(key) { return locked(key, async base => {
      // Unpublish first. A native cleanup failure rejects, never claims erasure.
      await driver.remove(`${base}.head`);
      for (const bank of [0, 1]) for (let i = 0; i < MAX_CHUNKS; i++) await driver.remove(part(base, bank, i));
    }); },
  };
}
