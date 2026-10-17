import "server-only";
import { betterAuth } from "better-auth";
import { Kysely,PostgresDialect } from "kysely";
import { consumerAuthOrigin, consumerAuthSecret, consumerPool, consumerRuntimeReady } from "./runtime";

async function buildConsumerAuth() {
  const kysely=new Kysely({dialect:new PostgresDialect({pool:consumerPool()})});
  return betterAuth({
    appName: "Ask Magic Mike consumer workspace", baseURL: consumerAuthOrigin(), basePath: "/api/consumer-auth",
    secret: consumerAuthSecret(process.env.BETTER_AUTH_SECRET!), database: { db: kysely, type: "postgres", transaction: true },
    trustedOrigins: [consumerAuthOrigin()],
    emailAndPassword: { enabled: true, autoSignIn: false, minPasswordLength: 14, maxPasswordLength: 128, revokeSessionsOnPasswordReset: true },
    user: { modelName: "consumer_users", additionalFields: { audience: { type: "string", required: true, defaultValue: "consumer", input: false }, disabled: { type: "boolean", defaultValue: false, input: false } } },
    session: { modelName: "consumer_sessions", expiresIn: 7 * 86400, freshAge: 300, disableSessionRefresh: true, cookieCache: { enabled: false } },
    account: { modelName: "consumer_accounts", accountLinking: { enabled: false } }, verification: { modelName: "consumer_verifications" },
    rateLimit: { enabled: true, storage: "database", modelName: "consumer_rate_limits", window: 60, max: 30, customRules: { "/sign-in/email": { window: 900, max: 5 }, "/sign-up/email": { window: 3600, max: 3 } } },
    advanced: { cookiePrefix: "amm-consumer", useSecureCookies: process.env.NODE_ENV === "production", database: { generateId: "uuid" } },
    logger: { disabled: true }, telemetry: { enabled: false },
  });
}
let instance: ReturnType<typeof buildConsumerAuth> | undefined;
export function getConsumerAuth() {
  if (!consumerRuntimeReady()) throw new Error("consumer_auth_unavailable");
  return instance ??= buildConsumerAuth();
}
export type ConsumerPrincipal = { userId: string; sessionId: string };
export async function consumerPrincipal(headers: Headers): Promise<ConsumerPrincipal | null> {
  const auth = await getConsumerAuth();
  const session = await auth.api.getSession({ headers, query: { disableCookieCache: true } });
  return session && session.user.audience === "consumer" && !session.user.disabled
    ? { userId: session.user.id, sessionId: session.session.id } : null;
}
