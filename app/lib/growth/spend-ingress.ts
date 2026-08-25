import { createHash } from "node:crypto";

export const SPEND_INGRESS_VERSION = "marketing_spend_csv_v1";
export const SPEND_INGRESS_MAX_BYTES = 128 * 1024;
export const SPEND_INGRESS_MAX_ROWS = 250;
export const SPEND_INGRESS_CONFIRMATION = "IMPORT REVIEWED SPEND";

export const SPEND_INGRESS_HEADERS = [
  "spend_date",
  "channel_key",
  "channel_name",
  "vendor",
  "channel_type",
  "buying_model",
  "campaign_key",
  "campaign_name",
  "campaign_status",
  "external_campaign_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "spend_usd",
  "impressions",
  "clicks",
  "platform_leads",
  "booked_appointments",
  "source_system",
] as const;

export const SPEND_CHANNEL_TYPES = [
  "portal",
  "search",
  "social",
  "display",
  "referral",
  "organic",
  "database",
  "event",
  "direct_mail",
  "partner",
  "outbound",
  "other",
] as const;

export const SPEND_BUYING_MODELS = [
  "owned",
  "subscription",
  "cpl",
  "cpc",
  "cpm",
  "referral_fee",
  "hybrid",
  "free",
] as const;

export const SPEND_CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
] as const;

export type SpendChannelType = (typeof SPEND_CHANNEL_TYPES)[number];
export type SpendBuyingModel = (typeof SPEND_BUYING_MODELS)[number];
export type SpendCampaignStatus = (typeof SPEND_CAMPAIGN_STATUSES)[number];

export interface MarketingSpendImportRow {
  spendDate: string;
  channelKey: string;
  channelName: string;
  vendor: string;
  channelType: SpendChannelType;
  buyingModel: SpendBuyingModel;
  campaignKey: string;
  campaignName: string;
  campaignStatus: SpendCampaignStatus;
  externalCampaignId: string | null;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  spendUsd: number;
  impressions: number;
  clicks: number;
  platformLeads: number;
  bookedAppointments: number;
  sourceSystem: string;
  rowFingerprint: string;
}

export interface SpendIngressIssue {
  row: number;
  field: string | null;
  code: string;
  message: string;
}

export interface SpendIngressTotals {
  spendUsd: number;
  impressions: number;
  clicks: number;
  platformLeads: number;
  bookedAppointments: number;
}

export interface SpendIngressPreview {
  ok: boolean;
  version: typeof SPEND_INGRESS_VERSION;
  batchFingerprint: string | null;
  rowCount: number;
  dateStart: string | null;
  dateEnd: string | null;
  sourceSystems: string[];
  synthetic: boolean;
  totals: SpendIngressTotals;
  rows: MarketingSpendImportRow[];
  issues: SpendIngressIssue[];
  rawCsvRetained: false;
}

const HEADER_SET = new Set<string>(SPEND_INGRESS_HEADERS);
const CHANNEL_TYPE_SET = new Set<string>(SPEND_CHANNEL_TYPES);
const BUYING_MODEL_SET = new Set<string>(SPEND_BUYING_MODELS);
const CAMPAIGN_STATUS_SET = new Set<string>(SPEND_CAMPAIGN_STATUSES);
const SLUG = /^[a-z0-9][a-z0-9._-]{0,119}$/;
const EXTERNAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const MONEY = /^(?:0|[1-9][0-9]{0,7})(?:\.[0-9]{1,2})?$/;
const INTEGER = /^(?:0|[1-9][0-9]{0,9})$/;
const FORMULA_PREFIX = /^[=+@-]/;
const SYNTHETIC_MARKER = /(?:^|[^a-z0-9])(?:qa|test|demo|synthetic)(?:$|[^a-z0-9])/i;

type MatrixResult =
  | { ok: true; rows: string[][] }
  | { ok: false; code: string; message: string };

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseCsvMatrix(input: string): MatrixResult {
  if (input.includes("\u0000")) {
    return { ok: false, code: "null_byte", message: "CSV contains a prohibited null byte." };
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let justClosedQuote = false;

  const pushField = () => {
    row.push(field);
    field = "";
    justClosedQuote = false;
  };
  const pushRow = () => {
    pushField();
    if (row.some((value) => value.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          justClosedQuote = true;
        }
      } else {
        field += character;
      }
    } else if (justClosedQuote) {
      if (character === ",") pushField();
      else if (character === "\n" || character === "\r") {
        pushRow();
        if (character === "\r" && input[index + 1] === "\n") index += 1;
      } else if (character !== " " && character !== "\t") {
        return {
          ok: false,
          code: "invalid_quote_boundary",
          message: "A quoted CSV field has characters after its closing quote.",
        };
      }
    } else if (character === '"') {
      if (field.trim() !== "") {
        return {
          ok: false,
          code: "invalid_quote_boundary",
          message: "A quote begins inside an unquoted CSV field.",
        };
      }
      field = "";
      quoted = true;
    } else if (character === ",") {
      pushField();
    } else if (character === "\n" || character === "\r") {
      pushRow();
      if (character === "\r" && input[index + 1] === "\n") index += 1;
    } else {
      field += character;
    }

    if (field.length > 512) {
      return { ok: false, code: "cell_too_long", message: "A CSV cell exceeds 512 characters." };
    }
  }

  if (quoted) {
    return { ok: false, code: "unclosed_quote", message: "CSV contains an unclosed quoted field." };
  }
  if (field !== "" || row.length > 0) pushRow();
  return { ok: true, rows };
}

function strictDate(value: string, now: Date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const milliseconds = Date.UTC(year, month - 1, day);
  const parsed = new Date(milliseconds);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) return false;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const oldest = Date.UTC(now.getUTCFullYear() - 10, now.getUTCMonth(), now.getUTCDate());
  return milliseconds >= oldest && milliseconds <= today;
}

function safeDisplayText(value: string, minimum: number, maximum: number) {
  const hasControlCharacter = Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= minimum && normalized.length <= maximum &&
    !hasControlCharacter && !FORMULA_PREFIX.test(normalized)
    ? normalized
    : null;
}

function normalizedSlug(value: string) {
  const normalized = value.trim().toLowerCase();
  return SLUG.test(normalized) ? normalized : null;
}

function parsedMoney(value: string) {
  const normalized = value.trim();
  if (!MONEY.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount <= 99_999_999.99 ? amount : null;
}

function parsedInteger(value: string) {
  const normalized = value.trim();
  if (!INTEGER.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount <= 2_147_483_647 ? amount : null;
}

function emptyPreview(issues: SpendIngressIssue[]): SpendIngressPreview {
  return {
    ok: false,
    version: SPEND_INGRESS_VERSION,
    batchFingerprint: null,
    rowCount: 0,
    dateStart: null,
    dateEnd: null,
    sourceSystems: [],
    synthetic: false,
    totals: {
      spendUsd: 0,
      impressions: 0,
      clicks: 0,
      platformLeads: 0,
      bookedAppointments: 0,
    },
    rows: [],
    issues,
    rawCsvRetained: false,
  };
}

function issue(
  issues: SpendIngressIssue[],
  row: number,
  field: string | null,
  code: string,
  message: string,
) {
  if (issues.length < 100) issues.push({ row, field, code, message });
}

function canonicalRowForHash(row: Omit<MarketingSpendImportRow, "rowFingerprint">) {
  return JSON.stringify([
    row.spendDate,
    row.channelKey,
    row.channelName,
    row.vendor,
    row.channelType,
    row.buyingModel,
    row.campaignKey,
    row.campaignName,
    row.campaignStatus,
    row.externalCampaignId,
    row.utmSource,
    row.utmMedium,
    row.utmCampaign,
    row.spendUsd.toFixed(2),
    row.impressions,
    row.clicks,
    row.platformLeads,
    row.bookedAppointments,
    row.sourceSystem,
  ]);
}

export function parseMarketingSpendCsv(
  csv: string,
  options: { now?: Date } = {},
): SpendIngressPreview {
  const now = options.now ?? new Date();
  const byteLength = Buffer.byteLength(csv, "utf8");
  if (byteLength === 0) {
    return emptyPreview([{ row: 0, field: null, code: "empty_csv", message: "Paste or select a CSV first." }]);
  }
  if (byteLength > SPEND_INGRESS_MAX_BYTES) {
    return emptyPreview([{
      row: 0,
      field: null,
      code: "csv_too_large",
      message: `CSV exceeds the ${SPEND_INGRESS_MAX_BYTES / 1024} KiB limit.`,
    }]);
  }

  const matrix = parseCsvMatrix(csv.replace(/^\uFEFF/, ""));
  if (!matrix.ok) {
    return emptyPreview([{ row: 0, field: null, code: matrix.code, message: matrix.message }]);
  }
  if (matrix.rows.length === 0) {
    return emptyPreview([{ row: 0, field: null, code: "empty_csv", message: "CSV has no header row." }]);
  }

  const issues: SpendIngressIssue[] = [];
  const headers = matrix.rows[0].map((value) => value.trim().toLowerCase());
  const duplicates = headers.filter((value, index) => headers.indexOf(value) !== index);
  for (const duplicate of [...new Set(duplicates)]) {
    issue(issues, 1, duplicate || null, "duplicate_header", `Header ${duplicate || "(blank)"} is duplicated.`);
  }
  for (const required of SPEND_INGRESS_HEADERS) {
    if (!headers.includes(required)) issue(issues, 1, required, "missing_header", `Required header ${required} is missing.`);
  }
  for (const header of headers) {
    if (!HEADER_SET.has(header)) issue(issues, 1, header || null, "unknown_header", `Unknown header ${header || "(blank)"}.`);
  }
  if (issues.length) return emptyPreview(issues);

  const dataRows = matrix.rows.slice(1);
  if (dataRows.length === 0) {
    return emptyPreview([{ row: 0, field: null, code: "empty_csv", message: "CSV has no spend rows." }]);
  }
  if (dataRows.length > SPEND_INGRESS_MAX_ROWS) {
    return emptyPreview([{
      row: 0,
      field: null,
      code: "too_many_rows",
      message: `CSV exceeds the ${SPEND_INGRESS_MAX_ROWS}-row batch limit.`,
    }]);
  }

  const rows: MarketingSpendImportRow[] = [];
  const channelIdentity = new Map<string, string>();
  const campaignIdentity = new Map<string, string>();
  const dayIdentity = new Set<string>();

  dataRows.forEach((cells, rowIndex) => {
    const displayRow = rowIndex + 2;
    if (cells.length !== headers.length) {
      issue(issues, displayRow, null, "column_count_mismatch", "Row does not match the canonical header count.");
      return;
    }
    const raw = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    const spendDate = raw.spend_date.trim();
    const channelKey = normalizedSlug(raw.channel_key);
    const channelName = safeDisplayText(raw.channel_name, 2, 120);
    const vendor = normalizedSlug(raw.vendor);
    const channelType = raw.channel_type.trim().toLowerCase();
    const buyingModel = raw.buying_model.trim().toLowerCase();
    const campaignKey = normalizedSlug(raw.campaign_key);
    const campaignName = safeDisplayText(raw.campaign_name, 2, 160);
    const campaignStatus = raw.campaign_status.trim().toLowerCase();
    const externalCampaignIdText = raw.external_campaign_id.trim();
    const externalCampaignId = externalCampaignIdText === "" || EXTERNAL_ID.test(externalCampaignIdText)
      ? externalCampaignIdText || null
      : undefined;
    const utmSource = normalizedSlug(raw.utm_source);
    const utmMedium = normalizedSlug(raw.utm_medium);
    const utmCampaign = normalizedSlug(raw.utm_campaign);
    const spendUsd = parsedMoney(raw.spend_usd);
    const impressions = parsedInteger(raw.impressions);
    const clicks = parsedInteger(raw.clicks);
    const platformLeads = parsedInteger(raw.platform_leads);
    const bookedAppointments = parsedInteger(raw.booked_appointments);
    const sourceSystem = normalizedSlug(raw.source_system);

    if (!strictDate(spendDate, now)) issue(issues, displayRow, "spend_date", "invalid_date", "Use a real YYYY-MM-DD date from the last 10 years through today.");
    if (!channelKey) issue(issues, displayRow, "channel_key", "invalid_slug", "Use 1–120 lowercase letters, digits, dots, dashes, or underscores.");
    if (!channelName) issue(issues, displayRow, "channel_name", "invalid_text", "Use 2–120 plain-text characters; spreadsheet formulas are rejected.");
    if (!vendor) issue(issues, displayRow, "vendor", "invalid_slug", "Use a canonical vendor slug.");
    if (!CHANNEL_TYPE_SET.has(channelType)) issue(issues, displayRow, "channel_type", "invalid_enum", `Use one of: ${SPEND_CHANNEL_TYPES.join(", ")}.`);
    if (!BUYING_MODEL_SET.has(buyingModel)) issue(issues, displayRow, "buying_model", "invalid_enum", `Use one of: ${SPEND_BUYING_MODELS.join(", ")}.`);
    if (!campaignKey) issue(issues, displayRow, "campaign_key", "invalid_slug", "Use a canonical campaign slug.");
    if (!campaignName) issue(issues, displayRow, "campaign_name", "invalid_text", "Use 2–160 plain-text characters; spreadsheet formulas are rejected.");
    if (!CAMPAIGN_STATUS_SET.has(campaignStatus)) issue(issues, displayRow, "campaign_status", "invalid_enum", `Use one of: ${SPEND_CAMPAIGN_STATUSES.join(", ")}.`);
    if (externalCampaignId === undefined) issue(issues, displayRow, "external_campaign_id", "invalid_external_id", "Use up to 160 letters, digits, dots, colons, dashes, or underscores.");
    if (!utmSource) issue(issues, displayRow, "utm_source", "invalid_slug", "Provide the exact canonical UTM source slug.");
    if (!utmMedium) issue(issues, displayRow, "utm_medium", "invalid_slug", "Provide the exact canonical UTM medium slug.");
    if (!utmCampaign) issue(issues, displayRow, "utm_campaign", "invalid_slug", "Provide the exact canonical UTM campaign slug.");
    if (spendUsd === null) issue(issues, displayRow, "spend_usd", "invalid_money", "Use a non-negative amount with at most two decimals and no currency symbol or commas.");
    if (impressions === null) issue(issues, displayRow, "impressions", "invalid_integer", "Use a non-negative whole number.");
    if (clicks === null) issue(issues, displayRow, "clicks", "invalid_integer", "Use a non-negative whole number.");
    if (platformLeads === null) issue(issues, displayRow, "platform_leads", "invalid_integer", "Use a non-negative whole number.");
    if (bookedAppointments === null) issue(issues, displayRow, "booked_appointments", "invalid_integer", "Use a non-negative whole number.");
    if (!sourceSystem) issue(issues, displayRow, "source_system", "invalid_slug", "Provide the system that produced the report.");

    if (
      !strictDate(spendDate, now) || !channelKey || !channelName || !vendor ||
      !CHANNEL_TYPE_SET.has(channelType) || !BUYING_MODEL_SET.has(buyingModel) ||
      !campaignKey || !campaignName || !CAMPAIGN_STATUS_SET.has(campaignStatus) ||
      externalCampaignId === undefined || !utmSource || !utmMedium || !utmCampaign ||
      spendUsd === null || impressions === null || clicks === null || platformLeads === null ||
      bookedAppointments === null || !sourceSystem
    ) return;

    const rowWithoutFingerprint: Omit<MarketingSpendImportRow, "rowFingerprint"> = {
      spendDate,
      channelKey,
      channelName,
      vendor,
      channelType: channelType as SpendChannelType,
      buyingModel: buyingModel as SpendBuyingModel,
      campaignKey,
      campaignName,
      campaignStatus: campaignStatus as SpendCampaignStatus,
      externalCampaignId,
      utmSource,
      utmMedium,
      utmCampaign,
      spendUsd,
      impressions,
      clicks,
      platformLeads,
      bookedAppointments,
      sourceSystem,
    };

    const channelSignature = JSON.stringify([channelName, vendor, channelType, buyingModel]);
    const priorChannel = channelIdentity.get(channelKey);
    if (priorChannel && priorChannel !== channelSignature) {
      issue(issues, displayRow, "channel_key", "channel_identity_conflict", "The same channel_key has conflicting identity fields in this batch.");
    } else channelIdentity.set(channelKey, channelSignature);

    const campaignSignature = JSON.stringify([
      channelKey,
      campaignName,
      campaignStatus,
      externalCampaignId,
      utmSource,
      utmMedium,
      utmCampaign,
    ]);
    const priorCampaign = campaignIdentity.get(campaignKey);
    if (priorCampaign && priorCampaign !== campaignSignature) {
      issue(issues, displayRow, "campaign_key", "campaign_identity_conflict", "The same campaign_key has conflicting identity fields in this batch.");
    } else campaignIdentity.set(campaignKey, campaignSignature);

    const dayKey = `${campaignKey}|${spendDate}`;
    if (dayIdentity.has(dayKey)) {
      issue(issues, displayRow, "spend_date", "duplicate_campaign_day", "A campaign may appear only once per spend date in a batch.");
    } else dayIdentity.add(dayKey);

    rows.push({
      ...rowWithoutFingerprint,
      rowFingerprint: sha256(`${SPEND_INGRESS_VERSION}|${canonicalRowForHash(rowWithoutFingerprint)}`),
    });
  });

  const sortedRows = [...rows].sort((left, right) =>
    `${left.campaignKey}|${left.spendDate}`.localeCompare(`${right.campaignKey}|${right.spendDate}`),
  );
  const totals = sortedRows.reduce<SpendIngressTotals>((sum, row) => ({
    spendUsd: roundMoney(sum.spendUsd + row.spendUsd),
    impressions: sum.impressions + row.impressions,
    clicks: sum.clicks + row.clicks,
    platformLeads: sum.platformLeads + row.platformLeads,
    bookedAppointments: sum.bookedAppointments + row.bookedAppointments,
  }), { spendUsd: 0, impressions: 0, clicks: 0, platformLeads: 0, bookedAppointments: 0 });
  const dates = sortedRows.map((row) => row.spendDate).sort();
  const sourceSystems = [...new Set(sortedRows.map((row) => row.sourceSystem))].sort();
  const synthetic = sortedRows.some((row) => [
    row.channelKey,
    row.channelName,
    row.vendor,
    row.campaignKey,
    row.campaignName,
    row.externalCampaignId ?? "",
    row.utmSource,
    row.utmMedium,
    row.utmCampaign,
    row.sourceSystem,
  ].some((value) => SYNTHETIC_MARKER.test(value)));
  const ok = issues.length === 0 && sortedRows.length === dataRows.length;
  const batchFingerprint = ok
    ? sha256(`${SPEND_INGRESS_VERSION}|${JSON.stringify(sortedRows.map((row) => row.rowFingerprint))}`)
    : null;

  return {
    ok,
    version: SPEND_INGRESS_VERSION,
    batchFingerprint,
    rowCount: sortedRows.length,
    dateStart: dates[0] ?? null,
    dateEnd: dates.at(-1) ?? null,
    sourceSystems,
    synthetic,
    totals,
    rows: sortedRows,
    issues,
    rawCsvRetained: false,
  };
}

export function spendImportEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.GROWTH_SPEND_IMPORT_ENABLED === "true";
}

export function spendRowsForDatabase(rows: MarketingSpendImportRow[]) {
  return rows.map((row) => ({
    spend_date: row.spendDate,
    channel_key: row.channelKey,
    channel_name: row.channelName,
    vendor: row.vendor,
    channel_type: row.channelType,
    buying_model: row.buyingModel,
    campaign_key: row.campaignKey,
    campaign_name: row.campaignName,
    campaign_status: row.campaignStatus,
    external_campaign_id: row.externalCampaignId,
    utm_source: row.utmSource,
    utm_medium: row.utmMedium,
    utm_campaign: row.utmCampaign,
    spend_usd: row.spendUsd.toFixed(2),
    impressions: row.impressions,
    clicks: row.clicks,
    platform_leads: row.platformLeads,
    booked_appointments: row.bookedAppointments,
    source_system: row.sourceSystem,
    row_fingerprint: row.rowFingerprint,
  }));
}

export const SYNTHETIC_SPEND_CSV = `${SPEND_INGRESS_HEADERS.join(",")}\n2026-01-15,synthetic_search,Synthetic Search,sample_vendor,search,cpc,synthetic_seller_review,Synthetic Seller Review,paused,SYNTHETIC-001,synthetic_search,cpc,synthetic_seller_review,125.00,2500,85,4,1,synthetic_template`;
