import "server-only";
import { betaWindow, validBetaOrigin } from "./beta-contract";
import { nativeRequestContext } from "./native-feedback";
import { readR2Viewer } from "./viewer";

/** Separate synthetic venue only. No account creation, new session, provider,
 * copied Production credential or staff authentication path. Approved testers
 * receive their own guest credential outside the package. Revocation is read
 * from the existing canonical guest session on EVERY request. */
export async function betaViewer(request: Request, now = Date.now()) {
  if (process.env.AMM_NATIVE_BETA_MODE !== "synthetic-v1") throw Error("beta_disabled");
  const window = betaWindow(JSON.parse(process.env.AMM_NATIVE_BETA_WINDOW || "null"));
  if (process.env.VERCEL_GIT_COMMIT_SHA !== window.source || request.headers.get("x-amm-beta-source") !== window.source) throw Error("beta_source_mismatch");
  const origin = process.env.AMM_NATIVE_BETA_ORIGIN || "";
  if (!validBetaOrigin(origin) || now < window.createdAt || now >= window.expiresAt || new URL(request.url).origin !== origin
    || !nativeRequestContext(request) || request.headers.has("authorization")) throw Error("beta_unavailable");
  // Exact native guest jar only. No account/staff cookie may enter this venue.
  if (!/^amm-r2-guest=[A-Za-z0-9_-]{43}$/.test(request.headers.get("cookie") || "")) throw Error("beta_access_required");
  const allowed: unknown = JSON.parse(process.env.AMM_NATIVE_BETA_SCOPES || "[]");
  if (!Array.isArray(allowed) || allowed.length > 10 || allowed.some(s => typeof s !== "string" || !/^guest:[a-f0-9]{64}$/.test(s))) throw Error("beta_configuration_unavailable");
  const viewer = await readR2Viewer(request);
  if (!viewer || viewer.consumerUserId || viewer.consumerSessionId || !allowed.includes(viewer.ownerScope)) throw Error("beta_access_required");
  return { viewer, window };
}
