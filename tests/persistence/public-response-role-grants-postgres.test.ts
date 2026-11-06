// @vitest-environment node
// Real owned disposable PostgreSQL only; no app credentials or external effects.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { install, psql, startDatabase, stopDatabase } from "../support/qa-audit-postgres";

const file = "20261105224500_public_request_response.sql";
const sql = () => readFileSync("supabase/migrations/" + file, "utf8");
const signatures = [
  "request_receipt_permitted_v1(uuid,text,timestamptz)", "amm_guard_request_response_v1()",
  "seed_request_responses_v1(uuid,uuid,text,timestamptz,jsonb)",
  "capture_public_lead_v6(jsonb,jsonb,jsonb,text,jsonb)",
  "request_public_appointment_v2(uuid,uuid,text,timestamptz,jsonb,jsonb)",
  "claim_request_response_v1(uuid,timestamptz)", "finish_request_response_v1(uuid,uuid,jsonb)",
];

describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")("request-response grants with optional legacy browser roles", () => {
  beforeAll(async () => { await startDatabase(); install("amm_qa_upgrade", true, new Set([file])); }, 120_000);
  afterAll(() => stopDatabase());

  it("applies without creating missing browser roles and preserves predecessor capture, RLS and defaults", () => {
    // Roles belong solely to this fresh harness, never a shared server. Renaming
    // preserves their existing OIDs/dependencies while reproducing absent names.
    psql("ALTER ROLE anon RENAME TO amm_fixture_legacy_anon; ALTER ROLE authenticated RENAME TO amm_fixture_legacy_authenticated;");
    const before = psql(`SELECT md5(pg_get_functiondef('capture_public_lead_v5(jsonb,jsonb,jsonb,text,jsonb)'::regprocedure)),
      (SELECT relrowsecurity FROM pg_class WHERE oid='lead_notifications'::regclass),
      (SELECT md5(coalesce(string_agg(defaclacl::text,',' ORDER BY oid),'')) FROM pg_default_acl);`);
    expect(() => psql(sql())).not.toThrow();
    expect(psql("SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated')")).toBe("0");
    for (const signature of signatures) {
      expect(psql(`SELECT has_function_privilege('service_role','${signature}','EXECUTE')`)).toBe("t");
      expect(psql(`SELECT count(*) FROM pg_proc p,aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        WHERE p.oid='${signature}'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE'`)).toBe("0");
    }
    expect(psql(`SELECT md5(pg_get_functiondef('capture_public_lead_v5(jsonb,jsonb,jsonb,text,jsonb)'::regprocedure)),
      (SELECT relrowsecurity FROM pg_class WHERE oid='lead_notifications'::regclass),
      (SELECT md5(coalesce(string_agg(defaclacl::text,',' ORDER BY oid),'')) FROM pg_default_acl);`)).toBe(before);
    expect(psql("SELECT count(*) FROM leads")).toBe("0");
  });

  it("revokes existing browser-role inherited grants without changing owner defaults", () => {
    psql("ALTER ROLE amm_fixture_legacy_anon RENAME TO anon; ALTER ROLE amm_fixture_legacy_authenticated RENAME TO authenticated;");
    install("amm_qa_fresh", true, new Set([file]));
    psql("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated;", "amm_qa_fresh");
    const defaults = psql("SELECT md5(string_agg(defaclacl::text,',' ORDER BY oid)) FROM pg_default_acl;", "amm_qa_fresh");
    psql(sql(), "amm_qa_fresh");
    for (const signature of signatures) {
      for (const role of ["anon", "authenticated"]) {
        expect(psql(`SELECT has_function_privilege('${role}','${signature}','EXECUTE')`, "amm_qa_fresh")).toBe("f");
      }
      expect(psql(`SELECT has_function_privilege('service_role','${signature}','EXECUTE')`, "amm_qa_fresh")).toBe("t");
    }
    expect(() => psql("SET ROLE anon; SELECT claim_request_response_v1(NULL,NULL);", "amm_qa_fresh")).toThrow();
    expect(() => psql("SET ROLE authenticated; SELECT request_public_appointment_v2(NULL,NULL,NULL,now(),'{}','{}');", "amm_qa_fresh")).toThrow();
    expect(psql("SELECT md5(string_agg(defaclacl::text,',' ORDER BY oid)) FROM pg_default_acl;", "amm_qa_fresh")).toBe(defaults);
  });
});
