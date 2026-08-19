import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, checkBearerSecret } from "@/lib/admin/auth";
import { computeHealthSafety } from "@/lib/admin/health-safety";
import {
  isPreviewDataDisabled,
  previewDataMode,
} from "@/lib/preview-security";
import {
  configuredEmailProvider,
  smtpConfigurationReady,
} from "../../../../../app/lib/emailProviderConfiguration";

const NO_STORE = { "Cache-Control": "no-store" };

const TABLES = [
  "leads",
  "lead_routing",
  "lead_notifications",
  "consents",
  "source_attribution",
  "audit_logs",
  "compliance_flags",
  "rate_limit_buckets",
  "tasks",
  "listings",
  "listing_matches",
  "webhook_events",
  "generated_assets",
  "message_deliveries",
] as const;

type TableName = typeof TABLES[number];

function authorized(req: NextRequest) {
  if (checkBearerSecret(req, process.env.CRON_SECRET)) return true;
  return checkAdminAuth(req).ok;
}

function enabled(value: string | undefined) {
  return (value ?? "false").toLowerCase() === "true";
}

async function probeNeon(databaseUrl: string) {
  const sql = neon(databaseUrl);
  const tableSelect = TABLES
    .map((table) => `to_regclass('public.${table}') IS NOT NULL AS ${table}`)
    .join(",\n");
  const rows = await sql.query(
    `SELECT
       current_database() IS NOT NULL AS reachable,
       to_regprocedure('public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)') IS NOT NULL AS capture_function,
       to_regprocedure('public.record_sla_breach_v1(uuid,text,text,text)') IS NOT NULL AS sla_function,
       ${tableSelect}`,
    [],
  ) as Array<Record<string, unknown>>;
  const row = rows[0] ?? {};
  return {
    reachable: row.reachable === true,
    captureFunction: row.capture_function === true,
    slaFunction: row.sla_function === true,
    tables: Object.fromEntries(TABLES.map((table) => [table, row[table] === true])) as Record<TableName, boolean>,
  };
}

/** Protected provider-neutral health detail for release automation.
 * Values are presence/status booleans only; credentials and database identity
 * never leave the server. */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const databaseUrlPresent = Boolean(process.env.DATABASE_URL);
  let dbReachable = false;
  let captureFunction = false;
  let slaFunction = false;
  let tablePresence = Object.fromEntries(TABLES.map((table) => [table, false])) as Record<TableName, boolean>;
  let databaseError: "not_configured" | "unreachable" | null = databaseUrlPresent ? null : "not_configured";

  if (process.env.DATABASE_URL) {
    try {
      const probe = await probeNeon(process.env.DATABASE_URL);
      dbReachable = probe.reachable;
      captureFunction = probe.captureFunction;
      slaFunction = probe.slaFunction;
      tablePresence = probe.tables;
      databaseError = probe.reachable ? null : "unreachable";
    } catch {
      databaseError = "unreachable";
    }
  }

  const migration00012Likely = [
    "tasks",
    "listings",
    "listing_matches",
    "webhook_events",
    "generated_assets",
    "message_deliveries",
  ].every((table) => tablePresence[table as TableName]);
  const leadPipeSchemaReady = captureFunction && slaFunction && [
    "leads",
    "lead_routing",
    "lead_notifications",
    "consents",
    "source_attribution",
    "audit_logs",
    "compliance_flags",
    "rate_limit_buckets",
  ].every((table) => tablePresence[table as TableName]);

  const smsEnabled = enabled(process.env.ENABLE_SMS);
  const emailEnabled = enabled(process.env.ENABLE_EMAIL) || enabled(process.env.EMAIL_ENABLED);
  const agentNotificationsEnabled = enabled(process.env.AGENT_NOTIFICATIONS_ENABLED);
  const productionNotificationEnabled = enabled(process.env.LEAD_NOTIFICATION_PRODUCTION_ENABLED);
  const leadNotificationMode = (process.env.LEAD_NOTIFICATION_MODE ?? "disabled").toLowerCase();
  const providerDeliveryEnabled =
    !isPreviewDataDisabled(process.env) &&
    agentNotificationsEnabled &&
    (leadNotificationMode === "sandbox" ||
      (leadNotificationMode === "production" && productionNotificationEnabled));
  const emailProvider = configuredEmailProvider();
  const safety = computeHealthSafety({
    env: process.env,
    dbConfigured: databaseUrlPresent,
    dbReachable,
    migration00012Likely,
    smsEnabled,
    emailEnabled,
  });

  return NextResponse.json({
    ok: true,
    build: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? "unknown",
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? process.env.GIT_BRANCH ?? "unknown",
      node_env: process.env.NODE_ENV ?? "unknown",
      vercel_env: process.env.VERCEL_ENV ?? "unknown",
      site_url: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.PUBLIC_SITE_URL ?? null,
      deployment_protection_bypass_env_present:
        !!process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    },
    env: {
      database_url_present: databaseUrlPresent,
      database_provider: databaseUrlPresent ? "neon_postgres" : "not_configured",
      admin_secret_present: !!process.env.ADMIN_SECRET,
      cron_secret_present: !!process.env.CRON_SECRET,
      email_provider: emailProvider,
      email_provider_configured: emailProvider !== "invalid",
      smtp_configuration_ready: emailProvider === "smtp" && smtpConfigurationReady(),
      email_enabled: emailEnabled,
      sms_provider: (process.env.SMS_PROVIDER ?? "mock").toLowerCase(),
      sms_enabled: smsEnabled,
      ai_enabled: enabled(process.env.ENABLE_AI_GENERATION),
      flexmls_api_enabled: enabled(process.env.ENABLE_FLEXMLS_API),
      database_env_set: Boolean(process.env.DATABASE_ENV),
      preview_data_mode: previewDataMode(process.env),
      provider_delivery_enabled: providerDeliveryEnabled,
      lead_notification_bcc_present: Boolean(process.env.LEAD_NOTIFICATION_BCC),
      customer_email_enabled: enabled(process.env.CUSTOMER_EMAIL_ENABLED),
      customer_sms_enabled: enabled(process.env.CUSTOMER_SMS_ENABLED),
      agent_sms_enabled: enabled(process.env.AGENT_SMS_NOTIFICATIONS_ENABLED),
    },
    database: {
      provider: "neon_postgres",
      configured: databaseUrlPresent,
      reachable: dbReachable,
      error: databaseError,
      lead_pipe_schema_ready: leadPipeSchemaReady,
      migration_00012_likely_applied: migration00012Likely,
      capture_function: captureFunction,
      sla_function: slaFunction,
      tables: tablePresence,
      identity: { database_env: safety.identity.database_env },
    },
    safety: {
      live_sms_disabled: safety.live_sms_disabled,
      live_email_disabled: safety.live_email_disabled,
      is_preview_runtime: safety.is_preview_runtime,
      allow_preview_db_mutation: safety.allow_preview_db_mutation,
      preview_data_mode: previewDataMode(process.env),
      database_credential_available: databaseUrlPresent,
      safe_for_preview_mutation: safety.safe_for_preview_mutation,
      provider_delivery_enabled: providerDeliveryEnabled,
      safety_blockers: safety.safety_blockers,
      warnings: safety.warnings,
    },
    preview_access_notes: [
      "If preview returns 401, run preview QA with VERCEL_AUTOMATION_BYPASS_SECRET.",
    ],
  }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
