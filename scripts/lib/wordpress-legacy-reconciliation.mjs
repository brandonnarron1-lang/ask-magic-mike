import { parseBoundedCsvMatrix } from "../../app/lib/growth/bounded-csv.ts";

export const LEGACY_CSV_MAX_BYTES = 1024 * 1024;
export const LEGACY_CSV_MAX_ROWS = 5000;

const HEADER_ALIASES = Object.freeze({
  wordpressRowId: ["id", "lead_id", "wordpress_lead_id", "record_id"],
  email: ["email", "lead_email", "email_address"],
  phone: ["phone", "lead_phone", "phone_number", "telephone"],
  address: ["address", "property_address", "address_raw", "street_address", "property"],
});

function normalizedHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeDatabaseEmail(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

export function normalizeDatabasePhone(value) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function normalizeDatabasePropertyIdentity(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return normalized || null;
}

function resolveHeaderIndexes(headerRow) {
  const normalized = headerRow.map(normalizedHeader);
  const indexes = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const matches = normalized
      .map((header, index) => (aliases.includes(header) ? index : -1))
      .filter((index) => index >= 0);
    if (matches.length > 1) throw new Error(`duplicate_${field}_header`);
    indexes[field] = matches[0] ?? -1;
  }
  if (indexes.wordpressRowId < 0) throw new Error("missing_wordpress_row_id_header");
  if (indexes.email < 0 && indexes.phone < 0) {
    throw new Error("missing_email_and_phone_headers");
  }
  return indexes;
}

function valueAt(row, index) {
  return index >= 0 ? String(row[index] ?? "").trim() : "";
}

/**
 * Parse only the identity fields needed for a dry-run. Names, messages, notes,
 * and other exported PII are deliberately ignored and never retained.
 */
export function parseLegacyWordpressCsv(input) {
  if (Buffer.byteLength(input, "utf8") > LEGACY_CSV_MAX_BYTES) {
    throw new Error("legacy_csv_too_large");
  }
  const parsed = parseBoundedCsvMatrix(input, { maxCellCharacters: 4096 });
  if (!parsed.ok) throw new Error(`legacy_csv_${parsed.code}`);
  if (parsed.rows.length < 2) throw new Error("legacy_csv_has_no_data_rows");
  if (parsed.rows.length - 1 > LEGACY_CSV_MAX_ROWS) throw new Error("legacy_csv_too_many_rows");

  const indexes = resolveHeaderIndexes(parsed.rows[0]);
  const seenIds = new Set();
  const rows = parsed.rows.slice(1).map((row, offset) => {
    const wordpressRowId = valueAt(row, indexes.wordpressRowId);
    if (!/^[1-9][0-9]{0,18}$/.test(wordpressRowId)) {
      throw new Error(`invalid_wordpress_row_id_at_row_${offset + 2}`);
    }
    if (seenIds.has(wordpressRowId)) throw new Error(`duplicate_wordpress_row_id_${wordpressRowId}`);
    seenIds.add(wordpressRowId);
    return {
      wordpressRowId,
      normalizedEmail: normalizeDatabaseEmail(valueAt(row, indexes.email)),
      normalizedPhone: normalizeDatabasePhone(valueAt(row, indexes.phone)),
      normalizedAddress: normalizeDatabasePropertyIdentity(valueAt(row, indexes.address)),
    };
  });

  return { rows };
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort();
}

function intersect(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function localDuplicateRows(rows) {
  const emailGroups = new Map();
  const phoneGroups = new Map();
  for (const row of rows) {
    if (row.normalizedEmail) {
      const ids = emailGroups.get(row.normalizedEmail) ?? [];
      ids.push(row.wordpressRowId);
      emailGroups.set(row.normalizedEmail, ids);
    }
    if (row.normalizedPhone) {
      const ids = phoneGroups.get(row.normalizedPhone) ?? [];
      ids.push(row.wordpressRowId);
      phoneGroups.set(row.normalizedPhone, ids);
    }
  }
  const byRow = new Map();
  for (const groups of [emailGroups, phoneGroups]) {
    for (const ids of groups.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) {
        const others = byRow.get(id) ?? new Set();
        for (const other of ids) if (other !== id) others.add(other);
        byRow.set(id, others);
      }
    }
  }
  return byRow;
}

function canonicalIdentity(row) {
  return {
    leadId: String(row.lead_id ?? row.leadId ?? ""),
    normalizedEmail: normalizeDatabaseEmail(row.normalized_email ?? row.normalizedEmail),
    normalizedPhone: normalizeDatabasePhone(row.normalized_phone ?? row.normalizedPhone),
    normalizedAddress: normalizeDatabasePropertyIdentity(row.normalized_address ?? row.normalizedAddress),
    isDuplicate: Boolean(row.is_duplicate ?? row.isDuplicate),
    duplicateOfLeadId: row.duplicate_of_lead_id ?? row.duplicateOfLeadId ?? null,
  };
}

function matchOne(local, canonicalRows, duplicateRows) {
  if (!local.normalizedEmail && !local.normalizedPhone) {
    return {
      wordpress_row_id: local.wordpressRowId,
      classification: "insufficient_identity",
      confidence: 0,
      match_reasons: [],
      matched_canonical_lead_id: null,
      candidate_canonical_lead_ids: [],
      canonical_duplicate_state: null,
      local_duplicate_row_ids: sortedUnique([...(duplicateRows.get(local.wordpressRowId) ?? [])]),
    };
  }

  const emailMatches = local.normalizedEmail
    ? canonicalRows.filter((row) => row.normalizedEmail === local.normalizedEmail).map((row) => row.leadId)
    : [];
  const phoneMatches = local.normalizedPhone
    ? canonicalRows.filter((row) => row.normalizedPhone === local.normalizedPhone).map((row) => row.leadId)
    : [];
  const emailIds = sortedUnique(emailMatches);
  const phoneIds = sortedUnique(phoneMatches);
  const allIds = sortedUnique([...emailIds, ...phoneIds]);
  const sharedIds = intersect(emailIds, phoneIds);

  if (emailIds.length > 0 && phoneIds.length > 0 && sharedIds.length === 0) {
    return {
      wordpress_row_id: local.wordpressRowId,
      classification: "split_identity_conflict",
      confidence: 0,
      match_reasons: ["email_and_phone_resolve_to_different_leads"],
      matched_canonical_lead_id: null,
      candidate_canonical_lead_ids: allIds,
      canonical_duplicate_state: null,
      local_duplicate_row_ids: sortedUnique([...(duplicateRows.get(local.wordpressRowId) ?? [])]),
    };
  }

  const candidateIds = sharedIds.length > 0 ? sortedUnique(sharedIds) : allIds;
  if (candidateIds.length === 0) {
    return {
      wordpress_row_id: local.wordpressRowId,
      classification: "unmatched_import_candidate",
      confidence: 0,
      match_reasons: [],
      matched_canonical_lead_id: null,
      candidate_canonical_lead_ids: [],
      canonical_duplicate_state: null,
      local_duplicate_row_ids: sortedUnique([...(duplicateRows.get(local.wordpressRowId) ?? [])]),
    };
  }
  if (candidateIds.length > 1) {
    return {
      wordpress_row_id: local.wordpressRowId,
      classification: "ambiguous_canonical_match",
      confidence: 0,
      match_reasons: [],
      matched_canonical_lead_id: null,
      candidate_canonical_lead_ids: candidateIds,
      canonical_duplicate_state: null,
      local_duplicate_row_ids: sortedUnique([...(duplicateRows.get(local.wordpressRowId) ?? [])]),
    };
  }

  const candidate = canonicalRows.find((row) => row.leadId === candidateIds[0]);
  const reasons = [];
  let confidence = 0;
  if (local.normalizedEmail && candidate?.normalizedEmail === local.normalizedEmail) {
    reasons.push("email_match");
    confidence += 60;
  }
  if (local.normalizedPhone && candidate?.normalizedPhone === local.normalizedPhone) {
    reasons.push("phone_match");
    confidence += 50;
  }
  if (local.normalizedAddress && candidate?.normalizedAddress === local.normalizedAddress) {
    reasons.push("address_corroboration");
    confidence += 35;
  }
  confidence = Math.min(confidence, 100);

  return {
    wordpress_row_id: local.wordpressRowId,
    classification: confidence >= 70 ? "matched_candidate" : "operator_review",
    confidence,
    match_reasons: reasons,
    matched_canonical_lead_id: candidateIds[0],
    candidate_canonical_lead_ids: candidateIds,
    canonical_duplicate_state: candidate?.isDuplicate
      ? { is_duplicate: true, duplicate_of_lead_id: candidate.duplicateOfLeadId ? String(candidate.duplicateOfLeadId) : null }
      : { is_duplicate: false, duplicate_of_lead_id: null },
    local_duplicate_row_ids: sortedUnique([...(duplicateRows.get(local.wordpressRowId) ?? [])]),
  };
}

export function buildLegacyWordpressReconciliation(localRows, canonicalInputRows) {
  const canonicalRows = canonicalInputRows.map(canonicalIdentity).filter((row) => row.leadId);
  const duplicateRows = localDuplicateRows(localRows);
  const results = localRows.map((row) => matchOne(row, canonicalRows, duplicateRows));
  const count = (classification) => results.filter((row) => row.classification === classification).length;
  const summary = {
    wordpress_rows: results.length,
    canonical_candidates_examined: canonicalRows.length,
    matched_candidates: count("matched_candidate"),
    operator_review: count("operator_review"),
    unmatched_import_candidates: count("unmatched_import_candidate"),
    split_identity_conflicts: count("split_identity_conflict"),
    ambiguous_canonical_matches: count("ambiguous_canonical_match"),
    insufficient_identity: count("insufficient_identity"),
    local_duplicate_rows: results.filter((row) => row.local_duplicate_row_ids.length > 0).length,
  };
  const alert = summary.operator_review > 0
    || summary.unmatched_import_candidates > 0
    || summary.split_identity_conflicts > 0
    || summary.ambiguous_canonical_matches > 0
    || summary.insufficient_identity > 0
    || summary.local_duplicate_rows > 0;

  return {
    mode: "dry_run_read_only",
    output_contains_contact_values: false,
    database_writes: 0,
    provider_calls: 0,
    alert,
    summary,
    rows: results,
  };
}
