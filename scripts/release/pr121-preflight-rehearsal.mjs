#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const REMOTE_LINK = path.join(ROOT, "supabase/.temp/project-ref");
const PREFLIGHT_SQL_PATH = path.join(ROOT, "scripts/infra-03-contact-identity-preflight.sql");
const FIXTURE_SQL_PATH = path.join(ROOT, "scripts/release/pr121-preflight-fixtures.sql");

export const ACCEPTED_PR121_SHA = "a6fc33c22ba9951487e2cafc97e2f511eeb6c23e";
export const TARGET_MIGRATION_VERSION = "20260716043829";
export const TARGET_MIGRATION_FILE = "20260716043829_infra_02_atomic_lifecycle.sql";
export const PREDECESSOR_MIGRATION_VERSION = "20260712224440";
export const PREDECESSOR_MIGRATION_FILE = "20260712224440_public_appointment_request_idempotency.sql";

export const DATABASE_URL_ALIASES = [
  "DATABASE_URL",
  "SUPABASE_DB_URL",
  "SUPABASE_DATABASE_URL",
  "SUPABASE_POSTGRES_URL",
  "SUPABASE_POOLER_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_POOLER_URL",
  "DATABASE_DIRECT_URL",
  "DATABASE_URL_UNPOOLED",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
];

export const DATABASE_HOST_ALIASES = ["PGHOST"];

export const PROJECT_REF_ALIASES = [
  "SUPABASE_PROJECT_REF",
  "PRODUCTION_SUPABASE_PROJECT_REF",
  "PREVIEW_SUPABASE_PROJECT_REF",
];

const SENSITIVE_ENV_ALIASES = [
  "SUPABASE_ACCESS_TOKEN",
  ...PROJECT_REF_ALIASES,
];

function fixtureUuid(group, index) {
  return `121${String(group).padStart(5, "0")}-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function sql(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function uuidSql(value) {
  return value ? `'${value}'::uuid` : "null";
}

function uuidArray(values = []) {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length === 0) return "array[]::uuid[]";
  return `array[${unique.map((value) => `'${value}'::uuid`).join(", ")}]`;
}

function contact(scenario, id, email, phone, phoneNormalized) {
  return `select pg_temp.pr121_insert_contact(${sql(scenario)}, ${uuidSql(id)}, ${sql(email)}, ${sql(phone)}, ${sql(phoneNormalized)});`;
}

function session(scenario, id, status = "completed", step = 5) {
  return `select pg_temp.pr121_insert_session(${sql(scenario)}, ${uuidSql(id)}, ${sql(status)}, ${Number(step)}::smallint);`;
}

function lead(
  scenario,
  id,
  sessionId,
  {
    contactId = null,
    email = null,
    phone = null,
    phoneNormalized = null,
    normalizedEmail = null,
    normalizedPhone = null,
    address = "1 PR121 Synthetic Fixture Street",
  } = {},
) {
  return `select pg_temp.pr121_insert_lead(${sql(scenario)}, ${uuidSql(id)}, ${uuidSql(sessionId)}, ${uuidSql(contactId)}, ${sql(email)}, ${sql(phone)}, ${sql(phoneNormalized)}, ${sql(normalizedEmail)}, ${sql(normalizedPhone)}, ${sql(address)});`;
}

function ids(group, { contacts = [], sessions = [], leads = [] }) {
  return {
    contacts: contacts.map((index) => fixtureUuid(group, index)),
    sessions: sessions.map((index) => fixtureUuid(group, index)),
    leads: leads.map((index) => fixtureUuid(group, index)),
  };
}

function scenario(name, group, expectedClassification, expectedPreflightTypes, build, extra = {}) {
  const fixtureIds = ids(group, extra.ids ?? {});
  return {
    name,
    group,
    expectedClassification,
    expectedPreflightTypes,
    expectedBlockerCount: extra.expectedBlockerCount ?? expectedPreflightTypes.length,
    expectedSplitContactCount: extra.expectedSplitContactCount,
    expectedSplitContactIds: extra.expectedSplitContactIds,
    fixtureIds,
    fixtureSql: build(fixtureIds),
  };
}

export const PREMIGRATION_SCENARIOS = [
  scenario("clean_baseline", 1, "clean", [], ({ contacts, sessions, leads }) => [
    contact("clean_baseline", contacts[0], "clean-one-pr121@example.test", "+1 (252) 555-1001", "2525551001"),
    contact("clean_baseline", contacts[1], "clean-two-pr121@example.test", "+1 (252) 555-1002", "2525551002"),
    session("clean_baseline", sessions[0]),
    lead("clean_baseline", leads[0], sessions[0], {
      contactId: contacts[0],
      email: "clean-one-pr121@example.test",
      phone: "2525551001",
      normalizedEmail: "clean-one-pr121@example.test",
      normalizedPhone: "2525551001",
    }),
  ], { ids: { contacts: [1, 2], sessions: [101], leads: [201] }, expectedBlockerCount: 0 }),
  scenario("duplicate_normalized_email", 2, "contact_identity_blocker", ["email"], ({ contacts }) => [
    contact("duplicate_normalized_email", contacts[0], " Duplicate.Email-pr121@example.test ", "+1 (252) 555-1011", "2525551011"),
    contact("duplicate_normalized_email", contacts[1], "duplicate.email-pr121@example.test", "+1 (252) 555-1012", "2525551012"),
  ], { ids: { contacts: [1, 2] }, expectedBlockerCount: 1 }),
  scenario("duplicate_normalized_phone", 3, "contact_identity_blocker", ["phone"], ({ contacts }) => [
    contact("duplicate_normalized_phone", contacts[0], "phone-one-pr121@example.test", "+1 (252) 555-1101", "12525551101"),
    contact("duplicate_normalized_phone", contacts[1], "phone-two-pr121@example.test", "252.555.1101", null),
  ], { ids: { contacts: [1, 2] }, expectedBlockerCount: 1 }),
  scenario("split_identity_collision", 4, "contact_identity_blocker", ["lead_split_identity"], ({ contacts, sessions, leads }) => [
    contact("split_identity_collision", contacts[0], "split-email-pr121@example.test", "+1 (252) 555-1200", "2525551200"),
    contact("split_identity_collision", contacts[1], "split-phone-holder-pr121@example.test", "+1 (252) 555-1201", "2525551201"),
    session("split_identity_collision", sessions[0]),
    lead("split_identity_collision", leads[0], sessions[0], {
      email: "split-email-pr121@example.test",
      phone: "2525551201",
      normalizedEmail: "split-email-pr121@example.test",
      normalizedPhone: "2525551201",
    }),
  ], {
    ids: { contacts: [1, 2], sessions: [101], leads: [201] },
    expectedBlockerCount: 1,
    expectedSplitContactCount: 2,
    expectedSplitContactIds: [fixtureUuid(4, 1), fixtureUuid(4, 2)],
  }),
  scenario("same_contact_repeated_identity", 5, "clean", [], ({ contacts, sessions, leads }) => [
    contact("same_contact_repeated_identity", contacts[0], "same-contact-pr121@example.test", "+1 (252) 555-1301", "2525551301"),
    session("same_contact_repeated_identity", sessions[0]),
    session("same_contact_repeated_identity", sessions[1]),
    lead("same_contact_repeated_identity", leads[0], sessions[0], {
      contactId: contacts[0],
      email: "same-contact-pr121@example.test",
      phone: "2525551301",
      normalizedEmail: "same-contact-pr121@example.test",
      normalizedPhone: "2525551301",
    }),
    lead("same_contact_repeated_identity", leads[1], sessions[1], {
      contactId: contacts[0],
      email: " same-contact-pr121@example.test ",
      phone: "+1 (252) 555-1301",
      normalizedEmail: "same-contact-pr121@example.test",
      normalizedPhone: "2525551301",
    }),
  ], { ids: { contacts: [1], sessions: [101, 102], leads: [201, 202] }, expectedBlockerCount: 0 }),
  scenario("null_blank_absent_identities", 6, "clean", [], ({ contacts, sessions, leads }) => [
    contact("null_blank_absent_identities", contacts[0], "   ", null, null),
    contact("null_blank_absent_identities", contacts[1], null, null, "   "),
    session("null_blank_absent_identities", sessions[0]),
    lead("null_blank_absent_identities", leads[0], sessions[0], {
      email: null,
      phone: null,
      normalizedEmail: "   ",
      normalizedPhone: "   ",
    }),
  ], { ids: { contacts: [1, 2], sessions: [101], leads: [201] }, expectedBlockerCount: 0 }),
  scenario("blank_normalized_email_fallback", 7, "contact_identity_blocker", ["lead_split_identity"], ({ contacts, sessions, leads }) => [
    contact("blank_normalized_email_fallback", contacts[0], "blank-email-pr121@example.test", "+1 (252) 555-1700", "2525551700"),
    contact("blank_normalized_email_fallback", contacts[1], "blank-email-phone-pr121@example.test", "+1 (252) 555-1701", "2525551701"),
    session("blank_normalized_email_fallback", sessions[0]),
    lead("blank_normalized_email_fallback", leads[0], sessions[0], {
      email: " blank-email-pr121@example.test ",
      phone: "2525551701",
      normalizedEmail: "   ",
      normalizedPhone: "2525551701",
    }),
  ], {
    ids: { contacts: [1, 2], sessions: [101], leads: [201] },
    expectedBlockerCount: 1,
    expectedSplitContactCount: 2,
    expectedSplitContactIds: [fixtureUuid(7, 1), fixtureUuid(7, 2)],
  }),
  scenario("blank_normalized_phone_fallback", 8, "contact_identity_blocker", ["lead_split_identity"], ({ contacts, sessions, leads }) => [
    contact("blank_normalized_phone_fallback", contacts[0], "blank-phone-email-pr121@example.test", "+1 (252) 555-1800", "2525551800"),
    contact("blank_normalized_phone_fallback", contacts[1], "blank-phone-pr121@example.test", "+1 (252) 555-1801", "2525551801"),
    session("blank_normalized_phone_fallback", sessions[0]),
    lead("blank_normalized_phone_fallback", leads[0], sessions[0], {
      email: "blank-phone-email-pr121@example.test",
      phone: "+1 (252) 555-1801",
      normalizedEmail: "blank-phone-email-pr121@example.test",
      normalizedPhone: "   ",
      phoneNormalized: "   ",
    }),
  ], {
    ids: { contacts: [1, 2], sessions: [101], leads: [201] },
    expectedBlockerCount: 1,
    expectedSplitContactCount: 2,
    expectedSplitContactIds: [fixtureUuid(8, 1), fixtureUuid(8, 2)],
  }),
  scenario("multiple_identity_matches", 9, "contact_identity_blocker", ["email", "lead_split_identity", "phone"], ({ contacts, sessions, leads }) => [
    contact("multiple_identity_matches", contacts[0], "multi-email-pr121@example.test", "+1 (252) 555-1901", "2525551901"),
    contact("multiple_identity_matches", contacts[1], " multi-email-pr121@example.test ", "+1 (252) 555-1902", "2525551902"),
    contact("multiple_identity_matches", contacts[2], "multi-phone-a-pr121@example.test", "+1 (252) 555-1903", "12525551999"),
    contact("multiple_identity_matches", contacts[3], "multi-phone-b-pr121@example.test", "252.555.1999", null),
    session("multiple_identity_matches", sessions[0]),
    lead("multiple_identity_matches", leads[0], sessions[0], {
      email: "multi-email-pr121@example.test",
      phone: "2525551999",
      normalizedEmail: "multi-email-pr121@example.test",
      normalizedPhone: "2525551999",
    }),
  ], {
    ids: { contacts: [1, 2, 3, 4], sessions: [101], leads: [201] },
    expectedBlockerCount: 3,
    expectedSplitContactCount: 4,
    expectedSplitContactIds: [fixtureUuid(9, 1), fixtureUuid(9, 2), fixtureUuid(9, 3), fixtureUuid(9, 4)],
  }),
  scenario("shared_contact_intersection", 10, "contact_identity_blocker", ["email", "phone"], ({ contacts, sessions, leads }) => [
    contact("shared_contact_intersection", contacts[0], "shared-pr121@example.test", "+1 (252) 555-2000", "2525552000"),
    contact("shared_contact_intersection", contacts[1], " shared-pr121@example.test ", "+1 (252) 555-2001", "2525552001"),
    contact("shared_contact_intersection", contacts[2], "shared-phone-pr121@example.test", "+1 (252) 555-2000", null),
    session("shared_contact_intersection", sessions[0]),
    lead("shared_contact_intersection", leads[0], sessions[0], {
      email: "shared-pr121@example.test",
      phone: "2525552000",
      normalizedEmail: "shared-pr121@example.test",
      normalizedPhone: "2525552000",
    }),
  ], { ids: { contacts: [1, 2, 3], sessions: [101], leads: [201] }, expectedBlockerCount: 2 }),
  scenario("same_contact_email_phone", 11, "clean", [], ({ contacts, sessions, leads }) => [
    contact("same_contact_email_phone", contacts[0], "same-both-pr121@example.test", "+1 (252) 555-2100", "2525552100"),
    session("same_contact_email_phone", sessions[0]),
    lead("same_contact_email_phone", leads[0], sessions[0], {
      contactId: contacts[0],
      email: "same-both-pr121@example.test",
      phone: "2525552100",
      normalizedEmail: "same-both-pr121@example.test",
      normalizedPhone: "2525552100",
    }),
  ], { ids: { contacts: [1], sessions: [101], leads: [201] }, expectedBlockerCount: 0 }),
];

export const COMPATIBILITY_SCENARIOS = {
  legacy_orphan_session: scenario("legacy_orphan_session", 12, "idempotency_risk", [], ({ sessions }) => [
    session("legacy_orphan_session", sessions[0], "active", 1),
  ], { ids: { sessions: [101] }, expectedBlockerCount: 0 }),
  legacy_lead_contact_compatibility: scenario("legacy_lead_contact_compatibility", 13, "operator_review", [], ({ sessions, leads }) => [
    session("legacy_lead_contact_compatibility", sessions[0]),
    lead("legacy_lead_contact_compatibility", leads[0], sessions[0], {
      email: "legacy-unlinked-pr121@example.test",
      phone: "2525552201",
      normalizedEmail: "legacy-unlinked-pr121@example.test",
      normalizedPhone: "2525552201",
      address: "2201 Legacy Compatibility Road",
    }),
  ], { ids: { sessions: [101], leads: [201] }, expectedBlockerCount: 0 }),
};

export const RUNTIME_SCENARIOS = {
  idempotent_replay_identity: {
    name: "idempotent_replay_identity",
    fixtureIds: ids(14, { sessions: [101] }),
  },
  materially_different_payload_same_session: {
    name: "materially_different_payload_same_session",
    fixtureIds: ids(15, { sessions: [101] }),
  },
};

export const SCENARIOS = PREMIGRATION_SCENARIOS;

function fixtureSqlSource() {
  return readFileSync(FIXTURE_SQL_PATH, "utf8");
}

function allFixtureIds() {
  const entries = [
    ...PREMIGRATION_SCENARIOS,
    ...Object.values(COMPATIBILITY_SCENARIOS),
    ...Object.values(RUNTIME_SCENARIOS),
  ];
  return mergeFixtureIds(entries.map((entry) => entry.fixtureIds));
}

function mergeFixtureIds(groups) {
  return {
    contacts: [...new Set(groups.flatMap((group) => group.contacts ?? []))],
    sessions: [...new Set(groups.flatMap((group) => group.sessions ?? []))],
    leads: [...new Set(groups.flatMap((group) => group.leads ?? []))],
  };
}

export function isLocalHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^\[(.*)\]$/, "$1");
  return host === "localhost" || host === "::1" || host.endsWith(".localhost") || /^127\./.test(host);
}

export function assertLocalDatabaseTargets(env = process.env) {
  for (const key of DATABASE_URL_ALIASES) {
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

  for (const key of DATABASE_HOST_ALIASES) {
    const value = env[key];
    if (!value) continue;
    if (!isLocalHost(value)) {
      throw new Error(`${key}_must_point_to_localhost_for_offline_rehearsal`);
    }
  }

  for (const key of PROJECT_REF_ALIASES) {
    if (env[key]) throw new Error(`${key}_must_be_unset_for_official_offline_rehearsal`);
  }

  return true;
}

export function sanitizedChildEnv(env = process.env) {
  const next = { ...env };
  for (const key of SENSITIVE_ENV_ALIASES) delete next[key];
  return next;
}

export function assertLocalSupabaseCommand(command, args) {
  if (command === "supabase") {
    if (args.includes("--linked")) throw new Error("supabase_command_must_not_use_linked");
    if (args.includes("--db-url")) throw new Error("supabase_command_must_not_use_db_url");
    const subcommand = args.slice(0, 2).join(" ");
    if ((subcommand === "db reset" || subcommand === "migration up") && !args.includes("--local")) {
      throw new Error("supabase_database_command_must_use_local_flag");
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

export function evaluateScenario(scenarioDefinition, actual) {
  const preflightRows = actual.preflightRows || [];
  const supplemental = actual.supplemental || {};
  const actualTypes = [...new Set(preflightRows.map((row) => String(row.identity_type)))].sort();
  const expectedTypes = [...scenarioDefinition.expectedPreflightTypes].sort();
  const splitRows = preflightRows.filter((row) => row.identity_type === "lead_split_identity");
  const splitRow = splitRows[0] ?? null;
  const splitContactIds = Array.isArray(splitRow?.contact_ids)
    ? splitRow.contact_ids.map(String).sort()
    : [];
  const actualClassification = classifyFindings(preflightRows, supplemental);
  const splitContactCountOk =
    scenarioDefinition.expectedSplitContactCount === undefined ||
    Number(splitRow?.contact_count) === scenarioDefinition.expectedSplitContactCount;
  const splitContactIdsOk =
    scenarioDefinition.expectedSplitContactIds === undefined ||
    JSON.stringify(splitContactIds) === JSON.stringify([...scenarioDefinition.expectedSplitContactIds].sort());
  const passed =
    actualClassification === scenarioDefinition.expectedClassification &&
    JSON.stringify(actualTypes) === JSON.stringify(expectedTypes) &&
    preflightRows.length === scenarioDefinition.expectedBlockerCount &&
    splitRows.length <= 1 &&
    splitContactCountOk &&
    splitContactIdsOk;
  return {
    scenario: scenarioDefinition.name,
    proofType: "pre_migration_preflight",
    expectedClassification: scenarioDefinition.expectedClassification,
    actualClassification,
    expectedPreflightTypes: expectedTypes,
    actualPreflightTypes: actualTypes,
    preflightBlockerCount: preflightRows.length,
    supplemental,
    splitContactCount: splitRow?.contact_count ?? null,
    splitContactIds,
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
    await cleanup(scenario.fixtureIds);
  }
}

function readProjectId() {
  const config = readFileSync(path.join(ROOT, "supabase/config.toml"), "utf8");
  const match = config.match(/^\s*project_id\s*=\s*"([^"]+)"\s*$/m);
  if (!match?.[1]) throw new Error("local_project_id_missing");
  return match[1];
}

export function exactProjectContainerNames(stdout, projectId) {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((name) => name.startsWith("supabase_") && name.endsWith(`_${projectId}`));
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
      maxBuffer: 20 * 1024 * 1024,
      env: sanitizedChildEnv(),
    },
  );
  if (result.status !== 0) throw new Error("local_postgres_command_failed");
  return result.stdout.trim();
}

export function cleanupSqlForFixture(fixtureIds) {
  const leadIds = uuidArray(fixtureIds.leads);
  const sessionIds = uuidArray(fixtureIds.sessions);
  const contactIds = uuidArray(fixtureIds.contacts);
  return `
    do $cleanup$
    declare
      v_registered_leads uuid[] := ${leadIds};
      v_registered_sessions uuid[] := ${sessionIds};
      v_registered_contacts uuid[] := ${contactIds};
      v_lead_ids uuid[];
    begin
      select coalesce(array_agg(distinct id), array[]::uuid[])
        into v_lead_ids
        from public.leads
       where id = any(v_registered_leads)
          or session_id = any(v_registered_sessions);

      if to_regclass('public.lead_notifications') is not null then
        delete from public.lead_notifications where lead_id = any(v_lead_ids);
      end if;
      if to_regclass('public.lead_routing') is not null then
        delete from public.lead_routing where lead_id = any(v_lead_ids);
      end if;
      if to_regclass('public.agent_assignments') is not null then
        delete from public.agent_assignments where lead_id = any(v_lead_ids);
      end if;
      if to_regclass('public.source_attribution') is not null then
        delete from public.source_attribution
         where lead_id = any(v_lead_ids)
            or session_id = any(v_registered_sessions);
      end if;
      if to_regclass('public.audit_logs') is not null then
        delete from public.audit_logs
         where resource_id = any(v_lead_ids)
            or metadata->>'session_id' in (select unnest(v_registered_sessions)::text);
      end if;
      if to_regclass('public.contact_identities') is not null then
        delete from public.contact_identities where contact_id = any(v_registered_contacts);
      end if;

      delete from public.leads
       where id = any(v_registered_leads)
          or session_id = any(v_registered_sessions);
      delete from public.sessions where id = any(v_registered_sessions);
      delete from public.contacts where id = any(v_registered_contacts);
    end
    $cleanup$;
  `;
}

function cleanupCountsSql(fixtureIds) {
  return `
    select jsonb_build_object(
      'contacts', (select count(*) from public.contacts where id = any(${uuidArray(fixtureIds.contacts)})),
      'sessions', (select count(*) from public.sessions where id = any(${uuidArray(fixtureIds.sessions)})),
      'leads', (select count(*) from public.leads where id = any(${uuidArray(fixtureIds.leads)}) or session_id = any(${uuidArray(fixtureIds.sessions)}))
    )::text;
  `;
}

function cleanupFixtureIds(fixtureIds) {
  psql(cleanupSqlForFixture(fixtureIds));
  return JSON.parse(psql(cleanupCountsSql(fixtureIds)).split("\n").find((line) => line.trim().startsWith("{")));
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

function normalizeLeadIdentitySql() {
  return `
    (
      coalesce(nullif(lower(btrim(normalized_email)), ''), nullif(lower(btrim(email)), '')) is not null
      or coalesce(
        nullif(regexp_replace(coalesce(normalized_phone, ''), '[^0-9]', '', 'g'), ''),
        nullif(regexp_replace(coalesce(phone_normalized, ''), '[^0-9]', '', 'g'), ''),
        nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '')
      ) is not null
    )
  `;
}

function supplementalSelectSql(fixtureIds) {
  return `
    select 'SUPPLEMENTAL_JSON:' || jsonb_build_object(
      'orphan_sessions',
        (select count(*) from public.sessions s
          where s.id = any(${uuidArray(fixtureIds.sessions)})
            and not exists (select 1 from public.leads l where l.session_id = s.id)),
      'legacy_leads_without_contact',
        (select count(*) from public.leads
          where (id = any(${uuidArray(fixtureIds.leads)}) or session_id = any(${uuidArray(fixtureIds.sessions)}))
            and contact_id is null
            and ${normalizeLeadIdentitySql()}),
      'matching_replay_fingerprints', 0,
      'changed_session_idempotency_risks', 0
    )::text;
  `;
}

function parseJsonLine(output, prefix) {
  const line = output.split("\n").find((entry) => entry.startsWith(prefix));
  if (!line) throw new Error(`missing_${prefix.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`);
  return JSON.parse(line.slice(prefix.length));
}

function queryScenario(scenarioDefinition) {
  cleanupFixtureIds(scenarioDefinition.fixtureIds);
  const output = psql(`
    begin;
    ${fixtureSqlSource()}
    ${scenarioDefinition.fixtureSql.join("\n")}
    ${preflightSelectSql()}
    ${supplementalSelectSql(scenarioDefinition.fixtureIds)}
    rollback;
  `);
  return {
    preflightRows: parseJsonLine(output, "PREFLIGHT_JSON:"),
    supplemental: parseJsonLine(output, "SUPPLEMENTAL_JSON:"),
  };
}

function queryExistingScenario(scenarioDefinition) {
  const output = psql(`
    ${preflightSelectSql()}
    ${supplementalSelectSql(scenarioDefinition.fixtureIds)}
  `);
  return {
    preflightRows: parseJsonLine(output, "PREFLIGHT_JSON:"),
    supplemental: parseJsonLine(output, "SUPPLEMENTAL_JSON:"),
  };
}

export function migrationStatusSql() {
  return `
    select jsonb_build_object(
      'predecessorPresent', exists(select 1 from supabase_migrations.schema_migrations where version = '${PREDECESSOR_MIGRATION_VERSION}'),
      'targetPresent', exists(select 1 from supabase_migrations.schema_migrations where version = '${TARGET_MIGRATION_VERSION}'),
      'targetCount', (select count(*) from supabase_migrations.schema_migrations where version = '${TARGET_MIGRATION_VERSION}')
    )::text;
  `;
}

export function targetObjectStatusSql() {
  return `
    select jsonb_build_object(
      'contactIdentitiesTable', to_regclass('public.contact_identities') is not null,
      'requestFingerprintColumn', exists(
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'leads' and column_name = 'request_fingerprint'
      ),
      'fingerprintFunction', to_regprocedure('public.amm_public_lead_request_fingerprint(jsonb,jsonb)') is not null,
      'captureFunction', to_regprocedure('public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)') is not null
    )::text;
  `;
}

export function readMigrationStatus() {
  return JSON.parse(psql(migrationStatusSql()).split("\n").find((line) => line.trim().startsWith("{")));
}

export function readTargetObjectStatus() {
  return JSON.parse(psql(targetObjectStatusSql()).split("\n").find((line) => line.trim().startsWith("{")));
}

export function assertPredecessorState() {
  const migrationStatus = readMigrationStatus();
  const objectStatus = readTargetObjectStatus();
  const targetObjectsAbsent = Object.values(objectStatus).every((value) => value === false);
  if (!migrationStatus.predecessorPresent || migrationStatus.targetPresent || !targetObjectsAbsent) {
    const error = new Error("predecessor_state_not_verified");
    error.migrationStatus = migrationStatus;
    error.objectStatus = objectStatus;
    throw error;
  }
  return { migrationStatus, objectStatus };
}

export function assertTargetState() {
  const migrationStatus = readMigrationStatus();
  const objectStatus = readTargetObjectStatus();
  const targetObjectsPresent = Object.values(objectStatus).every((value) => value === true);
  if (!migrationStatus.predecessorPresent || migrationStatus.targetCount !== 1 || !targetObjectsPresent) {
    const error = new Error("target_state_not_verified");
    error.migrationStatus = migrationStatus;
    error.objectStatus = objectStatus;
    throw error;
  }
  return { migrationStatus, objectStatus };
}

export async function runPreflightRehearsal(options = {}) {
  if (existsSync(REMOTE_LINK)) throw new Error("remote_supabase_project_ref_present");
  assertLocalDatabaseTargets(process.env);
  if (!existsSync(FIXTURE_SQL_PATH)) throw new Error("preflight_fixture_sql_missing");

  const startedAt = Date.now();
  const evaluations = [];
  for (const originalScenario of PREMIGRATION_SCENARIOS) {
    const scenarioDefinition = options.expectMismatchScenario === originalScenario.name
      ? { ...originalScenario, expectedPreflightTypes: ["forced_mismatch_for_test"] }
      : originalScenario;
    const evaluation = await executeScenario({
      scenario: scenarioDefinition,
      queryScenario,
      cleanup: cleanupFixtureIds,
    });
    evaluations.push(evaluation);
  }

  const cleanupCounts = cleanupFixtureIds(mergeFixtureIds(PREMIGRATION_SCENARIOS.map((entry) => entry.fixtureIds)));
  const summary = sanitizeSummary({
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    target: "local-supabase-postgresql-pre-migration",
    proofType: "pre_migration_preflight",
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

export function prepareCompatibilityFixtures() {
  const scenarios = Object.values(COMPATIBILITY_SCENARIOS);
  const fixtureIds = mergeFixtureIds(scenarios.map((entry) => entry.fixtureIds));
  cleanupFixtureIds(fixtureIds);
  psql(`
    begin;
    ${fixtureSqlSource()}
    ${scenarios.flatMap((entry) => entry.fixtureSql).join("\n")}
    commit;
  `);
  const evaluations = scenarios.map((entry) => evaluateScenario(entry, queryExistingScenario(entry)));
  if (evaluations.some((entry) => !entry.passed)) {
    const error = new Error("compatibility_preflight_fixture_mismatch");
    error.evaluations = evaluations;
    throw error;
  }
  return { fixtureIds, evaluations };
}

function leadLifecycleCountsSql(sessionId) {
  return `
    jsonb_build_object(
      'leads', (select count(*) from public.leads where session_id = '${sessionId}'::uuid),
      'sourceAttribution', (
        select count(*) from public.source_attribution
         where session_id = '${sessionId}'::uuid
            or lead_id in (select id from public.leads where session_id = '${sessionId}'::uuid)
      ),
      'agentAssignments', (
        select count(*) from public.agent_assignments
         where lead_id in (select id from public.leads where session_id = '${sessionId}'::uuid)
      ),
      'auditLogs', (
        select count(*) from public.audit_logs
         where resource_id in (select id from public.leads where session_id = '${sessionId}'::uuid)
            or metadata->>'session_id' = '${sessionId}'
      ),
      'leadRouting', (
        select count(*) from public.lead_routing
         where lead_id in (select id from public.leads where session_id = '${sessionId}'::uuid)
      ),
      'leadNotifications', (
        select count(*) from public.lead_notifications
         where lead_id in (select id from public.leads where session_id = '${sessionId}'::uuid)
      )
    )::text
  `;
}

function captureSql(sessionId, suffix, overrides = {}) {
  const email = overrides.email ?? `${suffix}-pr121@example.test`;
  const phone = overrides.phone ?? "2525552301";
  const normalizedPhone = overrides.normalizedPhone ?? phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const address = overrides.address ?? "2301 Runtime Replay Road";
  const question = overrides.question ?? "";
  return `
    public.capture_public_lead_v1(
      jsonb_build_object(
        'id', '${sessionId}',
        'utm_source', 'pr121-runtime',
        'landing_page', '/pr121-runtime',
        'status', 'completed',
        'step_reached', 5
      ),
      jsonb_build_object(
        'first_name', 'PR121',
        'last_name', 'Runtime',
        'email', ${sql(email)},
        'phone', ${sql(phone)},
        'phone_normalized', ${sql(normalizedPhone)},
        'normalized_email', ${sql(email.trim().toLowerCase())},
        'normalized_phone', ${sql(normalizedPhone)},
        'normalized_property_address', ${sql(address.toLowerCase())},
        'address_raw', ${sql(address)},
        'question_raw', ${sql(question)},
        'state', 'NC',
        'primary_intent', 'sell',
        'lead_type', 'home_value',
        'source', 'pr121-runtime',
        'source_detail', ${sql(suffix)},
        'page_url', '/pr121-runtime',
        'widget_session_id', '${sessionId}',
        'status', 'new',
        'consent_sms', false,
        'consent_call', false,
        'consent_email', false,
        'consent_timestamp', now()::text,
        'consent_language_version', 'canonical_v1'
      ),
      '{}'::jsonb,
      'disabled'
    )::text
  `;
}

function sameCounts(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function runPostMigrationRuntimeAssertions() {
  const replaySession = RUNTIME_SCENARIOS.idempotent_replay_identity.fixtureIds.sessions[0];
  const conflictSession = RUNTIME_SCENARIOS.materially_different_payload_same_session.fixtureIds.sessions[0];
  const runtimeIds = mergeFixtureIds(Object.values(RUNTIME_SCENARIOS).map((entry) => entry.fixtureIds));
  cleanupFixtureIds(runtimeIds);

  const replayOutput = psql(`
    begin;
    set local role service_role;
    select 'FIRST_JSON:' || ${captureSql(replaySession, "idempotent_replay_identity")};
    select 'FIRST_COUNTS_JSON:' || ${leadLifecycleCountsSql(replaySession)};
    select 'SECOND_JSON:' || ${captureSql(replaySession, "idempotent_replay_identity")};
    select 'SECOND_COUNTS_JSON:' || ${leadLifecycleCountsSql(replaySession)};
    rollback;
  `);
  const replayFirst = parseJsonLine(replayOutput, "FIRST_JSON:");
  const replayFirstCounts = parseJsonLine(replayOutput, "FIRST_COUNTS_JSON:");
  const replaySecond = parseJsonLine(replayOutput, "SECOND_JSON:");
  const replaySecondCounts = parseJsonLine(replayOutput, "SECOND_COUNTS_JSON:");
  const replayPassed =
    replayFirst.ok === true &&
    replaySecond.ok === true &&
    replaySecond.idempotent_replay === true &&
    replayFirst.lead_id === replaySecond.lead_id &&
    replayFirst.session_id === replaySecond.session_id &&
    sameCounts(replayFirstCounts, replaySecondCounts);

  const conflictOutput = psql(`
    begin;
    set local role service_role;
    select 'FIRST_JSON:' || ${captureSql(conflictSession, "materially_different_payload_same_session")};
    select 'FIRST_COUNTS_JSON:' || ${leadLifecycleCountsSql(conflictSession)};
    select 'SECOND_JSON:' || ${captureSql(conflictSession, "materially_different_payload_same_session", {
      email: "changed-runtime-pr121@example.test",
      phone: "2525552399",
      normalizedPhone: "2525552399",
      address: "2399 Changed Runtime Road",
      question: "Changed synthetic payload",
    })};
    select 'SECOND_COUNTS_JSON:' || ${leadLifecycleCountsSql(conflictSession)};
    rollback;
  `);
  const conflictFirst = parseJsonLine(conflictOutput, "FIRST_JSON:");
  const conflictFirstCounts = parseJsonLine(conflictOutput, "FIRST_COUNTS_JSON:");
  const conflictSecond = parseJsonLine(conflictOutput, "SECOND_JSON:");
  const conflictSecondCounts = parseJsonLine(conflictOutput, "SECOND_COUNTS_JSON:");
  const conflictPassed =
    conflictFirst.ok === true &&
    conflictSecond.ok === false &&
    conflictSecond.error === "idempotency_conflict" &&
    sameCounts(conflictFirstCounts, conflictSecondCounts);

  cleanupFixtureIds(runtimeIds);
  return {
    proofType: "post_migration_runtime_rpc",
    passed: replayPassed && conflictPassed,
    scenarios: [
      {
        scenario: "idempotent_replay_identity",
        firstOk: replayFirst.ok === true,
        replayOk: replaySecond.ok === true,
        idempotentReplay: replaySecond.idempotent_replay === true,
        sameLeadId: replayFirst.lead_id === replaySecond.lead_id,
        sameSessionId: replayFirst.session_id === replaySecond.session_id,
        noDuplicateLifecycleRows: sameCounts(replayFirstCounts, replaySecondCounts),
        counts: replaySecondCounts,
        passed: replayPassed,
      },
      {
        scenario: "materially_different_payload_same_session",
        firstOk: conflictFirst.ok === true,
        conflictError: conflictSecond.error ?? null,
        noDuplicateLifecycleRows: sameCounts(conflictFirstCounts, conflictSecondCounts),
        counts: conflictSecondCounts,
        passed: conflictPassed,
      },
    ],
  };
}

export function runPostMigrationCompatibilityAssertions() {
  const orphan = COMPATIBILITY_SCENARIOS.legacy_orphan_session;
  const legacy = COMPATIBILITY_SCENARIOS.legacy_lead_contact_compatibility;
  const orphanSession = orphan.fixtureIds.sessions[0];
  const legacyLead = legacy.fixtureIds.leads[0];

  const orphanOutput = psql(`
    begin;
    set local role service_role;
    select 'ORPHAN_JSON:' || ${captureSql(orphanSession, "legacy_orphan_session")};
    rollback;
    select 'ORPHAN_COUNTS_JSON:' || ${leadLifecycleCountsSql(orphanSession)};
  `);
  const orphanResult = parseJsonLine(orphanOutput, "ORPHAN_JSON:");
  const orphanCounts = parseJsonLine(orphanOutput, "ORPHAN_COUNTS_JSON:");
  const orphanPassed =
    orphanResult.ok === false &&
    orphanResult.error === "idempotency_conflict" &&
    orphanCounts.leads === 0 &&
    orphanCounts.sourceAttribution === 0 &&
    orphanCounts.auditLogs === 0 &&
    orphanCounts.leadNotifications === 0;

  const legacyOutput = psql(`
    select 'LEGACY_JSON:' || jsonb_build_object(
      'leadExists', exists(select 1 from public.leads where id = '${legacyLead}'::uuid),
      'contactIdNull', exists(select 1 from public.leads where id = '${legacyLead}'::uuid and contact_id is null),
      'requestFingerprintPresent', exists(select 1 from public.leads where id = '${legacyLead}'::uuid and request_fingerprint is not null),
      'contactIdentityRows', (
        select count(*) from public.contact_identities
         where contact_id in (select contact_id from public.leads where id = '${legacyLead}'::uuid and contact_id is not null)
      )
    )::text;
  `);
  const legacyResult = parseJsonLine(legacyOutput, "LEGACY_JSON:");
  const legacyPassed =
    legacyResult.leadExists === true &&
    legacyResult.contactIdNull === true &&
    legacyResult.requestFingerprintPresent === true &&
    legacyResult.contactIdentityRows === 0;

  const fixtureIds = mergeFixtureIds(Object.values(COMPATIBILITY_SCENARIOS).map((entry) => entry.fixtureIds));
  cleanupFixtureIds(fixtureIds);

  return {
    proofType: "cutover_compatibility",
    passed: orphanPassed && legacyPassed,
    scenarios: [
      {
        scenario: "legacy_orphan_session",
        result: orphanResult.error ?? null,
        noLifecycleRowsCreated: orphanCounts.leads === 0 && orphanCounts.sourceAttribution === 0,
        counts: orphanCounts,
        passed: orphanPassed,
      },
      {
        scenario: "legacy_lead_contact_compatibility",
        migrationBackfillResult: legacyResult,
        passed: legacyPassed,
      },
    ],
  };
}

export function migrationFiles() {
  return readdirSync(path.join(ROOT, "supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

export function gitValue(args) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", env: sanitizedChildEnv() });
  if (result.status !== 0) throw new Error("git_metadata_failed");
  return result.stdout.trim();
}

export function gitMetadata() {
  return {
    branch: gitValue(["branch", "--show-current"]),
    head: gitValue(["rev-parse", "HEAD"]),
    parent: gitValue(["rev-parse", "HEAD^"]),
    tree: gitValue(["rev-parse", "HEAD^{tree}"]),
    trackedWorktreeClean: gitValue(["status", "--porcelain", "--untracked-files=no"]) === "",
    targetMigrationBlob: gitValue(["rev-parse", `HEAD:supabase/migrations/${TARGET_MIGRATION_FILE}`]),
    preflightScriptBlob: gitValue(["rev-parse", "HEAD:scripts/infra-03-contact-identity-preflight.sql"]),
    fixtureFileBlob: gitValue(["rev-parse", "HEAD:scripts/release/pr121-preflight-fixtures.sql"]),
  };
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

if (process.argv[1] === __filename) {
  try {
    const summary = await runPreflightRehearsal(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(`PR121 preflight rehearsal failed: ${error instanceof Error ? error.message : "unknown"}`);
    process.exitCode = 1;
  }
}
