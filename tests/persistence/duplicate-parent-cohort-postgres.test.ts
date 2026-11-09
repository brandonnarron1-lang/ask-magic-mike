// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bind, concurrent, duplicateCohortMigration, install, literal, migration, psql, startDatabase, stopDatabase } from "../support/qa-audit-postgres";

const prior = readFileSync(`supabase/migrations/${migration}`, "utf8");
const correction = readFileSync(`supabase/migrations/${duplicateCohortMigration}`, "utf8");
const predicate = "     AND COALESCE(l.is_test, false) = v_is_qa\n";
const functionBody = (sql: string) => sql.match(/CREATE OR REPLACE FUNCTION public\.capture_public_lead_v1\([\s\S]+?\n\$\$;/)![0];
type Input = { session: Record<string, unknown>; lead: Record<string, unknown>; attribution: Record<string, unknown> };
function fixture(qa: boolean, email: string | null = `${randomUUID()}@example.test`, phone: string | null = null): Input {
  const id = randomUUID();
  return { session: { id }, attribution: { utm_source: "synthetic_cohort_fixture", utm_medium: "qa" }, lead: {
    first_name: "SYNTHETIC FIXTURE", last_name: "DO NOT CONTACT", email, normalized_email: email,
    phone, normalized_phone: phone, address_raw: "1 Synthetic Fixture Street", primary_intent: "sell", lead_type: "home_value",
    consent_email: false, consent_call: false, consent_sms: false, consent_language_version: "synthetic_cohort_v1",
    is_test: qa, communication_suppressed: qa, email_suppressed: qa, sms_suppressed: qa, request_idempotency_key: id,
  } };
}
function sql(input: Input, v2 = false) {
  return bind(`SET ROLE service_role; SELECT public.capture_public_lead_${v2 ? "v2" : "v1"}($1::jsonb,$2::jsonb,$3::jsonb,'disabled'${v2 ? ", '{}'::jsonb" : ""});`,
    [JSON.stringify(input.session), JSON.stringify(input.lead), JSON.stringify(input.attribution)]);
}
const capture = (input: Input, v2 = false) => JSON.parse(psql(sql(input, v2)));
const counts = () => psql("SELECT jsonb_build_object('lead',(SELECT count(*) FROM leads),'contact',(SELECT count(*) FROM contacts),'identity',(SELECT count(*) FROM contact_identities),'session',(SELECT count(*) FROM sessions),'audit',(SELECT count(*) FROM audit_logs),'consent',(SELECT count(*) FROM consents),'assignment',(SELECT count(*) FROM agent_assignments),'outbox',(SELECT count(*) FROM lead_notifications))");
const row = (id: string) => psql(`SELECT to_jsonb(l) FROM leads l WHERE id=${literal(id)}::uuid`);
const privileges = () => psql("SELECT jsonb_build_object('functions',(SELECT jsonb_agg(jsonb_build_array(oid::text,proowner,proacl,prosecdef,proconfig) ORDER BY oid) FROM pg_proc WHERE pronamespace='public'::regnamespace),'defaults',(SELECT jsonb_agg(to_jsonb(d) ORDER BY oid) FROM pg_default_acl d),'roles',(SELECT jsonb_agg(jsonb_build_array(rolname,rolsuper,rolcreaterole,rolbypassrls) ORDER BY rolname) FROM pg_roles))");

describe("prospective duplicate cohort correction: static contract", () => {
  it("changes exactly one parent predicate, not locking, identity, permission, assignment or outbox code", () => {
    expect(correction.split(predicate)).toHaveLength(2);
    expect(functionBody(correction).replace(predicate, "")).toBe(functionBody(prior));
    expect(correction.slice(correction.indexOf("REVOKE ALL"))).toBe(prior.slice(prior.indexOf("REVOKE ALL")));
    expect(correction).not.toMatch(/CREATE TABLE|ALTER TABLE|CREATE ROLE|ALTER DEFAULT PRIVILEGES/i);
    const outside = correction.replace(functionBody(correction), "").replace(/--[^\n]*/g, "");
    expect(outside).not.toMatch(/(?:^|\n)\s*(?:UPDATE|INSERT INTO|DELETE FROM)\b/i);
  });
  it("wires required isolated execution and keeps the review branch deployment-excluded", () => {
    expect(readFileSync(".github/workflows/release-gate.yml", "utf8")).toContain("tests/persistence/duplicate-parent-cohort-postgres.test.ts --maxWorkers=1 --no-file-parallelism");
    expect(JSON.parse(readFileSync("vercel.json", "utf8")).git.deploymentEnabled["codex/qa-parent-duplicate-boundary-20261109"]).toBe(false);
  });
});

describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("duplicate cohort: actual isolated PostgreSQL, no provider transport", () => {
  const shared = `${randomUUID()}@example.test`;
  let parent: string, historicalHeld: string;
  beforeAll(async () => {
    await startDatabase();
    install("amm_qa_upgrade", true, new Set([duplicateCohortMigration]));
    const definitionHash = "SELECT encode(sha256(convert_to(pg_get_functiondef('capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure),'UTF8')),'hex')";
    expect(psql(definitionHash)).toBe("df6ff62de38467617eaf2c0e8a39f0d7cbdb527d0066ae370587b3003fa78130");
    // No legacy assignment or provider effect is needed to prove parent selection.
    psql("UPDATE agents SET is_active=false");
    parent = capture(fixture(true, shared)).lead_id;
    historicalHeld = capture(fixture(false, shared)).lead_id;
    expect(JSON.parse(row(historicalHeld)).duplicate_of_lead_id).toBe(parent); // genuine negative control on accepted v1
    const before = counts(), history = [row(parent), row(historicalHeld)], acl = privileges();
    psql(correction);
    expect(psql(definitionHash)).toBe("dd3ef93926874c8acfe96cc2e495b13a78648565ca297c5fb7c0390f88f67354");
    expect(counts()).toBe(before);
    expect([row(parent), row(historicalHeld)]).toEqual(history);
    expect(privileges()).toBe(acl);
  }, 120_000);
  afterAll(() => stopDatabase(), 20_000);

  it("ordinary email capture ignores the QA parent without unholding history or splitting contact identity", () => {
    const saved = capture(fixture(false, shared));
    expect(saved).toMatchObject({ ok: true, duplicate_of_lead_id: null, assigned_agent_id: null });
    expect(JSON.parse(row(saved.lead_id)).contact_id).toBe(JSON.parse(row(parent)).contact_id);
    expect(JSON.parse(row(historicalHeld)).duplicate_of_lead_id).toBe(parent);
    expect(JSON.parse(row(parent))).toMatchObject({ is_test: true, communication_suppressed: true });
  });

  it("phone-only capture has the same cohort boundary", () => {
    const qa = capture(fixture(true, null, "+12525550101"));
    const ordinary = capture(fixture(false, null, "+12525550101"));
    expect(ordinary).toMatchObject({ ok: true, duplicate_of_lead_id: null });
    expect(JSON.parse(row(ordinary.lead_id)).contact_id).toBe(JSON.parse(row(qa.lead_id)).contact_id);
  });

  it("same-cohort repeats retain the earliest eligible parent, including ordinary suppression/NO FOLLOW-UP", () => {
    const email = `${randomUUID()}@example.test`, ordinary = capture(fixture(false, email));
    psql(`UPDATE leads SET communication_suppressed=true,closed_lost_reason='no_follow_up',assigned_agent_id='00000000-0000-4000-8000-000000009901' WHERE id=${literal(ordinary.lead_id)}::uuid`);
    const before = row(ordinary.lead_id);
    expect(capture(fixture(false, email)).duplicate_of_lead_id).toBe(ordinary.lead_id);
    expect(row(ordinary.lead_id)).toBe(before);
    const qa = capture(fixture(true, email));
    expect(qa.duplicate_of_lead_id).toBeNull(); // QA cannot inherit ordinary ownership either.
    expect(capture(fixture(true, email)).duplicate_of_lead_id).toBe(qa.lead_id);
  });

  it("exact replay/concurrency keeps one record, immutable request identity and required audit", async () => {
    const input = fixture(false), before = JSON.parse(counts());
    const replies = await Promise.all(Array.from({ length: 5 }, () => concurrent(sql(input))));
    const results = replies.map(value => JSON.parse(value));
    expect(new Set(results.map(value => value.lead_id)).size).toBe(1);
    expect(results.filter(value => !value.idempotent_replay)).toHaveLength(1);
    const after = counts(); expect(JSON.parse(after).lead - before.lead).toBe(1);
    expect(JSON.parse(after).audit - before.audit).toBe(1);
    expect(capture(input).idempotent_replay).toBe(true); expect(counts()).toBe(after);
    const changed = structuredClone(input); changed.lead.address_raw = "2 Synthetic Fixture Street";
    expect(capture(changed)).toMatchObject({ ok: false, error: "idempotency_conflict" }); expect(counts()).toBe(after);
  });

  it("concurrent distinct ordinary requests choose one ordinary parent, never the older QA record", async () => {
    const email = `${randomUUID()}@example.test`, qa = capture(fixture(true, email));
    const replies = await Promise.all(Array.from({ length: 5 }, () => concurrent(sql(fixture(false, email)))));
    const results = replies.map(value => JSON.parse(value));
    const roots = results.filter(value => value.duplicate_of_lead_id === null);
    expect(roots).toHaveLength(1);
    expect(results.filter(value => value.duplicate_of_lead_id === roots[0].lead_id)).toHaveLength(4);
    expect(results.some(value => value.duplicate_of_lead_id === qa.lead_id)).toBe(false);
  });

  it("conflicting existing email/phone identities still refuse atomically", () => {
    const email = `${randomUUID()}@example.test`;
    capture(fixture(false, email, "+12525550102"));
    capture(fixture(false, `${randomUUID()}@example.test`, "+12525550103"));
    const before = counts();
    expect(capture(fixture(false, email, "+12525550103"))).toMatchObject({ ok: false, error: "identity_conflict" });
    expect(counts()).toBe(before);
  });

  it("v2 keeps explicit denied consents and only a disabled internal intent; replay creates nothing", () => {
    const input = fixture(false), saved = capture(input, true);
    expect(saved).toMatchObject({ ok: true, notification_status: "skipped" });
    expect(psql(`SELECT count(*),count(*) FILTER(WHERE granted) FROM consents WHERE lead_id=${literal(saved.lead_id)}::uuid`)).toBe("3|0");
    expect(psql(`SELECT count(*),sum(attempt_count) FROM lead_notifications WHERE lead_id=${literal(saved.lead_id)}::uuid`)).toBe("1|0");
    const before = counts(); expect(capture(input, true).idempotent_replay).toBe(true); expect(counts()).toBe(before);
    expect(psql("SELECT (SELECT count(*) FROM agent_assignments),(SELECT count(*) FROM lead_allocation_offers),(SELECT count(*) FROM lead_notifications WHERE attempt_count>0)")).toBe("0|0|0");
  });

  it("browser roles remain denied; service role stays invoker with the original fixed search path", () => {
    expect(psql("SELECT has_function_privilege('anon','capture_public_lead_v1(jsonb,jsonb,jsonb,text)','EXECUTE'),has_function_privilege('authenticated','capture_public_lead_v1(jsonb,jsonb,jsonb,text)','EXECUTE'),has_function_privilege('service_role','capture_public_lead_v1(jsonb,jsonb,jsonb,text)','EXECUTE')")).toBe("f|f|t");
    for (const role of ["anon", "authenticated"]) {
      let refusal: string | undefined;
      try { psql(`SET ROLE ${role}; SELECT capture_public_lead_v1('{}','{}','{}','disabled')`); }
      catch (error) { refusal = String((error as { stderr?: Buffer }).stderr ?? error); }
      expect(refusal).toMatch(/permission denied for function capture_public_lead_v1/);
    }
    expect(psql("SELECT prosecdef,array_to_string(proconfig,',') FROM pg_proc WHERE oid='capture_public_lead_v1(jsonb,jsonb,jsonb,text)'::regprocedure")).toBe("f|search_path=public, pg_temp");
  });
});
