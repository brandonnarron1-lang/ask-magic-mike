import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function classifyDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("password authentication") || message.includes("authentication failed")) return "authentication_failed";
  if (message.includes("role") && (message.includes("login") || message.includes("permission"))) return "role_unavailable";
  if (message.includes("fetch") || message.includes("connect") || message.includes("network")) return "connection_failed";
  return "database_query_failed";
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json(
      { ok: false, database: "not_configured", capture_function: false },
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
         to_regclass('public.lead_notifications') IS NOT NULL AS notification_table`,
      [],
    ) as Array<Record<string, unknown>>;
    const result = rows[0] || {};
    const ready = result.capture_function === true && result.leads_table === true && result.notification_table === true;
    return NextResponse.json(
      {
        ok: ready,
        database: ready ? "ready" : "schema_incomplete",
        capture_function: result.capture_function === true,
        leads_table: result.leads_table === true,
        notification_table: result.notification_table === true,
      },
      { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, database: classifyDatabaseError(error), capture_function: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
