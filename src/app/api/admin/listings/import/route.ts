import { NextRequest, NextResponse } from "next/server";
import { CsvListingProvider } from "@/lib/adapters/listing-csv-provider";
import { isSupabaseConfigured } from "@/lib/db/types";
import { trackEventNoWait } from "@/lib/analytics/ledger";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Admin: ingest a FlexMLS CSV export.
 *
 * Accepts `text/csv` (raw body) OR `application/json` with `{ csv: string }`.
 * Authenticates via the existing `ADMIN_SECRET` env var passed in a
 * `x-admin-secret` header. Reuses `CsvListingProvider.parse` for the
 * actual mapping so the same logic is unit-tested.
 *
 * Returns a parse report — counts + per-row errors — so the admin UI
 * shows what landed. When Supabase isn't configured the route reports
 * the parsed result without persisting.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  let csv: string;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { csv?: string };
    if (!body.csv || typeof body.csv !== "string") {
      return NextResponse.json(
        { ok: false, error: "csv_required" },
        { status: 400, headers: NO_STORE }
      );
    }
    csv = body.csv;
  } else {
    csv = await req.text();
  }

  const report = CsvListingProvider.parse(csv);

  if (!isSupabaseConfigured()) {
    trackEventNoWait({
      eventName: "listing_imported",
      properties: {
        provider: "csv_mock",
        totalRows: report.totalRows,
        okCount: report.okCount,
      },
    });
    return NextResponse.json(
      {
        ok: true,
        note: "listing_import_mock_mode",
        totalRows: report.totalRows,
        okCount: report.okCount,
        errorCount: report.errorCount,
      },
      { headers: NO_STORE }
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  // The tables added by migration 00012 aren't in the generated DB types
  // yet, so cast through the untyped surface for them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  // Record the import header row.
  const { data: importRow, error: importErr } = await client
    .from("flex_imports")
    .insert({
      uploaded_by: secret ? "admin" : "system",
      source: "csv",
      file_name: req.headers.get("x-file-name") ?? null,
      row_count: report.totalRows,
      ok_count: report.okCount,
      error_count: report.errorCount,
      errors: report.rows.filter((r) => !r.ok).map((r) => ({
        index: r.index,
        error: r.error,
      })),
    })
    .select("id")
    .single();
  if (importErr) {
    return NextResponse.json(
      { ok: false, error: importErr.message },
      { status: 500, headers: NO_STORE }
    );
  }

  // Persist successful listings + private fields.
  const ok = report.rows.filter((r) => r.ok && r.listing);
  if (ok.length > 0) {
    const publicRows = ok.map((r) => ({
      ...r.listing!.public,
      source: "csv_import",
      source_ref: String(r.index),
      imported_at: new Date().toISOString(),
    }));
    const { error: pubErr } = await client.from("listings").upsert(publicRows, {
      onConflict: "mls_number",
    });
    if (pubErr) {
      return NextResponse.json(
        { ok: false, error: pubErr.message },
        { status: 500, headers: NO_STORE }
      );
    }
    const privRows = ok.map((r) => r.listing!.private);
    if (privRows.length > 0) {
      await client.from("listing_private_fields").upsert(privRows, {
        onConflict: "listing_id",
      });
    }
  }

  trackEventNoWait({
    eventName: "listing_imported",
    properties: {
      provider: "csv",
      importId: importRow?.id ?? null,
      totalRows: report.totalRows,
      okCount: report.okCount,
      errorCount: report.errorCount,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      importId: importRow?.id ?? null,
      totalRows: report.totalRows,
      okCount: report.okCount,
      errorCount: report.errorCount,
    },
    { headers: NO_STORE }
  );
}
