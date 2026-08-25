import { createHash } from "node:crypto";
import { parseBoundedCsvMatrix } from "./bounded-csv";

export const LOCAL_PROFILE_PERFORMANCE_INGRESS_VERSION =
  "google_business_profile_performance_csv_v1";
export const LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_BYTES = 128 * 1024;
export const LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_ROWS = 32;
export const LOCAL_PROFILE_PERFORMANCE_INGRESS_CONFIRMATION =
  "IMPORT REVIEWED LOCAL PROFILE PERFORMANCE";

export const LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS = [
  "start_date",
  "end_date",
  "profile_key",
  "data_state",
  "metric",
  "value",
  "source_system",
] as const;

export const LOCAL_PROFILE_KEYS = ["ourtown_properties_primary"] as const;
export const LOCAL_PROFILE_DATA_STATES = ["final", "partial"] as const;
export const LOCAL_PROFILE_SOURCE_SYSTEMS = [
  "google_business_profile_report",
  "synthetic_template",
] as const;
export const LOCAL_PROFILE_METRICS = [
  "business_impressions_desktop_search",
  "business_impressions_mobile_search",
  "business_impressions_desktop_maps",
  "business_impressions_mobile_maps",
  "website_clicks",
  "call_clicks",
  "business_direction_requests",
  "business_conversations",
  "business_bookings",
] as const;

export type LocalProfileKey = (typeof LOCAL_PROFILE_KEYS)[number];
export type LocalProfileDataState = (typeof LOCAL_PROFILE_DATA_STATES)[number];
export type LocalProfileMetric = (typeof LOCAL_PROFILE_METRICS)[number];
export type LocalProfileSourceSystem = (typeof LOCAL_PROFILE_SOURCE_SYSTEMS)[number];

export type LocalProfileOpportunityType = "local_profile_interaction_gap";

export interface LocalProfileOpportunity {
  key: string;
  type: LocalProfileOpportunityType;
  title: string;
  rationale: string;
  score: number;
  policyInteractionRateThreshold: number;
  demandPoints: number;
  interactionGapPoints: number;
  completenessPoints: number;
}

export interface LocalProfilePerformanceImportRow {
  startDate: string;
  endDate: string;
  profileKey: LocalProfileKey;
  geography: "Wilson, NC";
  dataState: LocalProfileDataState;
  metric: LocalProfileMetric;
  value: number;
  sourceSystem: LocalProfileSourceSystem;
  signalType: "search_demand" | "engagement";
  signalExternalId: string;
  signalScore: number;
  confidence: number;
  rowFingerprint: string;
}

export interface LocalProfilePerformanceIngressIssue {
  row: number;
  field: string | null;
  code: string;
  message: string;
}

export interface LocalProfilePerformanceTotals {
  impressions: number;
  interactions: number;
  interactionRate: number;
  websiteClicks: number;
  callClicks: number;
  directionRequests: number;
  conversations: number;
  bookings: number;
}

export interface LocalProfilePerformanceIngressPreview {
  ok: boolean;
  version: typeof LOCAL_PROFILE_PERFORMANCE_INGRESS_VERSION;
  batchFingerprint: string | null;
  rowCount: number;
  dateStart: string | null;
  dateEnd: string | null;
  profileKeys: string[];
  sourceSystems: string[];
  synthetic: boolean;
  totals: LocalProfilePerformanceTotals;
  rows: LocalProfilePerformanceImportRow[];
  opportunity: LocalProfileOpportunity | null;
  issues: LocalProfilePerformanceIngressIssue[];
  sourceCoverage: "operator_reviewed_aggregate_report";
  rawCsvRetained: false;
  rawSearchTermsRetained: false;
  providerLocationIdRetained: false;
  providerCallPerformed: false;
}

const HEADER_SET = new Set<string>(LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS);
const PROFILE_SET = new Set<string>(LOCAL_PROFILE_KEYS);
const DATA_STATE_SET = new Set<string>(LOCAL_PROFILE_DATA_STATES);
const METRIC_SET = new Set<string>(LOCAL_PROFILE_METRICS);
const SOURCE_SYSTEM_SET = new Set<string>(LOCAL_PROFILE_SOURCE_SYSTEMS);
const IMPRESSION_METRICS = new Set<LocalProfileMetric>([
  "business_impressions_desktop_search",
  "business_impressions_mobile_search",
  "business_impressions_desktop_maps",
  "business_impressions_mobile_maps",
]);
const CORE_INTERACTION_METRICS = [
  "website_clicks",
  "call_clicks",
  "business_direction_requests",
] as const satisfies readonly LocalProfileMetric[];
const INTEGER = /^(?:0|[1-9][0-9]{0,9})$/;
const POLICY_INTERACTION_RATE_THRESHOLD = 0.01;

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
  issues: LocalProfilePerformanceIngressIssue[],
  row: number,
  field: string | null,
  code: string,
  message: string,
) {
  if (issues.length < 100) issues.push({ row, field, code, message });
}

function emptyTotals(): LocalProfilePerformanceTotals {
  return {
    impressions: 0,
    interactions: 0,
    interactionRate: 0,
    websiteClicks: 0,
    callClicks: 0,
    directionRequests: 0,
    conversations: 0,
    bookings: 0,
  };
}

function emptyPreview(
  issues: LocalProfilePerformanceIngressIssue[],
): LocalProfilePerformanceIngressPreview {
  return {
    ok: false,
    version: LOCAL_PROFILE_PERFORMANCE_INGRESS_VERSION,
    batchFingerprint: null,
    rowCount: 0,
    dateStart: null,
    dateEnd: null,
    profileKeys: [],
    sourceSystems: [],
    synthetic: false,
    totals: emptyTotals(),
    rows: [],
    opportunity: null,
    issues,
    sourceCoverage: "operator_reviewed_aggregate_report",
    rawCsvRetained: false,
    rawSearchTermsRetained: false,
    providerLocationIdRetained: false,
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

function validDateWindow(startDate: string, endDate: string, now: Date) {
  const start = strictDateMilliseconds(startDate);
  const end = strictDateMilliseconds(endDate);
  if (start === null || end === null) return false;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const oldest = today - 550 * 24 * 60 * 60 * 1000;
  return start >= oldest && end <= today && start <= end &&
    end - start <= 550 * 24 * 60 * 60 * 1000;
}

function plainCell(value: string, maximum: number) {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized.length <= maximum &&
    !hasControlCharacter(normalized) && !/^[=+@-]/.test(normalized)
    ? normalized
    : null;
}

function parsedInteger(value: string) {
  const normalized = value.trim();
  if (!INTEGER.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 2_147_483_647
    ? parsed
    : null;
}

function signalType(metric: LocalProfileMetric) {
  return IMPRESSION_METRICS.has(metric) ? "search_demand" as const : "engagement" as const;
}

function scoreMetric(metric: LocalProfileMetric, value: number, dataState: LocalProfileDataState) {
  const scale = IMPRESSION_METRICS.has(metric) ? 5 : 3;
  const signalScore = Math.min(100, Math.round((Math.log10(value + 1) / scale) * 100));
  const confidence = round(Math.min(0.95,
    0.45 + (dataState === "final" ? 0.25 : 0.08) +
    Math.min(0.25, (Math.log10(value + 1) / scale) * 0.25)
  ), 4);
  return { signalScore, confidence };
}

function canonicalRowForHash(row: Omit<LocalProfilePerformanceImportRow, "rowFingerprint">) {
  return [
    row.startDate,
    row.endDate,
    row.profileKey,
    row.geography,
    row.dataState,
    row.metric,
    row.value,
    row.sourceSystem,
    row.signalType,
    row.signalExternalId,
    row.signalScore,
    row.confidence.toFixed(4),
  ].join("|");
}

function totalsFor(rows: LocalProfilePerformanceImportRow[]): LocalProfilePerformanceTotals {
  const values = new Map(rows.map((row) => [row.metric, row.value]));
  const impressions = rows
    .filter((row) => IMPRESSION_METRICS.has(row.metric))
    .reduce((sum, row) => sum + row.value, 0);
  const websiteClicks = values.get("website_clicks") ?? 0;
  const callClicks = values.get("call_clicks") ?? 0;
  const directionRequests = values.get("business_direction_requests") ?? 0;
  const conversations = values.get("business_conversations") ?? 0;
  const bookings = values.get("business_bookings") ?? 0;
  const interactions = websiteClicks + callClicks + directionRequests + conversations + bookings;
  return {
    impressions,
    interactions,
    interactionRate: impressions > 0 ? round(interactions / impressions, 8) : 0,
    websiteClicks,
    callClicks,
    directionRequests,
    conversations,
    bookings,
  };
}

export function scoreLocalProfileOpportunity(input: {
  profileKey: LocalProfileKey;
  startDate: string;
  endDate: string;
  dataState: LocalProfileDataState;
  metricsPresent: ReadonlySet<LocalProfileMetric>;
  totals: LocalProfilePerformanceTotals;
}) {
  const hasCoreActions = CORE_INTERACTION_METRICS.every((metric) => input.metricsPresent.has(metric));
  if (
    input.dataState !== "final" || !hasCoreActions || input.totals.impressions < 250 ||
    input.totals.interactionRate >= POLICY_INTERACTION_RATE_THRESHOLD
  ) return null;

  const demandPoints = Math.min(
    55,
    Math.round((Math.log10(input.totals.impressions + 1) / 5) * 55),
  );
  const interactionGapPoints = Math.max(
    0,
    Math.min(
      35,
      Math.round(35 * (1 - input.totals.interactionRate / POLICY_INTERACTION_RATE_THRESHOLD)),
    ),
  );
  const completenessPoints = Math.round(
    10 * (CORE_INTERACTION_METRICS.filter((metric) => input.metricsPresent.has(metric)).length /
      CORE_INTERACTION_METRICS.length),
  );
  const score = Math.min(100, demandPoints + interactionGapPoints + completenessPoints);

  return {
    key: `local_profile:${sha256(input.profileKey)}`,
    type: "local_profile_interaction_gap",
    title: "Improve Google Business Profile handoff",
    rationale: `The reviewed Google Business Profile report recorded ${input.totals.impressions.toLocaleString("en-US")} Search/Maps impressions and ${input.totals.interactions.toLocaleString("en-US")} reported interactions (${(input.totals.interactionRate * 100).toFixed(2)}%) from ${input.startDate} through ${input.endDate}. The explainable review threshold is ${(POLICY_INTERACTION_RATE_THRESHOLD * 100).toFixed(2)}%. Verify the live profile identity, website destination, approved services, recent posts, and conversion path before any profile edit or publication.`,
    score,
    policyInteractionRateThreshold: POLICY_INTERACTION_RATE_THRESHOLD,
    demandPoints,
    interactionGapPoints,
    completenessPoints,
  } satisfies LocalProfileOpportunity;
}

export function parseLocalProfilePerformanceCsv(
  csv: string,
  options: { now?: Date } = {},
): LocalProfilePerformanceIngressPreview {
  const now = options.now ?? new Date();
  const byteLength = Buffer.byteLength(csv, "utf8");
  if (byteLength === 0) {
    return emptyPreview([{ row: 0, field: null, code: "empty_csv", message: "Paste or select a CSV first." }]);
  }
  if (byteLength > LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_BYTES) {
    return emptyPreview([{
      row: 0,
      field: null,
      code: "csv_too_large",
      message: `CSV exceeds the ${LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_BYTES / 1024} KiB limit.`,
    }]);
  }

  const matrix = parseBoundedCsvMatrix(csv.replace(/^\uFEFF/, ""), { maxCellCharacters: 256 });
  if (!matrix.ok) {
    return emptyPreview([{ row: 0, field: null, code: matrix.code, message: matrix.message }]);
  }
  if (matrix.rows.length === 0) {
    return emptyPreview([{ row: 0, field: null, code: "empty_csv", message: "CSV has no header row." }]);
  }

  const issues: LocalProfilePerformanceIngressIssue[] = [];
  const headers = matrix.rows[0].map((value) => value.trim().toLowerCase());
  const duplicates = headers.filter((value, index) => headers.indexOf(value) !== index);
  for (const duplicate of [...new Set(duplicates)]) {
    issue(issues, 1, duplicate || null, "duplicate_header", `Header ${duplicate || "(blank)"} is duplicated.`);
  }
  for (const required of LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS) {
    if (!headers.includes(required)) issue(issues, 1, required, "missing_header", `Required header ${required} is missing.`);
  }
  for (const header of headers) {
    if (!HEADER_SET.has(header)) issue(issues, 1, header || null, "unknown_header", `Header ${header || "(blank)"} is not allowed.`);
  }
  if (issues.length) return emptyPreview(issues);

  const index = Object.fromEntries(headers.map((header, position) => [header, position])) as Record<string, number>;
  const dataRows = matrix.rows.slice(1).filter((row) => row.some((cell) => cell.trim().length > 0));
  if (dataRows.length === 0) {
    return emptyPreview([{ row: 0, field: null, code: "empty_csv", message: "CSV has no metric rows." }]);
  }
  if (dataRows.length > LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_ROWS) {
    return emptyPreview([{
      row: 0,
      field: null,
      code: "too_many_rows",
      message: `CSV exceeds the ${LOCAL_PROFILE_PERFORMANCE_INGRESS_MAX_ROWS}-row batch limit.`,
    }]);
  }

  const parsedRows: LocalProfilePerformanceImportRow[] = [];
  const seenMetrics = new Set<LocalProfileMetric>();

  dataRows.forEach((cells, dataIndex) => {
    const rowNumber = dataIndex + 2;
    if (cells.length !== headers.length) {
      issue(issues, rowNumber, null, "column_count_mismatch", "Row column count does not match the header.");
      return;
    }
    const value = (field: (typeof LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS)[number]) =>
      cells[index[field]] ?? "";
    const startDate = value("start_date").trim();
    const endDate = value("end_date").trim();
    const profileKey = plainCell(value("profile_key"), 64);
    const dataState = plainCell(value("data_state"), 16);
    const metric = plainCell(value("metric"), 64);
    const metricValue = parsedInteger(value("value"));
    const sourceSystem = plainCell(value("source_system"), 64);

    if (!validDateWindow(startDate, endDate, now)) {
      issue(issues, rowNumber, "start_date", "invalid_date_window", "Dates must form a valid non-future window within 550 days.");
    }
    if (!profileKey || !PROFILE_SET.has(profileKey)) {
      issue(issues, rowNumber, "profile_key", "unknown_profile", "Profile key is not approved for this system.");
    }
    if (!dataState || !DATA_STATE_SET.has(dataState)) {
      issue(issues, rowNumber, "data_state", "invalid_data_state", "Data state must be final or partial.");
    }
    if (!metric || !METRIC_SET.has(metric)) {
      issue(issues, rowNumber, "metric", "unknown_metric", "Metric is not in the approved aggregate allowlist.");
    }
    if (metricValue === null) {
      issue(issues, rowNumber, "value", "invalid_value", "Metric value must be a non-negative integer within bounds.");
    }
    if (!sourceSystem || !SOURCE_SYSTEM_SET.has(sourceSystem)) {
      issue(issues, rowNumber, "source_system", "unknown_source", "Source system is not approved.");
    }
    if (metric && METRIC_SET.has(metric) && seenMetrics.has(metric as LocalProfileMetric)) {
      issue(issues, rowNumber, "metric", "duplicate_metric", "A report may include each metric only once.");
    }
    if (
      issues.some((entry) => entry.row === rowNumber) || !profileKey || !dataState || !metric ||
      metricValue === null || !sourceSystem
    ) return;

    const typedProfile = profileKey as LocalProfileKey;
    const typedState = dataState as LocalProfileDataState;
    const typedMetric = metric as LocalProfileMetric;
    const typedSource = sourceSystem as LocalProfileSourceSystem;
    seenMetrics.add(typedMetric);
    const scored = scoreMetric(typedMetric, metricValue, typedState);
    const externalIdentity = [typedProfile, startDate, endDate, typedMetric].join("|");
    const rowWithoutFingerprint = {
      startDate,
      endDate,
      profileKey: typedProfile,
      geography: "Wilson, NC" as const,
      dataState: typedState,
      metric: typedMetric,
      value: metricValue,
      sourceSystem: typedSource,
      signalType: signalType(typedMetric),
      signalExternalId: `gbp_performance:${sha256(externalIdentity)}`,
      signalScore: scored.signalScore,
      confidence: scored.confidence,
    };
    parsedRows.push({
      ...rowWithoutFingerprint,
      rowFingerprint: sha256(
        `${LOCAL_PROFILE_PERFORMANCE_INGRESS_VERSION}|${canonicalRowForHash(rowWithoutFingerprint)}`,
      ),
    });
  });

  if (issues.length) return emptyPreview(issues);

  const identities = new Set(parsedRows.map((row) => [
    row.startDate,
    row.endDate,
    row.profileKey,
    row.dataState,
    row.sourceSystem,
  ].join("|")));
  if (identities.size !== 1) {
    return emptyPreview([{
      row: 0,
      field: null,
      code: "mixed_report_identity",
      message: "All rows must share one profile, date window, data state, and source system.",
    }]);
  }
  if (!parsedRows.some((row) => IMPRESSION_METRICS.has(row.metric))) {
    return emptyPreview([{
      row: 0,
      field: "metric",
      code: "impression_metric_required",
      message: "At least one approved Search or Maps impression metric is required.",
    }]);
  }

  const sortedRows = [...parsedRows].sort((left, right) => left.metric.localeCompare(right.metric));
  const totals = totalsFor(sortedRows);
  const first = sortedRows[0];
  const opportunity = scoreLocalProfileOpportunity({
    profileKey: first.profileKey,
    startDate: first.startDate,
    endDate: first.endDate,
    dataState: first.dataState,
    metricsPresent: new Set(sortedRows.map((row) => row.metric)),
    totals,
  });
  const synthetic = first.sourceSystem === "synthetic_template";
  const batchFingerprint = sha256([
    LOCAL_PROFILE_PERFORMANCE_INGRESS_VERSION,
    ...sortedRows.map((row) => row.rowFingerprint),
    totals.impressions,
    totals.interactions,
    totals.interactionRate.toFixed(8),
    totals.websiteClicks,
    totals.callClicks,
    totals.directionRequests,
    totals.conversations,
    totals.bookings,
    opportunity?.key ?? "",
    opportunity?.type ?? "",
    opportunity?.title ?? "",
    opportunity?.rationale ?? "",
    opportunity?.score ?? "",
    opportunity?.policyInteractionRateThreshold.toFixed(8) ?? "",
    opportunity?.demandPoints ?? "",
    opportunity?.interactionGapPoints ?? "",
    opportunity?.completenessPoints ?? "",
  ].join("|"));

  return {
    ok: true,
    version: LOCAL_PROFILE_PERFORMANCE_INGRESS_VERSION,
    batchFingerprint,
    rowCount: sortedRows.length,
    dateStart: first.startDate,
    dateEnd: first.endDate,
    profileKeys: [first.profileKey],
    sourceSystems: [first.sourceSystem],
    synthetic,
    totals,
    rows: sortedRows,
    opportunity,
    issues: [],
    sourceCoverage: "operator_reviewed_aggregate_report",
    rawCsvRetained: false,
    rawSearchTermsRetained: false,
    providerLocationIdRetained: false,
    providerCallPerformed: false,
  };
}

export function localProfilePerformanceRowsForDatabase(
  rows: LocalProfilePerformanceImportRow[],
) {
  return rows.map((row) => ({
    start_date: row.startDate,
    end_date: row.endDate,
    profile_key: row.profileKey,
    geography: row.geography,
    data_state: row.dataState,
    metric: row.metric,
    value: row.value,
    source_system: row.sourceSystem,
    signal_type: row.signalType,
    signal_external_id: row.signalExternalId,
    signal_score: row.signalScore,
    confidence: row.confidence.toFixed(4),
    row_fingerprint: row.rowFingerprint,
  }));
}

export function localProfilePerformanceSummaryForDatabase(
  preview: LocalProfilePerformanceIngressPreview,
) {
  const opportunity = preview.opportunity;
  return {
    impressions_total: preview.totals.impressions,
    interactions_total: preview.totals.interactions,
    interaction_rate: preview.totals.interactionRate.toFixed(8),
    website_clicks: preview.totals.websiteClicks,
    call_clicks: preview.totals.callClicks,
    direction_requests: preview.totals.directionRequests,
    conversations: preview.totals.conversations,
    bookings: preview.totals.bookings,
    opportunity_key: opportunity?.key ?? null,
    opportunity_type: opportunity?.type ?? null,
    opportunity_title: opportunity?.title ?? null,
    opportunity_rationale: opportunity?.rationale ?? null,
    opportunity_score: opportunity?.score ?? null,
    policy_interaction_rate_threshold: opportunity?.policyInteractionRateThreshold.toFixed(8) ?? null,
    demand_points: opportunity?.demandPoints ?? null,
    interaction_gap_points: opportunity?.interactionGapPoints ?? null,
    completeness_points: opportunity?.completenessPoints ?? null,
  };
}

export function localProfilePerformanceImportEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.GROWTH_LOCAL_PROFILE_IMPORT_ENABLED === "true";
}

export const SYNTHETIC_LOCAL_PROFILE_PERFORMANCE_CSV =
  `${LOCAL_PROFILE_PERFORMANCE_INGRESS_HEADERS.join(",")}\n` +
  [
    "2026-08-01,2026-08-20,ourtown_properties_primary,final,business_impressions_mobile_search,900,synthetic_template",
    "2026-08-01,2026-08-20,ourtown_properties_primary,final,business_impressions_desktop_search,300,synthetic_template",
    "2026-08-01,2026-08-20,ourtown_properties_primary,final,website_clicks,3,synthetic_template",
    "2026-08-01,2026-08-20,ourtown_properties_primary,final,call_clicks,2,synthetic_template",
    "2026-08-01,2026-08-20,ourtown_properties_primary,final,business_direction_requests,1,synthetic_template",
  ].join("\n");
