import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  COMPATIBILITY_SCENARIOS,
  DATABASE_HOST_ALIASES,
  DATABASE_URL_ALIASES,
  PREDECESSOR_MIGRATION_VERSION,
  PREMIGRATION_SCENARIOS,
  PROJECT_REF_ALIASES,
  TARGET_MIGRATION_VERSION,
  assertLocalDatabaseTargets,
  assertLocalSupabaseCommand,
  classifyFindings,
  cleanupSqlForFixture,
  evaluateScenario,
  executeScenario,
  exactProjectContainerNames,
  filterPreflightRowsForFixture,
  hasUnsafeSummaryContent,
  migrationStatusSql,
  sanitizeSummary,
  targetObjectStatusSql,
} from "../../scripts/release/pr121-preflight-rehearsal.mjs";

const ROOT = process.cwd();
const PREFLIGHT_SQL = readFileSync(path.join(ROOT, "scripts/infra-03-contact-identity-preflight.sql"), "utf8");
const FIXTURE_SQL = readFileSync(path.join(ROOT, "scripts/release/pr121-preflight-fixtures.sql"), "utf8");

type ScenarioLike = {
  expectedPreflightTypes: string[];
  fixtureIds: { leads: string[] };
  expectedLegacyContactCount?: number;
  expectedLegacyContactIds?: string[];
  expectedSplitContactCount?: number;
  expectedSplitContactIds?: string[];
};

function scenario(name: string) {
  const found = PREMIGRATION_SCENARIOS.find((entry) => entry.name === name);
  if (!found) throw new Error(`missing scenario ${name}`);
  return found;
}

function actualFor(entry: ScenarioLike) {
  const rows = entry.expectedPreflightTypes.map((identity_type: string) => ({
    identity_type,
    normalized_value: ["lead_split_identity", "legacy_unlinked_lead"].includes(identity_type)
      ? entry.fixtureIds.leads[0]
      : "synthetic-redacted",
    contact_count: identity_type === "legacy_unlinked_lead"
      ? (entry.expectedLegacyContactCount ?? 0)
      : (entry.expectedSplitContactCount ?? 2),
    contact_ids: identity_type === "legacy_unlinked_lead"
      ? (entry.expectedLegacyContactIds ?? [])
      : (entry.expectedSplitContactIds ?? []),
  }));
  return {
    preflightRows: rows,
    supplemental: {},
  };
}

describe("PR121 preflight SQL correction", () => {
  it("normalizes blank lead normalized_email before falling back to raw email", () => {
    expect(PREFLIGHT_SQL).toContain("nullif(lower(btrim(normalized_email)), '')");
    expect(PREFLIGHT_SQL).toContain("nullif(lower(btrim(email)), '')");
    expect(PREFLIGHT_SQL).not.toContain("coalesce(normalized_email, email)");
  });

  it("normalizes phone fields independently before fallback", () => {
    expect(PREFLIGHT_SQL).toContain("coalesce(phone_normalized, '')");
    expect(PREFLIGHT_SQL).toContain("coalesce(normalized_phone, '')");
    expect(PREFLIGHT_SQL).toContain("coalesce(phone, '')");
    expect(PREFLIGHT_SQL).not.toContain("coalesce(normalized_phone, phone_normalized, phone");
  });

  it("aggregates split identity contacts without a hardcoded count or Cartesian result", () => {
    expect(PREFLIGHT_SQL).toContain("email_contact_matches");
    expect(PREFLIGHT_SQL).toContain("phone_contact_matches");
    expect(PREFLIGHT_SQL).toContain("cardinality(distinct_contacts.contact_ids) as contact_count");
    expect(PREFLIGHT_SQL).not.toContain("2 as contact_count");
  });

  it("surfaces legacy unlinked leads with the lead UUID as the sanitized identifier", () => {
    expect(PREFLIGHT_SQL).toContain("'legacy_unlinked_lead' as identity_type");
    expect(PREFLIGHT_SQL).toContain("legacy_leads.id::text as normalized_value");
    expect(PREFLIGHT_SQL).toContain("legacy_leads.contact_id is null");
    const legacyBlock = PREFLIGHT_SQL.slice(PREFLIGHT_SQL.indexOf("legacy_unlinked_lead_reviews"));
    expect(legacyBlock).not.toMatch(/normalized_(email|phone)\s+as\s+normalized_value/i);
    expect(legacyBlock).not.toMatch(/email\s+as\s+normalized_value/i);
    expect(legacyBlock).not.toMatch(/phone\s+as\s+normalized_value/i);
  });

  it("unions and deduplicates legacy candidate contacts with actual cardinality", () => {
    expect(PREFLIGHT_SQL).toContain("legacy_unlinked_lead_reviews");
    expect(PREFLIGHT_SQL).toContain("array_agg(distinct contact_id order by contact_id)");
    expect(PREFLIGHT_SQL).toContain("cardinality(coalesce(candidate_contacts.contact_ids, array[]::uuid[])) as contact_count");
    expect(PREFLIGHT_SQL).toContain("coalesce(candidate_contacts.contact_ids, array[]::uuid[]) as contact_ids");
  });
});

describe("PR121 fixture source", () => {
  it("contains executable fixture helpers used by the runner", () => {
    expect(FIXTURE_SQL).toContain("create temp table if not exists pr121_fixture_registry");
    expect(FIXTURE_SQL).toContain("create or replace function pg_temp.pr121_insert_contact");
    expect(FIXTURE_SQL).toContain("create or replace function pg_temp.pr121_insert_session");
    expect(FIXTURE_SQL).toContain("create or replace function pg_temp.pr121_insert_lead");
    expect(FIXTURE_SQL).not.toContain("fixture_matrix_documented");
  });

  it("covers the required pre-migration fixture names", () => {
    expect(PREMIGRATION_SCENARIOS.map((entry) => entry.name)).toEqual([
      "clean_baseline",
      "duplicate_normalized_email",
      "duplicate_normalized_phone",
      "split_identity_collision",
      "same_contact_repeated_identity",
      "null_blank_absent_identities",
      "blank_normalized_email_fallback",
      "blank_normalized_phone_fallback",
      "multiple_identity_matches",
      "shared_contact_intersection",
      "same_contact_email_phone",
    ]);
  });
});

describe("PR121 preflight scenario evaluation", () => {
  it("maps each scenario to the expected classification and blocker count", () => {
    for (const entry of PREMIGRATION_SCENARIOS) {
      expect(evaluateScenario(entry, actualFor(entry))).toMatchObject({
        scenario: entry.name,
        actualClassification: entry.expectedClassification,
        preflightBlockerCount: entry.expectedBlockerCount,
        passed: true,
      });
    }
  });

  it("proves split identity returns one deterministic row with actual union cardinality", () => {
    const entry = scenario("multiple_identity_matches");
    const evaluation = evaluateScenario(entry, actualFor(entry));
    expect(evaluation.passed).toBe(true);
    expect(evaluation.actualPreflightTypes).toEqual(["email", "lead_split_identity", "legacy_unlinked_lead", "phone"]);
    expect(evaluation.splitContactCount).toBe(4);
    expect(evaluation.splitContactIds).toEqual([...entry.expectedSplitContactIds!].sort());
    expect(evaluation.legacyContactCount).toBe(4);
    expect(evaluation.legacyContactIds).toEqual([...entry.expectedLegacyContactIds!].sort());
  });

  it("does not classify shared contact intersection as split identity", () => {
    const entry = scenario("shared_contact_intersection");
    const evaluation = evaluateScenario(entry, actualFor(entry));
    expect(evaluation.passed).toBe(true);
    expect(evaluation.actualPreflightTypes).toEqual(["email", "legacy_unlinked_lead", "phone"]);
    expect(evaluation.legacyContactCount).toBe(3);
  });

  it("classifies legacy unlinked lead alone as operator review", () => {
    const legacy = COMPATIBILITY_SCENARIOS.legacy_lead_contact_compatibility;
    const evaluation = evaluateScenario(legacy, actualFor(legacy));
    expect(evaluation).toMatchObject({
      actualClassification: "operator_review",
      actualPreflightTypes: ["legacy_unlinked_lead"],
      preflightBlockerCount: 1,
      legacyContactCount: 0,
      legacyContactIds: [],
      passed: true,
    });
  });

  it("keeps collision blockers higher priority than legacy operator review", () => {
    expect(classifyFindings([
      { identity_type: "legacy_unlinked_lead" },
      { identity_type: "email" },
    ], {})).toBe("contact_identity_blocker");
  });

  it("keeps clean and idempotency-risk classifications stable", () => {
    expect(classifyFindings([], {})).toBe("clean");
    expect(classifyFindings([], { orphan_sessions: 1 })).toBe("idempotency_risk");
    expect(classifyFindings([], { changed_session_idempotency_risks: 1 })).toBe("idempotency_risk");
  });

  it("keeps persisted compatibility fixture preflight rows scoped by exact IDs", () => {
    const ownedLead = "12199990-0000-4000-8000-000000000201";
    const otherLead = "12199990-0000-4000-8000-000000000202";
    expect(filterPreflightRowsForFixture([
      { identity_type: "legacy_unlinked_lead", normalized_value: ownedLead, contact_ids: [] },
      { identity_type: "legacy_unlinked_lead", normalized_value: otherLead, contact_ids: [] },
    ], {
      leads: [ownedLead],
      contacts: [],
      sessions: [],
    })).toEqual([
      { identity_type: "legacy_unlinked_lead", normalized_value: ownedLead, contact_ids: [] },
    ]);
  });

  it("supports one candidate contact when email and phone match the same contact", () => {
    const contactId = "12199991-0000-4000-8000-000000000001";
    const evaluation = evaluateScenario({
      ...scenario("clean_baseline"),
      expectedClassification: "operator_review",
      expectedPreflightTypes: ["legacy_unlinked_lead"],
      expectedBlockerCount: 1,
      expectedLegacyContactCount: 1,
      expectedLegacyContactIds: [contactId],
    }, {
      preflightRows: [{
        identity_type: "legacy_unlinked_lead",
        normalized_value: "12199991-0000-4000-8000-000000000201",
        contact_count: 1,
        contact_ids: [contactId],
      }],
      supplemental: {},
    });
    expect(evaluation).toMatchObject({
      actualClassification: "operator_review",
      legacyContactCount: 1,
      legacyContactIds: [contactId],
      passed: true,
    });
  });

  it("supports multiple candidate contacts in one deterministic legacy finding", () => {
    const contactIds = [
      "12199992-0000-4000-8000-000000000001",
      "12199992-0000-4000-8000-000000000002",
      "12199992-0000-4000-8000-000000000003",
    ];
    const evaluation = evaluateScenario({
      ...scenario("clean_baseline"),
      expectedClassification: "operator_review",
      expectedPreflightTypes: ["legacy_unlinked_lead"],
      expectedBlockerCount: 1,
      expectedLegacyContactCount: 3,
      expectedLegacyContactIds: contactIds,
    }, {
      preflightRows: [{
        identity_type: "legacy_unlinked_lead",
        normalized_value: "12199992-0000-4000-8000-000000000201",
        contact_count: 3,
        contact_ids: [...contactIds].reverse(),
      }],
      supplemental: {},
    });
    expect(evaluation.passed).toBe(true);
  });

  it("runs cleanup after success and after failure", async () => {
    const cleanup = vi.fn(async () => {});
    await expect(executeScenario({
      scenario: scenario("clean_baseline"),
      queryScenario: vi.fn(async () => ({ preflightRows: [], supplemental: {} })),
      cleanup,
    })).resolves.toMatchObject({ passed: true });
    await expect(executeScenario({
      scenario: scenario("duplicate_normalized_email"),
      queryScenario: vi.fn(async () => ({ preflightRows: [], supplemental: {} })),
      cleanup,
    })).rejects.toThrow("preflight_fixture_mismatch:duplicate_normalized_email");
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});

describe("PR121 exact cleanup safety", () => {
  it("uses exact fixture IDs and no wildcard or marker-only deletion", () => {
    const sql = cleanupSqlForFixture({
      contacts: ["12100001-0000-4000-8000-000000000001"],
      sessions: ["12100001-0000-4000-8000-000000000101"],
      leads: ["12100001-0000-4000-8000-000000000201"],
    });
    expect(sql).toContain("where id = any(v_registered_leads)");
    expect(sql).toContain("where id = any(v_registered_sessions)");
    expect(sql).toContain("where id = any(v_registered_contacts)");
    expect(sql).not.toMatch(/like\s+'121%'/i);
    expect(sql).not.toContain("source = 'pr121-preflight'");
  });

  it("would not match an unrelated UUID just because it starts with 121", () => {
    const sql = cleanupSqlForFixture({
      contacts: ["12100001-0000-4000-8000-000000000001"],
      sessions: [],
      leads: [],
    });
    expect(sql).not.toContain("12199999-0000-4000-8000-999999999999");
    expect(sql).not.toMatch(/id::text\s+like/i);
  });
});

describe("PR121 local-only guard", () => {
  it.each(DATABASE_URL_ALIASES)("rejects remote URL alias %s without echoing values", (key) => {
    const remoteUrl = ["postgres", "://user:secret@", "remote.invalid", ":5432/postgres"].join("");
    expect(() => assertLocalDatabaseTargets({ [key]: remoteUrl } as NodeJS.ProcessEnv)).toThrow(
      `${key}_must_point_to_localhost_for_offline_rehearsal`,
    );
  });

  it.each(DATABASE_HOST_ALIASES)("rejects remote host alias %s", (key) => {
    expect(() => assertLocalDatabaseTargets({ [key]: "remote.invalid" } as NodeJS.ProcessEnv)).toThrow(
      `${key}_must_point_to_localhost_for_offline_rehearsal`,
    );
  });

  it.each(PROJECT_REF_ALIASES)("rejects project ref alias %s", (key) => {
    expect(() => assertLocalDatabaseTargets({ [key]: "remote-ref" } as NodeJS.ProcessEnv)).toThrow(
      `${key}_must_be_unset_for_official_offline_rehearsal`,
    );
  });

  it("accepts localhost, 127.0.0.1, and ::1", () => {
    const local = (host: string) => ["postgres", "://u:p@", host, ":5432/postgres"].join("");
    expect(assertLocalDatabaseTargets({ DATABASE_URL: local("localhost") } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(assertLocalDatabaseTargets({ DATABASE_URL: local("127.0.0.1") } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(assertLocalDatabaseTargets({ DATABASE_URL: local("[::1]") } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it("requires local Supabase CLI database commands", () => {
    expect(() => assertLocalSupabaseCommand("supabase", ["db", "reset", "--version", "x"])).toThrow(
      "supabase_database_command_must_use_local_flag",
    );
    expect(() => assertLocalSupabaseCommand("supabase", ["db", "reset", "--local", "--linked"])).toThrow(
      "supabase_command_must_not_use_linked",
    );
    expect(() => assertLocalSupabaseCommand("supabase", ["migration", "up", "--local", "--db-url", "x"])).toThrow(
      "supabase_command_must_not_use_db_url",
    );
    expect(assertLocalSupabaseCommand("supabase", ["migration", "up", "--local"])).toBe(true);
  });

  it("counts only exact local project containers", () => {
    const names = [
      "supabase_db_ask-magic-mike",
      "supabase_auth_ask-magic-mike",
      "supabase_db_other-project",
    ].join("\n");
    expect(exactProjectContainerNames(names, "ask-magic-mike")).toEqual([
      "supabase_db_ask-magic-mike",
      "supabase_auth_ask-magic-mike",
    ]);
  });
});

describe("PR121 migration state SQL and evidence sanitization", () => {
  it("checks predecessor and target migration history explicitly", () => {
    expect(migrationStatusSql()).toContain(PREDECESSOR_MIGRATION_VERSION);
    expect(migrationStatusSql()).toContain(TARGET_MIGRATION_VERSION);
    expect(targetObjectStatusSql()).toContain("public.contact_identities");
    expect(targetObjectStatusSql()).toContain("request_fingerprint");
    expect(targetObjectStatusSql()).toContain("public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)");
  });

  it("does not leave obvious secret patterns in generated summaries", () => {
    const databaseUrl = ["postgres", "://user:secret@", "db.example.test", ":5432/postgres"].join("");
    const jwt = ["eyJabc", "def", "ghi"].join(".");
    const sanitized = sanitizeSummary({
      database: databaseUrl,
      authorization: ["Bearer", "abc.def.ghi"].join(" "),
      jwt,
    });

    expect(hasUnsafeSummaryContent(sanitized)).toBe(false);
    expect(JSON.stringify(sanitized)).not.toContain("secret");
    expect(JSON.stringify(sanitized)).not.toContain(["postgres", "://"].join(""));
  });
});
