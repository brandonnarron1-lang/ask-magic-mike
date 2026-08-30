import { createHash } from "node:crypto";
import { parseBoundedCsvMatrix } from "./bounded-csv";

export const ORGANIC_SEARCH_INGRESS_VERSION = "search_console_page_csv_v1";
export const ORGANIC_SEARCH_INGRESS_MAX_BYTES = 512 * 1024;
export const ORGANIC_SEARCH_INGRESS_MAX_ROWS = 1_000;
export const ORGANIC_SEARCH_INGRESS_CONFIRMATION = "IMPORT REVIEWED ORGANIC SEARCH";

export const ORGANIC_SEARCH_INGRESS_HEADERS = [
  "start_date",
  "end_date",
  "site_property",
  "search_type",
  "data_state",
  "country",
  "device",
  "page",
  "clicks",
  "impressions",
  "ctr",
  "position",
  "source_system",
] as const;

export const ORGANIC_SEARCH_TYPES = [
  "web",
  "image",
  "video",
  "news",
  "discover",
  "google_news",
] as const;
export const ORGANIC_SEARCH_DATA_STATES = ["final", "fresh"] as const;
export const ORGANIC_SEARCH_DEVICES = ["all", "desktop", "mobile", "tablet"] as const;
export const ORGANIC_SEARCH_SOURCE_SYSTEMS = [
  "google_search_console_csv",
  "synthetic_template",
] as const;

export type OrganicSearchType = (typeof ORGANIC_SEARCH_TYPES)[number];
export type OrganicSearchDataState = (typeof ORGANIC_SEARCH_DATA_STATES)[number];
export type OrganicSearchDevice = (typeof ORGANIC_SEARCH_DEVICES)[number];

export type OrganicSearchOpportunityType =
  | "organic_click_capture_gap"
  | "organic_page_one_gap"
  | "organic_visibility_gap";

export interface OrganicSearchOpportunity {
  key: string;
  type: OrganicSearchOpportunityType;
  title: string;
  rationale: string;
  score: number;
  policyCtrThreshold: number;
  demandPoints: number;
  accessibilityPoints: number;
  clickGapPoints: number;
}

export interface OrganicSearchImportRow {
  startDate: string;
  endDate: string;
  siteProperty: string;
  searchType: OrganicSearchType;
  dataState: OrganicSearchDataState;
  country: string;
  device: OrganicSearchDevice;
  pageUrl: string;
  pageHost: string;
  pagePath: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  sourceSystem: (typeof ORGANIC_SEARCH_SOURCE_SYSTEMS)[number];
  signalExternalId: string;
  signalScore: number;
  confidence: number;
  opportunity: OrganicSearchOpportunity | null;
  rowFingerprint: string;
}

export interface OrganicSearchIngressIssue {
  row: number;
  field: string | null;
  code: string;
  message: string;
}

export interface OrganicSearchIngressTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  opportunities: number;
}

export interface OrganicSearchIngressPreview {
  ok: boolean;
  version: typeof ORGANIC_SEARCH_INGRESS_VERSION;
  batchFingerprint: string | null;
  rowCount: number;
  dateStart: string | null;
  dateEnd: string | null;
  siteProperties: string[];
  pageHosts: string[];
  sourceSystems: string[];
  synthetic: boolean;
  totals: OrganicSearchIngressTotals;
  rows: OrganicSearchImportRow[];
  issues: OrganicSearchIngressIssue[];
  sourceCoverage: "operator_export_not_guaranteed_exhaustive";
  rawCsvRetained: false;
  rawQueriesRetained: false;
  providerCallPerformed: false;
}

const HEADER_SET = new Set<string>(ORGANIC_SEARCH_INGRESS_HEADERS);
const SEARCH_TYPE_SET = new Set<string>(ORGANIC_SEARCH_TYPES);
const DATA_STATE_SET = new Set<string>(ORGANIC_SEARCH_DATA_STATES);
const DEVICE_SET = new Set<string>(ORGANIC_SEARCH_DEVICES);
const SOURCE_SYSTEM_SET = new Set<string>(ORGANIC_SEARCH_SOURCE_SYSTEMS);
const INTEGER = /^(?:0|[1-9][0-9]{0,9})$/;
const DECIMAL = /^(?:0|[1-9][0-9]{0,3})(?:\.[0-9]{1,8})?$/;
const CTR_DECIMAL = /^(?:0(?:\.[0-9]{1,8})?|1(?:\.0{1,8})?)$/;
const CTR_PERCENT = /^(?:0|[1-9][0-9]?|100)(?:\.[0-9]{1,6})?%$/;
const COUNTRY = /^(?:ALL|[A-Z]{3})$/;
const EMAIL_IN_PATH = /(?:^|[/._-])[a-z0-9.!#$%&'*+/=?^_`{|}~-]+(?:%40|@)[a-z0-9.-]+(?:$|[/._-])/i;

const OWNED_SITE_PROPERTIES = new Map<string, ReadonlySet<string>>([
  ["sc-domain:askmagicmike.com", new Set(["askmagicmike.com", "www.askmagicmike.com"])],
  ["https://askmagicmike.com/", new Set(["askmagicmike.com"])],
  ["https://www.askmagicmike.com/", new Set(["www.askmagicmike.com"])],
  ["sc-domain:ourtownproperties.com", new Set(["ourtownproperties.com", "www.ourtownproperties.com"])],
  ["https://ourtownproperties.com/", new Set(["ourtownproperties.com"])],
  ["https://www.ourtownproperties.com/", new Set(["www.ourtownproperties.com"])],
]);

const CANONICAL_HOST = new Map([
  ["askmagicmike.com", "www.askmagicmike.com"],
  ["www.askmagicmike.com", "www.askmagicmike.com"],
  ["ourtownproperties.com", "www.ourtownproperties.com"],
  ["www.ourtownproperties.com", "www.ourtownproperties.com"],
]);

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function issue(
  issues: OrganicSearchIngressIssue[],
  row: number,
  field: string | null,
  code: string,
  message: string,
) {
  if (issues.length < 150) issues.push({ row, field, code, message });
}

function emptyPreview(issues: OrganicSearchIngressIssue[]): OrganicSearchIngressPreview {
  return {
    ok: false,
    version: ORGANIC_SEARCH_INGRESS_VERSION,
    batchFingerprint: null,
    rowCount: 0,
    dateStart: null,
    dateEnd: null,
    siteProperties: [],
    pageHosts: [],
    sourceSystems: [],
    synthetic: false,
    totals: { clicks: 0, impressions: 0, ctr: 0, opportunities: 0 },
    rows: [],
    issues,
    sourceCoverage: "operator_export_not_guaranteed_exhaustive",
    rawCsvRetained: false,
    rawQueriesRetained: false,
    providerCallPerformed: false,
  };
}

function strictDateMilliseconds(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const milliseconds = Date.UTC(year, month - 1, day);
  const parsed = new Date(milliseconds);
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? milliseconds
    : null;
}

function dateWindow(startDate: string, endDate: string, now: Date) {
  const start = strictDateMilliseconds(startDate);
  const end = strictDateMilliseconds(endDate);
  if (start === null || end === null) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const oldest = today - 550 * 24 * 60 * 60 * 1000;
  const maximumWindow = 550 * 24 * 60 * 60 * 1000;
  return start >= oldest && end <= today && start <= end && end - start <= maximumWindow
    ? { start, end }
    : null;
}

function plainCell(value: string, maximum: number) {
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximum &&
    !hasControlCharacter(normalized) && !/^[=+@-]/.test(normalized)
    ? normalized
    : null;
}

function normalizeSiteProperty(value: string) {
  const normalized = value.trim().toLowerCase();
  return OWNED_SITE_PROPERTIES.has(normalized) ? normalized : null;
}

function normalizeOwnedPage(value: string, siteProperty: string) {
  const safe = plainCell(value, 2_048);
  const allowedHosts = OWNED_SITE_PROPERTIES.get(siteProperty);
  if (!safe || !allowedHosts) return null;
  try {
    const page = new URL(safe);
    const reportedHost = page.hostname.toLowerCase().replace(/\.$/, "");
    if (
      page.protocol !== "https:" || page.username || page.password || page.port ||
      page.search || page.hash || !allowedHosts.has(reportedHost) ||
      page.pathname.length > 1_600 || hasControlCharacter(page.pathname) ||
      EMAIL_IN_PATH.test(page.pathname)
    ) return null;
    const pageHost = CANONICAL_HOST.get(reportedHost);
    if (!pageHost) return null;
    const pagePath = page.pathname || "/";
    return {
      pageUrl: `https://${pageHost}${pagePath}`,
      pageHost,
      pagePath,
    };
  } catch {
    return null;
  }
}

function parsedInteger(value: string, minimum = 0) {
  const normalized = value.trim();
  if (!INTEGER.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= 2_147_483_647
    ? parsed
    : null;
}

function parsedCtr(value: string) {
  const normalized = value.trim();
  if (CTR_PERCENT.test(normalized)) {
    const parsed = Number(normalized.slice(0, -1)) / 100;
    return parsed >= 0 && parsed <= 1 ? parsed : null;
  }
  if (CTR_DECIMAL.test(normalized)) {
    const parsed = Number(normalized);
    return parsed >= 0 && parsed <= 1 ? parsed : null;
  }
  return null;
}

function parsedPosition(value: string) {
  const normalized = value.trim();
  if (!DECIMAL.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 1_000 ? round(parsed, 4) : null;
}

function policyCtrThreshold(position: number) {
  if (position <= 3) return 0.03;
  if (position <= 10) return 0.02;
  if (position <= 20) return 0.01;
  if (position <= 40) return 0.005;
  return 0.0025;
}

function opportunityType(
  impressions: number,
  ctr: number,
  position: number,
  threshold: number,
): OrganicSearchOpportunityType | null {
  if (impressions >= 100 && position <= 10 && ctr < threshold) return "organic_click_capture_gap";
  if (impressions >= 100 && position > 10 && position <= 20) return "organic_page_one_gap";
  if (impressions >= 250 && position > 20 && position <= 40) return "organic_visibility_gap";
  return null;
}

function pageLabel(pageHost: string, pagePath: string) {
  const label = pagePath === "/" ? pageHost : pagePath;
  return label.length <= 96 ? label : `${label.slice(0, 93)}…`;
}

export function scoreOrganicSearchPage(input: {
  pageUrl: string;
  pageHost: string;
  pagePath: string;
  startDate: string;
  endDate: string;
  dataState: OrganicSearchDataState;
  country: string;
  device: OrganicSearchDevice;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}) {
  const demandPoints = Math.min(45, Math.round((Math.log10(input.impressions + 1) / 4) * 45));
  const accessibilityPoints = input.position <= 3
    ? 22
    : input.position <= 10
      ? 30
      : input.position <= 20
        ? 26
        : input.position <= 40
          ? 14
          : 4;
  const threshold = policyCtrThreshold(input.position);
  const clickGapPoints = Math.max(
    0,
    Math.min(25, Math.round(25 * (1 - input.ctr / threshold))),
  );
  const signalScore = Math.min(100, Math.round((Math.log10(input.impressions + 1) / 5) * 100));
  const confidence = round(Math.min(0.95,
    0.35 +
    Math.min(0.35, (Math.log10(input.impressions + 1) / 5) * 0.35) +
    (input.dataState === "final" ? 0.2 : 0.05) +
    (input.country === "ALL" ? 0.025 : 0) +
    (input.device === "all" ? 0.025 : 0)
  ), 4);
  const type = opportunityType(input.impressions, input.ctr, input.position, threshold);
  const score = Math.min(100, demandPoints + accessibilityPoints + clickGapPoints);
  const label = pageLabel(input.pageHost, input.pagePath);
  const opportunity = type ? {
    key: `organic_search:${sha256(input.pageUrl)}`,
    type,
    title: `Improve organic capture for ${label}`,
    rationale: `Google Search Console reported ${input.impressions.toLocaleString("en-US")} impressions, ${input.clicks.toLocaleString("en-US")} clicks (${(input.ctr * 100).toFixed(2)}% CTR), and ${input.position.toFixed(1)} average position for this owned page from ${input.startDate} through ${input.endDate}. The explainable policy threshold for this visibility band is ${(threshold * 100).toFixed(2)}%. Review the title, description, page-answer alignment, and internal links before any publication.`,
    score,
    policyCtrThreshold: threshold,
    demandPoints,
    accessibilityPoints,
    clickGapPoints,
  } satisfies OrganicSearchOpportunity : null;

  return { signalScore, confidence, opportunity };
}

function canonicalRowForHash(row: Omit<OrganicSearchImportRow, "rowFingerprint">) {
  return JSON.stringify([
    row.startDate,
    row.endDate,
    row.siteProperty,
    row.searchType,
    row.dataState,
    row.country,
    row.device,
    row.pageUrl,
    row.clicks,
    row.impressions,
    row.ctr.toFixed(8),
    row.position.toFixed(4),
    row.sourceSystem,
    row.signalExternalId,
    row.signalScore,
    row.confidence.toFixed(4),
    row.opportunity,
  ]);
}

export function parseOrganicSearchCsv(
  csv: string,
  options: { now?: Date } = {},
): OrganicSearchIngressPreview {
  const now = options.now ?? new Date();
  const byteLength = Buffer.byteLength(csv, "utf8");
  if (byteLength === 0) {
    return emptyPreview([{ row: 0, field: null, code: "empty_csv", message: "Paste or select a CSV first." }]);
  }
  if (byteLength > ORGANIC_SEARCH_INGRESS_MAX_BYTES) {
    return emptyPreview([{
      row: 0,
      field: null,
      code: "csv_too_large",
      message: `CSV exceeds the ${ORGANIC_SEARCH_INGRESS_MAX_BYTES / 1024} KiB limit.`,
    }]);
  }

  const matrix = parseBoundedCsvMatrix(csv.replace(/^\uFEFF/, ""), { maxCellCharacters: 2_048 });
  if (!matrix.ok) {
    return emptyPreview([{ row: 0, field: null, code: matrix.code, message: matrix.message }]);
  }
  if (matrix.rows.length === 0) {
    return emptyPreview([{ row: 0, field: null, code: "empty_csv", message: "CSV has no header row." }]);
  }

  const issues: OrganicSearchIngressIssue[] = [];
  const headers = matrix.rows[0].map((value) => value.trim().toLowerCase());
  const duplicates = headers.filter((value, index) => headers.indexOf(value) !== index);
  for (const duplicate of [...new Set(duplicates)]) {
    issue(issues, 1, duplicate || null, "duplicate_header", `Header ${duplicate || "(blank)"} is duplicated.`);
  }
  for (const required of ORGANIC_SEARCH_INGRESS_HEADERS) {
    if (!headers.includes(required)) issue(issues, 1, required, "missing_header", `Required header ${required} is missing.`);
  }
  for (const header of headers) {
    if (!HEADER_SET.has(header)) issue(issues, 1, header || null, "unknown_header", `Unknown header ${header || "(blank)"}.`);
  }
  if (issues.length) return emptyPreview(issues);

  const dataRows = matrix.rows.slice(1);
  if (dataRows.length === 0) {
    return emptyPreview([{ row: 0, field: null, code: "empty_csv", message: "CSV has no page-performance rows." }]);
  }
  if (dataRows.length > ORGANIC_SEARCH_INGRESS_MAX_ROWS) {
    return emptyPreview([{
      row: 0,
      field: null,
      code: "too_many_rows",
      message: `CSV exceeds the ${ORGANIC_SEARCH_INGRESS_MAX_ROWS}-row batch limit.`,
    }]);
  }

  const rows: OrganicSearchImportRow[] = [];
  const pageIdentities = new Set<string>();
  const reportIdentities = new Set<string>();

  dataRows.forEach((cells, rowIndex) => {
    const displayRow = rowIndex + 2;
    if (cells.length !== headers.length) {
      issue(issues, displayRow, null, "column_count_mismatch", "Row does not match the canonical header count.");
      return;
    }
    const raw = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    const startDate = raw.start_date.trim();
    const endDate = raw.end_date.trim();
    const window = dateWindow(startDate, endDate, now);
    const siteProperty = normalizeSiteProperty(raw.site_property);
    const searchType = raw.search_type.trim().toLowerCase();
    const dataState = raw.data_state.trim().toLowerCase();
    const country = raw.country.trim().toUpperCase();
    const device = raw.device.trim().toLowerCase();
    const sourceSystem = raw.source_system.trim().toLowerCase();
    const page = siteProperty ? normalizeOwnedPage(raw.page, siteProperty) : null;
    const clicks = parsedInteger(raw.clicks);
    const impressions = parsedInteger(raw.impressions, 1);
    const reportedCtr = parsedCtr(raw.ctr);
    const position = parsedPosition(raw.position);

    if (!window) issue(issues, displayRow, "start_date", "invalid_date_window", "Use real YYYY-MM-DD dates from the last 550 days, with start on or before end and neither in the future.");
    if (!siteProperty) issue(issues, displayRow, "site_property", "unowned_site_property", "Use an approved AskMagicMike.com or OurTownProperties.com Search Console property.");
    if (!SEARCH_TYPE_SET.has(searchType)) issue(issues, displayRow, "search_type", "invalid_enum", `Use one of: ${ORGANIC_SEARCH_TYPES.join(", ")}.`);
    if (!DATA_STATE_SET.has(dataState)) issue(issues, displayRow, "data_state", "invalid_enum", "Use final or fresh; fresh data receives lower confidence.");
    if (!COUNTRY.test(country)) issue(issues, displayRow, "country", "invalid_country", "Use ALL or an uppercase ISO alpha-3 country code such as USA.");
    if (!DEVICE_SET.has(device)) issue(issues, displayRow, "device", "invalid_enum", `Use one of: ${ORGANIC_SEARCH_DEVICES.join(", ")}.`);
    if (!page) issue(issues, displayRow, "page", "invalid_owned_page", "Use an HTTPS page on the selected owned property, without user info, port, query, fragment, control characters, or an email-like path.");
    if (clicks === null) issue(issues, displayRow, "clicks", "invalid_integer", "Use a non-negative whole number.");
    if (impressions === null) issue(issues, displayRow, "impressions", "invalid_integer", "Use a positive whole number.");
    if (reportedCtr === null) issue(issues, displayRow, "ctr", "invalid_ctr", "Use a decimal from 0–1 or a percentage from 0%–100%.");
    if (position === null) issue(issues, displayRow, "position", "invalid_position", "Use a decimal average position from 1 through 1000.");
    if (!SOURCE_SYSTEM_SET.has(sourceSystem)) issue(issues, displayRow, "source_system", "invalid_source_system", "Use google_search_console_csv or the synthetic template marker.");

    if (
      !window || !siteProperty || !SEARCH_TYPE_SET.has(searchType) ||
      !DATA_STATE_SET.has(dataState) || !COUNTRY.test(country) || !DEVICE_SET.has(device) ||
      !page || clicks === null || impressions === null || reportedCtr === null ||
      position === null || !SOURCE_SYSTEM_SET.has(sourceSystem)
    ) return;

    if (clicks > impressions) {
      issue(issues, displayRow, "clicks", "clicks_exceed_impressions", "Clicks cannot exceed impressions in this page-level contract.");
      return;
    }
    const ctr = round(clicks / impressions, 8);
    if (Math.abs(reportedCtr - ctr) > 0.0001) {
      issue(issues, displayRow, "ctr", "ctr_mismatch", "Reported CTR does not reconcile to clicks divided by impressions within the rounding tolerance.");
      return;
    }

    const reportIdentity = JSON.stringify([
      startDate, endDate, siteProperty, searchType, dataState, country, device, sourceSystem,
    ]);
    reportIdentities.add(reportIdentity);
    const pageIdentity = `${reportIdentity}|${page.pageUrl}`;
    if (pageIdentities.has(pageIdentity)) {
      issue(issues, displayRow, "page", "duplicate_page", "A page may appear only once in one report batch.");
      return;
    }
    pageIdentities.add(pageIdentity);

    const signalExternalId = `gsc_page:${sha256(pageIdentity)}`;
    const scoring = scoreOrganicSearchPage({
      pageUrl: page.pageUrl,
      pageHost: page.pageHost,
      pagePath: page.pagePath,
      startDate,
      endDate,
      dataState: dataState as OrganicSearchDataState,
      country,
      device: device as OrganicSearchDevice,
      clicks,
      impressions,
      ctr,
      position,
    });
    const rowWithoutFingerprint: Omit<OrganicSearchImportRow, "rowFingerprint"> = {
      startDate,
      endDate,
      siteProperty,
      searchType: searchType as OrganicSearchType,
      dataState: dataState as OrganicSearchDataState,
      country,
      device: device as OrganicSearchDevice,
      pageUrl: page.pageUrl,
      pageHost: page.pageHost,
      pagePath: page.pagePath,
      clicks,
      impressions,
      ctr,
      position,
      sourceSystem: sourceSystem as (typeof ORGANIC_SEARCH_SOURCE_SYSTEMS)[number],
      signalExternalId,
      signalScore: scoring.signalScore,
      confidence: scoring.confidence,
      opportunity: scoring.opportunity,
    };
    rows.push({
      ...rowWithoutFingerprint,
      rowFingerprint: sha256(`${ORGANIC_SEARCH_INGRESS_VERSION}|${canonicalRowForHash(rowWithoutFingerprint)}`),
    });
  });

  if (reportIdentities.size > 1) {
    issue(issues, 0, null, "mixed_report_identity", "One batch must contain one exact date window, property, search type, data state, country, device, and source system.");
  }

  const sortedRows = [...rows].sort((left, right) => left.pageUrl.localeCompare(right.pageUrl));
  const totals = sortedRows.reduce<OrganicSearchIngressTotals>((sum, row) => ({
    clicks: sum.clicks + row.clicks,
    impressions: sum.impressions + row.impressions,
    ctr: 0,
    opportunities: sum.opportunities + (row.opportunity ? 1 : 0),
  }), { clicks: 0, impressions: 0, ctr: 0, opportunities: 0 });
  totals.ctr = totals.impressions > 0 ? round(totals.clicks / totals.impressions, 8) : 0;
  const siteProperties = [...new Set(sortedRows.map((row) => row.siteProperty))].sort();
  const pageHosts = [...new Set(sortedRows.map((row) => row.pageHost))].sort();
  const sourceSystems = [...new Set(sortedRows.map((row) => row.sourceSystem))].sort();
  const synthetic = sortedRows.some((row) => row.sourceSystem === "synthetic_template");
  const ok = issues.length === 0 && sortedRows.length === dataRows.length;
  const batchFingerprint = ok
    ? sha256(`${ORGANIC_SEARCH_INGRESS_VERSION}|${JSON.stringify(sortedRows.map((row) => row.rowFingerprint))}`)
    : null;

  return {
    ok,
    version: ORGANIC_SEARCH_INGRESS_VERSION,
    batchFingerprint,
    rowCount: sortedRows.length,
    dateStart: sortedRows[0]?.startDate ?? null,
    dateEnd: sortedRows[0]?.endDate ?? null,
    siteProperties,
    pageHosts,
    sourceSystems,
    synthetic,
    totals,
    rows: sortedRows,
    issues,
    sourceCoverage: "operator_export_not_guaranteed_exhaustive",
    rawCsvRetained: false,
    rawQueriesRetained: false,
    providerCallPerformed: false,
  };
}

export function organicSearchImportEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.GROWTH_SEARCH_IMPORT_ENABLED === "true";
}

export function organicSearchRowsForDatabase(rows: OrganicSearchImportRow[]) {
  return rows.map((row) => ({
    start_date: row.startDate,
    end_date: row.endDate,
    site_property: row.siteProperty,
    search_type: row.searchType,
    data_state: row.dataState,
    country: row.country,
    device: row.device,
    page_url: row.pageUrl,
    page_host: row.pageHost,
    page_path: row.pagePath,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr.toFixed(8),
    position: row.position.toFixed(4),
    source_system: row.sourceSystem,
    signal_external_id: row.signalExternalId,
    signal_score: row.signalScore,
    confidence: row.confidence.toFixed(4),
    opportunity_key: row.opportunity?.key ?? null,
    opportunity_type: row.opportunity?.type ?? null,
    opportunity_title: row.opportunity?.title ?? null,
    opportunity_rationale: row.opportunity?.rationale ?? null,
    opportunity_score: row.opportunity?.score ?? null,
    policy_ctr_threshold: row.opportunity?.policyCtrThreshold.toFixed(8) ?? null,
    demand_points: row.opportunity?.demandPoints ?? null,
    accessibility_points: row.opportunity?.accessibilityPoints ?? null,
    click_gap_points: row.opportunity?.clickGapPoints ?? null,
    row_fingerprint: row.rowFingerprint,
  }));
}

export const SYNTHETIC_ORGANIC_SEARCH_CSV = `${ORGANIC_SEARCH_INGRESS_HEADERS.join(",")}\n2026-08-01,2026-08-20,sc-domain:askmagicmike.com,web,final,ALL,all,https://www.askmagicmike.com/internal-qa-organic-search,12,1200,1%,7.2,synthetic_template`;
