import { NextRequest, NextResponse } from "next/server";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/admin/health
 *
 * Authorized telemetry endpoint for the preview QA runner. Reports:
 *   - build identity (commit / branch / Vercel env / site URL)
 *   - presence of required env vars (boolean only; never echoes values)
 *   - DB reachability + which migration-00012 tables exist
 *   - safety flags the QA runner uses to decide whether mutation
 *     tests are allowed
 *
 * Auth (either works):
 *   - x-admin-secret: $ADMIN_SECRET
 *   - Authorization: Bearer $CRON_SECRET (if CRON_SECRET is set)
 *
 * Response shape is intentionally stable so the QA runner can rely on
 * it across deploys. New fields go at the end; existing fields don't
 * change meaning.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  const supabaseUrlPresent = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonPresent = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServicePresent = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminSecretPresent = !!process.env.ADMIN_SECRET;
  const cronSecretPresent = !!process.env.CRON_SECRET;
  const smsProvider = (process.env.SMS_PROVIDER ?? "mock").toLowerCase();
  const smsEnabled =
    (process.env.ENABLE_SMS ?? "false").toLowerCase() === "true";
  const emailProvider = (process.env.EMAIL_PROVIDER ?? "mock").toLowerCase();
  const emailEnabled =
    (process.env.ENABLE_EMAIL ?? "false").toLowerCase() === "true";
  const aiEnabled =
    (process.env.ENABLE_AI_GENERATION ?? "false").toLowerCase() === "true";
  const flexmlsEnabled =
    (process.env.ENABLE_FLEXMLS_API ?? "false").toLowerCase() === "true";

  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? "unknown";
  const branch =
    process.env.VERCEL_GIT_COMMIT_REF ?? process.env.GIT_BRANCH ?? "unknown";
  const nodeEnv = process.env.NODE_ENV ?? "unknown";
  const vercelEnv = process.env.VERCEL_ENV ?? "unknown";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.PUBLIC_SITE_URL ??
    null;

  // Database probe.
  const dbConfigured = supabaseUrlPresent && supabaseServicePresent;
  let dbReachable = false;
  const tablePresence: Record<string, boolean> = {
    leads: false,
    tasks: false,
    listings: false,
    listing_matches: false,
    webhook_events: false,
    generated_assets: false,
    message_deliveries: false,
  };

  if (dbConfigured) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = createAdminClient() as any;
      const probes = await Promise.all(
        Object.keys(tablePresence).map(async (table) => {
          // `head: true` + `count: "exact"` issues a HEAD-style query.
          // Returns 0 rows but resolves the metadata cheaply.
          const { error } = await client
            .from(table)
            .select("*", { head: true, count: "exact" });
          return [table, !error] as const;
        })
      );
      for (const [t, ok] of probes) tablePresence[t] = ok;
      // Reachable if at least the `leads` table responded.
      dbReachable = tablePresence.leads;
    } catch {
      dbReachable = false;
    }
  }

  // The 00012 migration adds tasks/listings/listing_matches/webhook_events/
  // generated_assets/message_deliveries. If all five "new" tables answer,
  // the migration is almost certainly applied.
  const migration00012Likely =
    tablePresence.tasks &&
    tablePresence.listings &&
    tablePresence.listing_matches &&
    tablePresence.webhook_events &&
    tablePresence.generated_assets &&
    tablePresence.message_deliveries;

  const warnings: string[] = [];

  if (!supabaseUrlPresent) warnings.push("supabase_url_missing");
  if (!supabaseServicePresent) warnings.push("supabase_service_role_missing");
  if (!adminSecretPresent) warnings.push("admin_secret_missing");
  if (smsEnabled) warnings.push("live_sms_enabled");
  if (emailEnabled) warnings.push("live_email_enabled");
  if (dbConfigured && !dbReachable) warnings.push("db_unreachable");
  if (dbConfigured && dbReachable && !migration00012Likely)
    warnings.push("migration_00012_not_applied");

  // Mutation safety: only true when we are *clearly* in a preview env,
  // live SMS/email are off, DB is reachable, and migration 00012 is in.
  // If we can't tell, the answer is "no".
  const isPreviewEnv =
    vercelEnv === "preview" || vercelEnv === "development" || nodeEnv !== "production";
  const liveSendsDisabled = !smsEnabled && !emailEnabled;
  const safeForPreviewMutation =
    isPreviewEnv &&
    liveSendsDisabled &&
    dbConfigured &&
    dbReachable &&
    migration00012Likely;

  return NextResponse.json(
    {
      ok: true,
      build: {
        commit,
        branch,
        node_env: nodeEnv,
        vercel_env: vercelEnv,
        site_url: siteUrl,
      },
      env: {
        supabase_url_present: supabaseUrlPresent,
        supabase_anon_key_present: supabaseAnonPresent,
        supabase_service_role_present: supabaseServicePresent,
        admin_secret_present: adminSecretPresent,
        cron_secret_present: cronSecretPresent,
        sms_provider: ["mock", "twilio"].includes(smsProvider)
          ? smsProvider
          : "unknown",
        sms_enabled: smsEnabled,
        email_provider: ["mock", "resend", "sendgrid", "postmark"].includes(
          emailProvider
        )
          ? emailProvider
          : "unknown",
        email_enabled: emailEnabled,
        ai_enabled: aiEnabled,
        flexmls_api_enabled: flexmlsEnabled,
      },
      database: {
        configured: dbConfigured,
        reachable: dbReachable,
        migration_00012_likely_applied: migration00012Likely,
        tables: tablePresence,
      },
      safety: {
        live_sms_disabled: !smsEnabled,
        live_email_disabled: !emailEnabled,
        safe_for_preview_mutation: safeForPreviewMutation,
        warnings,
      },
    },
    { headers: NO_STORE }
  );
}

export async function POST(req: NextRequest) {
  return GET(req);
}

function isAuthorized(req: NextRequest): boolean {
  // Bearer CRON_SECRET (for CI/cron callers)
  const authz = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;
  if (
    cronSecret &&
    authz.toLowerCase().startsWith("bearer ") &&
    authz.slice(7).trim() === cronSecret
  ) {
    return true;
  }
  // x-admin-secret (for admin/runner callers)
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;
  const supplied =
    req.headers.get("x-admin-secret") ??
    req.nextUrl.searchParams.get("admin_secret");
  return !!supplied && supplied === adminSecret;
}
