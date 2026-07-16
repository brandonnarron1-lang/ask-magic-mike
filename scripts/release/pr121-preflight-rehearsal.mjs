#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const REMOTE_LINK = path.join(ROOT, "supabase/.temp/project-ref");
const PREFLIGHT_SQL_PATH = path.join(ROOT, "scripts/infra-03-contact-identity-preflight.sql");
const FIXTURE_SQL_PATH = path.join(ROOT, "scripts/release/pr121-preflight-fixtures.sql");
const MARKER = "pr121-preflight";

function fixtureUuid(group, index) {
  return `121${String(group).padStart(5, "0")}-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function sql(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sessionInsert(id, step = 5) {
  return `
    insert into public.sessions(id, utm_source, landing_page, status, step_reached)
    values ('${id}'::uuid, '${MARKER}', '/${MARKER}', 'completed', ${step});
  `;
}

function leadInsert({
  id,
  sessionId,
  contactId = null,
  email = null,
  phone = null,
  normalizedEmail = null,
  normalizedPhone = null,
  address = "1 PR121 Synthetic Fixture Street",
  sourceDetail,
  requestFingerprint = false,
}) {
  const leadJson = `jsonb_build_object(
    'normalized_email', ${sql(normalizedEmail ?? email?.trim().toLowerCase() ?? null)},
    'email', ${sql(email)},
    'normalized_phone', ${sql(normalizedPhone ?? normalizePhoneLiteral(phone))},
    'phone_normalized', ${sql(normalizedPhone ?? normalizePhoneLiteral(phone))},
    'phone', ${sql(phone)},
    'lead_type', 'home_value',
    'primary_intent', 'sell',
    'normalized_property_address', ${sql(address.toLowerCase())},
    'address_raw', ${sql(address)},
    'question_raw', ''
  )`;
  return `
    insert into public.leads(
      id, session_id, contact_id, email, phone, phone_normalized,
      normalized_email, normalized_phone, normalized_property_address,
      state, primary_intent, status, lead_type, source, source_detail,
      page_url, widget_session_id, address_raw, request_fingerprint
    ) values (
      '${id}'::uuid,
      '${sessionId}'::uuid,
      ${contactId ? `'${contactId}'::uuid` : "null"},
      ${sql(email)},
      ${sql(phone)},
      ${sql(normalizedPhone ?? normalizePhoneLiteral(phone))},
      ${sql(normalizedEmail ?? email?.trim().toLowerCase() ?? null)},
      ${sql(normalizedPhone ?? normalizePhoneLiteral(phone))},
      ${sql(address.toLowerCase())},
      'NC',
      'sell',
      'new',
      'home_value',
      '${MARKER}',
      ${sql(sourceDetail)},
      '/${MARKER}',
      '${sessionId}',
      ${sql(address)},
      ${requestFingerprint ? `public.amm_public_lead_request_fingerprint(${leadJson}, '{}'::jsonb)` : "null"}
    );
  `;
}

function normalizePhoneLiteral(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits || null;
}

export const SCENARIOS = [
  {
    name: "clean_baseline",
    expectedClassification: "clean",
    expectedPreflightTypes: [],
    fixtureSql: `
      insert into public.contacts(id, email, phone, phone_normalized)
      values
        ('${fixtureUuid(1, 1)}'::uuid, 'clean-one-${MARKER}@example.test', '+1 (252) 555-1001', '2525551001'),
        ('${fixtureUuid(1, 2)}'::uuid, 'clean-two-${MARKER}@example.test', '+1 (252) 555-1002', '2525551002');
      ${sessionInsert(fixtureUuid(1, 101))}
      ${leadInsert({
        id: fixtureUuid(1, 201),
        sessionId: fixtureUuid(1, 101),
        contactId: fixtureUuid(1, 1),
        email: `clean-one-${MARKER}@example.test`,
        phone: "2525551001",
        sourceDetail: "clean_baseline",
      })}
    `,
  },
  {
    name: "duplicate_normalized_email",
    expectedClassification: "contact_identity_blocker",
    expectedPreflightTypes: ["email"],
    fixtureSql: `
      insert into public.contacts(id, email, phone, phone_normalized)
      values
        ('${fixtureUuid(2, 1)}'::uuid, ' Duplicate.Email-${MARKER}@example.test ', '+1 (252) 555-1011', '2525551011'),
        ('${fixtureUuid(2, 2)}'::uuid, 'duplicate.email-${MARKER}@example.test', '+1 (252) 555-1012', '2525551012');
    `,
  },
  {
    name: "duplicate_normalized_phone",
    expectedClassification: "contact_identity_blocker",
    expectedPreflightTypes: ["phone"],
    fixtureSql: `
      insert into public.contacts(id, email, phone, phone_normalized)
      values
        ('${fixtureUuid(3, 1)}'::uuid, 'phone-one-${MARKER}@example.test', '+1 (252) 555-1101', '12525551101'),
        ('${fixtureUuid(3, 2)}'::uuid, 'phone-two-${MARKER}@example.test', '252.555.1101', null);
    `,
  },
  {
    name: "split_identity_collision",
    expectedClassification: "contact_identity_blocker",
    expectedPreflightTypes: ["lead_split_identity"],
    fixtureSql: `
      insert into public.contacts(id, email, phone, phone_normalized)
      values
        ('${fixtureUuid(4, 1)}'::uuid, 'split-email-${MARKER}@example.test', '+1 (252) 555-1200', '2525551200'),
        ('${fixtureUuid(4, 2)}'::uuid, 'split-phone-holder-${MARKER}@example.test', '+1 (252) 555-1201', '2525551201');
      ${sessionInsert(fixtureUuid(4, 101))}
      ${leadInsert({
        id: fixtureUuid(4, 201),
        sessionId: fixtureUuid(4, 101),
        email: `split-email-${MARKER}@example.test`,
        phone: "2525551201",
        sourceDetail: "split_identity_collision",
      })}
    `,
  },
  {
    name: "same_contact_repeated_identity",
    expectedClassification: "clean",
    expectedPreflightTypes: [],
    fixtureSql: `
      insert into public.contacts(id, email, phone, phone_normalized)
      values ('${fixtureUuid(5, 1)}'::uuid, 'same-contact-${MARKER}@example.test', '+1 (252) 555-1301', '2525551301');
      ${sessionInsert(fixtureUuid(5, 101))}
      ${sessionInsert(fixtureUuid(5, 102))}
      ${leadInsert({
        id: fixtureUuid(5, 201),
        sessionId: fixtureUuid(5, 101),
        contactId: fixtureUuid(5, 1),
        email: `same-contact-${MARKER}@example.test`,
        phone: "2525551301",
        sourceDetail: "same_contact_repeated_identity",
      })}
      ${leadInsert({
        id: fixtureUuid(5, 202),
        sessionId: fixtureUuid(5, 102),
        contactId: fixtureUuid(5, 1),
        email: `same-contact-${MARKER}@example.test`,
        phone: "+1 (252) 555-1301",
        sourceDetail: "same_contact_repeated_identity",
      })}
    `,
  },
  {
    name: "null_blank_absent_identities",
    expectedClassification: "clean",
    expectedPreflightTypes: [],
    fixtureSql: `
      insert into public.contacts(id, email, phone, phone_normalized)
      values
        ('${fixtureUuid(6, 1)}'::uuid, '   ', null, null),
        ('${fixtureUuid(6, 2)}'::uuid, null, null, '');
      ${sessionInsert(fixtureUuid(6, 101))}
      ${leadInsert({
        id: fixtureUuid(6, 201),
        sessionId: fixtureUuid(6, 101),
        email: null,
        phone: null,
        sourceDetail: "null_blank_absent_identities",
      })}
    `,
  },
  {
    name: "legacy_orphan_session",
    expectedClassification: "idempotency_risk",
    expectedPreflightTypes: [],
    fixtureSql: sessionInsert(fixtureUuid(7, 101), 1),
  },
  {
    name: "legacy_lead_contact_compatibility",
    expectedClassification: "operator_review",
    expectedPreflightTypes: [],
    fixtureSql: `
      ${sessionInsert(fixtureUuid(8, 101))}
      ${leadInsert({
        id: fixtureUuid(8, 201),
        sessionId: fixtureUuid(8, 101),
        email: `legacy-unlinked-${MARKER}@example.test`,
        phone: "2525551401",
        sourceDetail: "legacy_lead_contact_compatibility",
      })}
    `,
  },
  {
    name: "idempotent_replay_identity",
    expectedClassification: "clean",
    expectedPreflightTypes: [],
    fixtureSql: `
      insert into public.contacts(id, email, phone, phone_normalized)
      values ('${fixtureUuid(9, 1)}'::uuid, 'replay-${MARKER}@example.test', '+1 (252) 555-1501', '2525551501');
      ${sessionInsert(fixtureUuid(9, 101))}
      ${leadInsert({
        id: fixtureUuid(9, 201),
        sessionId: fixtureUuid(9, 101),
        contactId: fixtureUuid(9, 1),
        email: ` replay-${MARKER}@example.test `,
        phone: "+1 (252) 555-1501",
        sourceDetail: "idempotent_replay_identity",
        requestFingerprint: true,
      })}
    `,
  },
  {
    name: "materially_different_payload_same_session",
    expectedClassification: "idempotency_risk",
    expectedPreflightTypes: [],
    fixtureSql: `
      insert into public.contacts(id, email, phone, phone_normalized)
      values ('${fixtureUuid(10, 1)}'::uuid, 'idempotency-risk-${MARKER}@example.test', '+1 (252) 555-1601', '2525551601');
      ${sessionInsert(fixtureUuid(10, 101))}
      ${leadInsert({
        id: fixtureUuid(10, 201),
        sessionId: fixtureUuid(10, 101),
        contactId: fixtureUuid(10, 1),
        email: `idempotency-risk-${MARKER}@example.test`,
        phone: "2525551601",
        address: "1601 Original Payload Road",
        sourceDetail: "materially_different_payload_same_session",
        requestFingerprint: true,
      })}
    `,
  },
];

export function isLocalHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "::1" || host.endsWith(".localhost") || /^127\./.test(host);
}

export function assertLocalDatabaseTargets(env = process.env) {
  const keys = [
    "DATABASE_URL",
    "SUPABASE_DB_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "DIRECT_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
  ];
  for (const key of keys) {
    const value = env[key];
    if (!value) continue;
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`${key}_is_not_a_valid_url`);
    }
    if (!isLocalHost(parsed.hostname)) {
      throw new Error(`${key}_must_point_to_localhost_for_offline_rehearsal`);
    }
  }
  return true;
}

export function sanitizeSummary(value) {
  if (Array.isArray(value)) return value.map((entry) => sanitizeSummary(entry));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeSummary(entry)]),
    );
  }
  if (typeof value !== "string") return value;
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[redacted-database-url]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-jwt]");
}

export function hasUnsafeSummaryContent(value) {
  const text = JSON.stringify(value);
  return /postgres(?:ql)?:\/\/|Bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(text);
}

export function classifyFindings(preflightRows, supplemental) {
  if (preflightRows.length > 0) return "contact_identity_blocker";
  if (
    Number(supplemental.orphan_sessions) > 0 ||
    Number(supplemental.changed_session_idempotency_risks) > 0
  ) {
    return "idempotency_risk";
  }
  if (Number(supplemental.legacy_leads_without_contact) > 0) return "operator_review";
  return "clean";
}

export function evaluateScenario(scenario, actual) {
  const preflightRows = actual.preflightRows || [];
  const supplemental = actual.supplemental || {};
  const actualTypes = [...new Set(preflightRows.map((row) => String(row.identity_type)))].sort();
  const expectedTypes = [...scenario.expectedPreflightTypes].sort();
  const actualClassification = classifyFindings(preflightRows, supplemental);
  const passed =
    actualClassification === scenario.expectedClassification &&
    JSON.stringify(actualTypes) === JSON.stringify(expectedTypes);
  return {
    scenario: scenario.name,
    expectedClassification: scenario.expectedClassification,
    actualClassification,
    expectedPreflightTypes: expectedTypes,
    actualPreflightTypes: actualTypes,
    preflightBlockerCount: preflightRows.length,
    supplemental,
    passed,
  };
}

export async function executeScenario({ scenario, queryScenario, cleanup }) {
  try {
    const actual = await queryScenario(scenario);
    const evaluation = evaluateScenario(scenario, actual);
    if (!evaluation.passed) {
      const error = new Error(`preflight_fixture_mismatch:${scenario.name}`);
      error.evaluation = evaluation;
      throw error;
    }
    return evaluation;
  } finally {
    await cleanup(scenario);
  }
}

function readProjectId() {
  const config = readFileSync(path.join(ROOT, "supabase/config.toml"), "utf8");
  const match = config.match(/^\s*project_id\s*=\s*"([^"]+)"\s*$/m);
  if (!match?.[1]) throw new Error("local_project_id_missing");
  return match[1];
}

function dbContainerName() {
  return `supabase_db_${readProjectId()}`;
}

function psql(sqlText) {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      dbContainerName(),
      "psql",
      "-X",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-A",
      "-t",
      "-q",
    ],
    {
      cwd: ROOT,
      input: sqlText,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error(`local_postgres_command_failed:${result.stderr.trim().split("\n").at(-1) || result.status}`);
  }
  return result.stdout.trim();
}

function cleanupSql() {
  return `
    delete from public.leads
      where source = '${MARKER}' or id::text like '121%';
    delete from public.sessions
      where utm_source = '${MARKER}' or id::text like '121%';
    delete from public.contacts
      where id::text like '121%' or email like '%${MARKER}@example.test';
  `;
}

function preflightSelectSql() {
  const preflight = readFileSync(PREFLIGHT_SQL_PATH, "utf8").replace(/;\s*$/, "");
  return `
    with preflight_rows as (
      ${preflight}
    )
    select 'PREFLIGHT_JSON:' || coalesce(jsonb_agg(to_jsonb(preflight_rows) order by identity_type, normalized_value), '[]'::jsonb)::text
    from preflight_rows;
  `;
}

function supplementalSelectSql() {
  return `
    select 'SUPPLEMENTAL_JSON:' || jsonb_build_object(
      'orphan_sessions',
        (select count(*) from public.sessions s
          where s.utm_source = '${MARKER}'
            and not exists (select 1 from public.leads l where l.session_id = s.id)),
      'legacy_leads_without_contact',
        (select count(*) from public.leads
          where source = '${MARKER}'
            and contact_id is null
            and (nullif(lower(btrim(coalesce(normalized_email, email))), '') is not null
              or nullif(regexp_replace(coalesce(normalized_phone, phone_normalized, phone, ''), '[^0-9]', '', 'g'), '') is not null)),
      'matching_replay_fingerprints',
        (select count(*) from public.leads
          where source = '${MARKER}'
            and source_detail = 'idempotent_replay_identity'
            and request_fingerprint is not distinct from public.amm_public_lead_request_fingerprint(
              jsonb_build_object(
                'normalized_email', normalized_email,
                'email', email,
                'normalized_phone', normalized_phone,
                'phone_normalized', phone_normalized,
                'phone', phone,
                'lead_type', lead_type,
                'primary_intent', primary_intent,
                'normalized_property_address', normalized_property_address,
                'address_raw', address_raw,
                'question_raw', coalesce(question_raw, '')
              ),
              '{}'::jsonb
            )),
      'changed_session_idempotency_risks',
        (select count(*) from public.leads
          where source = '${MARKER}'
            and source_detail = 'materially_different_payload_same_session'
            and request_fingerprint is distinct from public.amm_public_lead_request_fingerprint(
              jsonb_build_object(
                'normalized_email', 'changed-${MARKER}@example.test',
                'email', 'changed-${MARKER}@example.test',
                'normalized_phone', normalized_phone,
                'phone_normalized', phone_normalized,
                'phone', phone,
                'lead_type', lead_type,
                'primary_intent', primary_intent,
                'normalized_property_address', '1601 changed payload road',
                'address_raw', '1601 Changed Payload Road',
                'question_raw', 'Changed synthetic payload'
              ),
              '{}'::jsonb
            ))
    )::text;
  `;
}

function parseJsonLine(output, prefix) {
  const line = output.split("\n").find((entry) => entry.startsWith(prefix));
  if (!line) throw new Error(`missing_${prefix.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`);
  return JSON.parse(line.slice(prefix.length));
}

function queryScenario(scenario) {
  psql(cleanupSql());
  const output = psql(`
    begin;
    ${scenario.fixtureSql}
    ${preflightSelectSql()}
    ${supplementalSelectSql()}
    rollback;
  `);
  return {
    preflightRows: parseJsonLine(output, "PREFLIGHT_JSON:"),
    supplemental: parseJsonLine(output, "SUPPLEMENTAL_JSON:"),
  };
}

function cleanupScenario() {
  psql(cleanupSql());
  const remaining = psql(`
    select jsonb_build_object(
      'contacts', (select count(*) from public.contacts where id::text like '121%' or email like '%${MARKER}@example.test'),
      'sessions', (select count(*) from public.sessions where id::text like '121%' or utm_source='${MARKER}'),
      'leads', (select count(*) from public.leads where id::text like '121%' or source='${MARKER}')
    )::text;
  `);
  return JSON.parse(remaining.split("\n").find((line) => line.trim().startsWith("{")));
}

function parseArgs(argv) {
  const options = {
    evidenceDir: null,
    expectMismatchScenario: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--evidence-dir") {
      options.evidenceDir = argv[index + 1];
      index += 1;
    } else if (arg === "--expect-mismatch-scenario") {
      options.expectMismatchScenario = argv[index + 1];
      index += 1;
    }
  }
  return options;
}

export async function runPreflightRehearsal(options = {}) {
  if (existsSync(REMOTE_LINK)) throw new Error("remote_supabase_project_ref_present");
  assertLocalDatabaseTargets(process.env);
  if (!existsSync(FIXTURE_SQL_PATH)) throw new Error("preflight_fixture_sql_missing");

  const startedAt = Date.now();
  const evaluations = [];
  for (const originalScenario of SCENARIOS) {
    const scenario = options.expectMismatchScenario === originalScenario.name
      ? { ...originalScenario, expectedPreflightTypes: ["forced_mismatch_for_test"] }
      : originalScenario;
    const evaluation = await executeScenario({
      scenario,
      queryScenario,
      cleanup: cleanupScenario,
    });
    evaluations.push(evaluation);
  }

  const cleanupCounts = cleanupScenario();
  const summary = sanitizeSummary({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    target: "local-supabase-postgresql",
    remoteProjectLinked: false,
    fixtureSql: "scripts/release/pr121-preflight-fixtures.sql",
    checkedPreflightSql: "scripts/infra-03-contact-identity-preflight.sql",
    scenarioCount: evaluations.length,
    passed: evaluations.every((entry) => entry.passed),
    scenarios: evaluations,
    cleanupCounts,
    durationMs: Date.now() - startedAt,
    providerCalls: 0,
    emailsSent: 0,
    smsSent: 0,
    productionChanges: 0,
    remoteDatabaseChanges: 0,
  });
  if (hasUnsafeSummaryContent(summary)) throw new Error("unsafe_preflight_summary_content");

  if (options.evidenceDir) {
    mkdirSync(options.evidenceDir, { recursive: true });
    writeFileSync(
      path.join(options.evidenceDir, "preflight-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
  }
  return summary;
}

if (process.argv[1] === __filename) {
  try {
    const summary = await runPreflightRehearsal(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(`PR121 preflight rehearsal failed: ${error instanceof Error ? error.message : "unknown"}`);
    process.exitCode = 1;
  }
}
