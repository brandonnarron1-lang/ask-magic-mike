import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import {
  durableRateLimitDedicatedSecretReady,
  durableRateLimitRequired,
} from "@/lib/security/rate-limit";
import {
  evaluateRateLimitStoreCapability,
  RATE_LIMIT_STORE_CAPABILITY_SELECT,
} from "@/lib/security/rate-limit-readiness";

export const dynamic = "force-dynamic";

function classifyDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("password authentication") || message.includes("authentication failed")) return "authentication_failed";
  if (message.includes("role") && (message.includes("login") || message.includes("permission"))) return "role_unavailable";
  if (message.includes("fetch") || message.includes("connect") || message.includes("network")) return "connection_failed";
  return "database_query_failed";
}

function hasValidPushConfiguration() {
  const subject = process.env.VAPID_SUBJECT || "";
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      && process.env.VAPID_PRIVATE_KEY
      && (subject.startsWith("mailto:") || subject.startsWith("https://")),
  );
}

function hasValidPhoneSetupConfiguration() {
  return (process.env.PHONE_SETUP_SIGNING_SECRET || "").trim().length >= 32;
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  const rateLimitSecretReady = durableRateLimitDedicatedSecretReady();
  const rateLimitRequired = durableRateLimitRequired();
  const missingDatabaseRateLimitReady = !rateLimitRequired;
  if (!databaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        database: "not_configured",
        capture_function: false,
        leads_table: false,
        notification_table: false,
        rbac_schema_ready: false,
        rate_limit_table: false,
        rate_limit_schema_ready: false,
        rate_limit_permissions_ready: false,
        rate_limit_rls_ready: false,
        rate_limit_store_ready: false,
        rate_limit_secret_ready: rateLimitSecretReady,
        rate_limit_required: rateLimitRequired,
        rate_limit_ready: missingDatabaseRateLimitReady,
        push_enabled: process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED === "true",
        push_subscription_table: false,
        push_provider_configured: hasValidPushConfiguration(),
        phone_setup_configured: hasValidPhoneSetupConfiguration(),
        push_ready: false,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const sql = neon(databaseUrl);
    const rows = await sql.query(
      `SELECT
         current_database() AS database_name,
         to_regprocedure('public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)') IS NOT NULL AS capture_function,
         to_regclass('public.leads') IS NOT NULL AS leads_table,
         to_regclass('public.lead_notifications') IS NOT NULL AS notification_table,
         to_regclass('public.lead_center_users') IS NOT NULL
           AND to_regclass('public.lead_center_sessions') IS NOT NULL
           AND to_regclass('public.lead_center_accounts') IS NOT NULL
           AS rbac_schema_ready,
         ${RATE_LIMIT_STORE_CAPABILITY_SELECT},
         to_regclass('public.staff_push_subscriptions') IS NOT NULL AS push_subscription_table`,
      [],
    ) as Array<Record<string, unknown>>;
    const result = rows[0] || {};
    const pushEnabled = process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED === "true";
    const pushProviderConfigured = hasValidPushConfiguration();
    const phoneSetupConfigured = hasValidPhoneSetupConfiguration();
    const pushSubscriptionTable = result.push_subscription_table === true;
    const pushReady = !pushEnabled || (pushProviderConfigured && pushSubscriptionTable && phoneSetupConfigured);
    const rateLimitStore = evaluateRateLimitStoreCapability(result);
    const rateLimitReady = !rateLimitRequired || (rateLimitStore.ready && rateLimitSecretReady);
    const coreDatabaseReady = result.capture_function === true
      && result.leads_table === true
      && result.notification_table === true;
    const ready = coreDatabaseReady
      && rateLimitReady
      && pushReady;
    return NextResponse.json(
      {
        ok: ready,
        database: coreDatabaseReady ? "ready" : "schema_incomplete",
        capture_function: result.capture_function === true,
        leads_table: result.leads_table === true,
        notification_table: result.notification_table === true,
        rbac_schema_ready: result.rbac_schema_ready === true,
        rate_limit_table: rateLimitStore.table,
        rate_limit_schema_ready: rateLimitStore.schema,
        rate_limit_permissions_ready: rateLimitStore.permissions,
        rate_limit_rls_ready: rateLimitStore.rls,
        rate_limit_store_ready: rateLimitStore.ready,
        rate_limit_secret_ready: rateLimitSecretReady,
        rate_limit_required: rateLimitRequired,
        rate_limit_ready: rateLimitReady,
        push_enabled: pushEnabled,
        push_subscription_table: pushSubscriptionTable,
        push_provider_configured: pushProviderConfigured,
        phone_setup_configured: phoneSetupConfigured,
        push_ready: pushReady,
      },
      { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: classifyDatabaseError(error),
        capture_function: false,
        leads_table: false,
        notification_table: false,
        rbac_schema_ready: false,
        rate_limit_table: false,
        rate_limit_schema_ready: false,
        rate_limit_permissions_ready: false,
        rate_limit_rls_ready: false,
        rate_limit_store_ready: false,
        rate_limit_secret_ready: rateLimitSecretReady,
        rate_limit_required: rateLimitRequired,
        rate_limit_ready: missingDatabaseRateLimitReady,
        push_enabled: process.env.AGENT_PUSH_NOTIFICATIONS_ENABLED === "true",
        push_subscription_table: false,
        push_provider_configured: hasValidPushConfiguration(),
        phone_setup_configured: hasValidPhoneSetupConfiguration(),
        push_ready: false,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
