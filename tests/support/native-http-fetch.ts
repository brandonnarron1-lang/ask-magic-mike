import { request } from "node:http";
import { Readable } from "node:stream";
import type { NativeFetch } from "../../clients/native/nativeHttp";

/** Actual loopback HTTP, not a result mock. Node's browser-shaped fetch adds
 * Sec-Fetch-Mode automatically, unlike native URLSession/OkHttp. Use the bare
 * supported HTTP transport instead of weakening the native context boundary or
 * spoofing a browser Origin. Never accepts a remote host or follows redirects.
 */
export const nativeLoopbackFetch: NativeFetch = (url, init) => new Promise((resolve, reject) => {
  const target = new URL(url);
  if (target.protocol !== "http:" || target.hostname !== "127.0.0.1" || !target.port || target.username || target.password) return reject(Error("owned_loopback_transport_required"));
  const req = request(target, { method: init.method, headers: init.headers, signal: init.signal }, response => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(response.headers)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) headers.append(key, item);
    resolve({ status: response.statusCode || 0, url, redirected: false, headers,
      body: Readable.toWeb(response) as ReadableStream<Uint8Array> });
  });
  req.once("error", reject); req.end(init.body);
});
