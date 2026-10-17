import "server-only";
import { createHmac } from "node:crypto";
import { Pool } from "pg";
import { assertDatabaseMutationAllowed } from "../preview-security";
import { durableRateLimitDedicatedSecretReady } from "../security/rate-limit";
import { isApprovedAskMagicMikeOrigin } from "../../../app/lib/publicOrigin";

export function consumerRuntimeReady(env: NodeJS.ProcessEnv = process.env) {
  return env.CONSUMER_WORKSPACE_ACCOUNTS_ENABLED === "true" && Boolean(env.DATABASE_URL) && (env.BETTER_AUTH_SECRET?.trim().length || 0) >= 32 && durableRateLimitDedicatedSecretReady(env) && assertDatabaseMutationAllowed(env).ok;
}
export function consumerAuthSecret(secret: string) {
  if (secret.trim().length < 32) throw new Error("consumer_auth_unavailable");
  return createHmac("sha256", secret).update("amm:consumer-auth:audience:v1").digest("hex");
}
export function consumerAuthOrigin(env: NodeJS.ProcessEnv = process.env) {
  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) {
    const origin = `https://${env.VERCEL_URL}`;
    if (isApprovedAskMagicMikeOrigin(origin, env)) return origin;
  }
  return env.BETTER_AUTH_URL || "https://www.askmagicmike.com";
}
let pool: Pool | undefined;
export function consumerPool() {
  if (!consumerRuntimeReady()) throw new Error("consumer_auth_unavailable");
  if (!pool) {
    const url = new URL(process.env.DATABASE_URL!);
    if (["prefer", "require", "verify-ca"].includes(url.searchParams.get("sslmode") || "")) url.searchParams.set("sslmode", "verify-full");
    pool = new Pool({ connectionString: url.href, max: 2, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
  }
  return pool;
}
