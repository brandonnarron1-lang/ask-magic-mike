import { resolve } from "node:path";
import { env as runtimeEnv } from "node:process";
import { isApprovedAskMagicMikeOrigin } from "../../app/lib/publicOrigin";
import type { PublicIntakeMode } from "../../app/lib/publicIntakeCapability";
import { assertDatabaseMutationAllowed, isPreviewRuntime, previewDataMode } from "./preview-security";
import { computeNeonEndpointAttestation } from "./security/neon-endpoint-identity";

type RuntimeEnvironment = Record<string, string | undefined>;

function normalized(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function ownedPublicConfiguration(env: RuntimeEnvironment) {
  // Reuse the canonical public-origin allowlist, with Preview/development
  // exceptions explicitly unavailable. An absent or invalid URL is not proof.
  const configured = env.NEXT_PUBLIC_SITE_URL || env.PUBLIC_SITE_URL;
  if (!configured) return false;
  try {
    const url = new URL(configured);
    // The shared helper reads only runtime/origin fields. Legacy ProcessEnv
    // declarations require unrelated credentials; adapt this narrow boundary
    // without inventing any of those values or weakening the shared signature.
    const productionOriginEnv = {
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    } satisfies Pick<NodeJS.ProcessEnv, "VERCEL_ENV" | "NODE_ENV">;
    return !url.username && !url.password && isApprovedAskMagicMikeOrigin(
      url.origin,
      productionOriginEnv as unknown as NodeJS.ProcessEnv,
    );
  } catch {
    return false;
  }
}

function outboundDisabled(env: RuntimeEnvironment) {
  // Database isolation alone does not attest delivery isolation. Reject every
  // independent existing channel gate, including sandbox provider delivery.
  const deliveryFlags = [
    "ENABLE_EMAIL", "EMAIL_ENABLED", "AGENT_NOTIFICATIONS_ENABLED",
    "LEAD_NOTIFICATION_PRODUCTION_ENABLED", "AGENT_PUSH_NOTIFICATIONS_ENABLED",
    "ENABLE_SMS", "AGENT_SMS_NOTIFICATIONS_ENABLED", "CUSTOMER_EMAIL_ENABLED",
    "CUSTOMER_SMS_ENABLED", "CONSUMER_ACKNOWLEDGMENT_ENABLED",
    "QA_EMAIL_ENABLED", "CONSUMER_FOLLOWUP_EMAIL_ENABLED",
    "MESSAGE_AUTO_SEND_ENABLED", "MESSAGE_SEQUENCE_SCHEDULER_ENABLED",
    "AI_AUTOMATIC_ACTION_ENABLED",
    "AGENT_EMAIL_NOTIFICATIONS_ENABLED", "LEAD_NOTIFICATION_ENABLED", "WEB_PUSH_ENABLED",
    "LEAD_ALLOCATION_SENDS_ENABLED", "LEAD_ALLOCATION_STAFF_PILOT_SENDS_ENABLED",
  ];
  return deliveryFlags.every((key) => !env[key] || normalized(env[key]) === "false") &&
    [env.LEAD_NOTIFICATION_MODE, env.NOTIFICATION_PROVIDER_MODE]
      .every((mode) => !mode || normalized(mode) === "disabled");
}

function isolatedSessionAcceptance(env: RuntimeEnvironment) {
  // This exception mirrors reference-session-acceptance.mjs and its test-only
  // wire adapter. The harness separately verifies a fresh synthetic database;
  // health does not repeat that query or import the adapter into the app.
  if (env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1" || env.AMM_QA_POSTGRES_TEST !== "1" ||
    env.VERCEL_ENV !== "development" || env.VERCEL || env.VERCEL_URL || env.PREVIEW_URL ||
    (env.DATABASE_ENV && env.DATABASE_ENV !== "development") ||
    !outboundDisabled(env)) return false;

  const expectedTransport = `--import=${resolve("tests/support/isolated-neon-transport.mjs")}`;
  if (!(env.NODE_OPTIONS ?? "").split(/\s+/).includes(expectedTransport)) return false;
  const rawPort = env.AMM_E2E_PORT ?? "";
  const port = Number(rawPort);
  if (!/^\d{1,5}$/.test(rawPort) || port < 1 || port > 65_535) return false;

  try {
    const database = new URL(env.DATABASE_URL ?? "");
    const app = new URL(env.NEXT_PUBLIC_SITE_URL ?? "");
    const auth = new URL(env.BETTER_AUTH_URL ?? "");
    const appOrigin = `http://localhost:${port}`;
    return ["postgres:", "postgresql:"].includes(database.protocol) &&
      database.hostname === "localhost" && database.username === "postgres" &&
      !database.password && Boolean(database.port) &&
      database.pathname === "/amm_qa_upgrade" && !database.search && !database.hash &&
      [app, auth].every((url) => url.origin === appOrigin &&
        !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash);
  } catch {
    return false;
  }
}

/**
 * Server-only, configuration-based UX capability. No query, provider call,
 * endpoint identity, or credential is returned. This is not write authority:
 * the existing intake POST and persistence mutation guards remain authoritative.
 */
export function publicIntakeCapability(env: RuntimeEnvironment = runtimeEnv): PublicIntakeMode {
  if (!assertDatabaseMutationAllowed(env).ok) return "read_only";
  if (env.AMM_ISOLATED_SESSION_ACCEPTANCE === "1") {
    return isolatedSessionAcceptance(env) ? "synthetic_qa" : "read_only";
  }
  const endpoint = computeNeonEndpointAttestation(env);
  if (!endpoint.database_neon_endpoint_resolved) {
    return "read_only";
  }

  if (isPreviewRuntime(env)) {
    return normalized(env.VERCEL_ENV) === "preview" &&
      normalized(env.DATABASE_ENV) === "preview" &&
      previewDataMode(env) === "enabled" &&
      endpoint.preview_endpoint_identity_confirmed &&
      outboundDisabled(env)
      ? "synthetic_qa"
      : "read_only";
  }

  // Endpoint IDs were introduced for Preview isolation, not as a new mandatory
  // Production intake gate. Honor any supplied Production attestation, but do
  // not disable an otherwise valid existing live runtime when it is absent.
  const databaseEnvironment = normalized(env.DATABASE_ENV);
  const suppliedProductionIdentity = Boolean(env.PRODUCTION_NEON_ENDPOINT_ID);
  return normalized(env.VERCEL_ENV) === "production" &&
    (!databaseEnvironment || databaseEnvironment === "production") &&
    ownedPublicConfiguration(env) &&
    !endpoint.preview_endpoint_match &&
    (!suppliedProductionIdentity || endpoint.production_endpoint_match)
    ? "live"
    : "read_only";
}
