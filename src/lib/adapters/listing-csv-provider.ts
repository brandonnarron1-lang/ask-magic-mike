/**
 * CSV listing provider.
 *
 * Parses a FlexMLS-style CSV export into normalized `AdminListing` rows.
 * Column names are matched case-insensitively against a synonym table so
 * different exports work.
 *
 * Returns a parse report (ok + error rows) so the import route can log
 * a `flex_imports` row that mirrors what we actually loaded.
 */
import type { AdminListing } from "@/schemas/listing.schema";
import { splitListing } from "@/lib/compliance/listing-sanitizer";
import { randomUUID } from "node:crypto";

export interface CsvParseRow {
  index: number;
  ok: boolean;
  listing?: AdminListing;
  error?: string;
  raw?: Record<string, string>;
}

export interface CsvParseReport {
  totalRows: number;
  okCount: number;
  errorCount: number;
  rows: CsvParseRow[];
}

/** Synonyms keyed by canonical column. */
const COLUMN_SYNONYMS: Record<string, string[]> = {
  mls_number: ["mls", "mls number", "mlsnumber", "mls_number", "listingid", "mls #"],
  status:        ["status", "list status", "listing status"],
  address_line1: ["address", "street address", "address line 1", "address1"],
  address_line2: ["address line 2", "unit", "apt"],
  city:    ["city"],
  county:  ["county"],
  state:   ["state", "st"],
  zip:     ["zip", "zip code", "postal code", "zipcode"],
  list_price: ["list price", "price", "listing price"],
  beds:        ["beds", "bedrooms"],
  baths_full:  ["baths full", "full baths"],
  baths_half:  ["baths half", "half baths"],
  sqft:        ["sqft", "square feet", "total sqft"],
  acres:       ["acres", "lot size", "lot acres"],
  year_built:  ["year built"],
  property_type: ["property type", "type"],
  public_remarks: ["public remarks", "remarks"],
  directions:    ["directions"],
  list_office:   ["list office", "listing office"],
  dom:  ["dom", "days on market"],
  cdom: ["cdom"],
  taxes: ["taxes", "annual taxes"],
  // private
  agent_remarks:        ["agent remarks", "private remarks", "broker remarks"],
  lockbox_info:         ["lockbox", "lockbox info"],
  showing_instructions: ["showing instructions", "showing"],
  compensation:         ["compensation", "co-op compensation", "coop"],
  owner_notes:          ["owner notes"],
  internal_notes:       ["internal notes"],
};

function buildHeaderMap(headers: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const lowered = headers.map((h) => h.trim().toLowerCase());
  for (const [canonical, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
    for (const syn of synonyms) {
      const idx = lowered.indexOf(syn);
      if (idx >= 0) {
        map.set(canonical, headers[idx]);
        break;
      }
    }
  }
  return map;
}

/** Tiny CSV parser — handles quoted fields with commas and escaped quotes. */
export function parseCsv(input: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      cur.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (field !== "" || cur.length) {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      }
      if (c === "\r" && input[i + 1] === "\n") i += 1;
    } else {
      field += c;
    }
  }
  if (field !== "" || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => {
      o[h] = (r[i] ?? "").trim();
    });
    return o;
  });
}

function parseNum(v: string | undefined): number | null {
  if (!v) return null;
  const cleaned = v.replace(/[$,]/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function pick(row: Record<string, string>, headerMap: Map<string, string>, key: string): string | null {
  const header = headerMap.get(key);
  if (!header) return null;
  const value = row[header];
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

export const CsvListingProvider = {
  name: "csv",

  parse(csvText: string): CsvParseReport {
    const rows = parseCsv(csvText);
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const headerMap = buildHeaderMap(headers);

    if (headerMap.size === 0) {
      return {
        totalRows: rows.length,
        okCount: 0,
        errorCount: rows.length,
        rows: rows.map((raw, index) => ({
          index,
          ok: false,
          error: "no_recognizable_columns",
          raw,
        })),
      };
    }

    const out: CsvParseRow[] = rows.map((raw, index) => {
      try {
        const id = randomUUID();
        const status = (pick(raw, headerMap, "status") ?? "active").toLowerCase();
        const validStatus = [
          "coming_soon",
          "active",
          "pending",
          "contingent",
          "closed",
          "withdrawn",
          "expired",
        ].includes(status)
          ? status
          : "active";

        // Build a single composite record that maps to the public/private
        // split below.
        const composite: Record<string, unknown> = {
          id,
          mls_number:     pick(raw, headerMap, "mls_number"),
          status:         validStatus,
          address_line1:  pick(raw, headerMap, "address_line1"),
          address_line2:  pick(raw, headerMap, "address_line2"),
          city:           pick(raw, headerMap, "city"),
          county:         pick(raw, headerMap, "county"),
          state:         (pick(raw, headerMap, "state") ?? "NC").toUpperCase(),
          zip:            pick(raw, headerMap, "zip"),
          list_price:     parseNum(pick(raw, headerMap, "list_price") ?? undefined),
          beds:           parseNum(pick(raw, headerMap, "beds") ?? undefined),
          baths_full:     parseNum(pick(raw, headerMap, "baths_full") ?? undefined),
          baths_half:     parseNum(pick(raw, headerMap, "baths_half") ?? undefined),
          sqft:           parseNum(pick(raw, headerMap, "sqft") ?? undefined),
          acres:          parseNum(pick(raw, headerMap, "acres") ?? undefined),
          year_built:     parseNum(pick(raw, headerMap, "year_built") ?? undefined),
          property_type:  pick(raw, headerMap, "property_type"),
          public_remarks: pick(raw, headerMap, "public_remarks"),
          directions:     pick(raw, headerMap, "directions"),
          list_office:    pick(raw, headerMap, "list_office"),
          dom:            parseNum(pick(raw, headerMap, "dom") ?? undefined),
          cdom:           parseNum(pick(raw, headerMap, "cdom") ?? undefined),
          taxes:          parseNum(pick(raw, headerMap, "taxes") ?? undefined),
          // private
          agent_remarks:        pick(raw, headerMap, "agent_remarks"),
          lockbox_info:         pick(raw, headerMap, "lockbox_info"),
          showing_instructions: pick(raw, headerMap, "showing_instructions"),
          compensation:         pick(raw, headerMap, "compensation"),
          owner_notes:          pick(raw, headerMap, "owner_notes"),
          internal_notes:       pick(raw, headerMap, "internal_notes"),
          raw_payload:          raw,
        };

        const split = splitListing(composite);

        return { index, ok: true, listing: split, raw };
      } catch (err) {
        return {
          index,
          ok: false,
          error: err instanceof Error ? err.message : "parse_error",
          raw,
        };
      }
    });

    return {
      totalRows: rows.length,
      okCount: out.filter((r) => r.ok).length,
      errorCount: out.filter((r) => !r.ok).length,
      rows: out,
    };
  },
} as const;

/**
 * Future provider stubs. Real impls land when credentials exist.
 */
export interface ListingDataProvider {
  name: string;
  parse?: (input: string) => CsvParseReport;
}

export interface PdfListingProvider extends ListingDataProvider {
  parsePdf(buffer: ArrayBuffer): Promise<CsvParseReport>;
}

export interface FlexMlsApiProvider extends ListingDataProvider {
  fetchActive(): Promise<AdminListing[]>;
}
