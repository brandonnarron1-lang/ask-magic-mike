// @vitest-environment node
// Real disposable PostgreSQL only. Mirrors canonical owner's existing default ACL,
// without credentials, Production access, application/provider requests or sends.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { install, psql, startDatabase, stopDatabase } from "../support/qa-audit-postgres";

const migration = "20261103233000_traffic_daily_digest_seller_review.sql";
const opted = process.env.AMM_QA_POSTGRES_TEST === "1";

describe.skipIf(!opted)("operational report least privileges with inherited owner defaults", () => {
  beforeAll(async () => {
    await startDatabase();
    install("amm_qa_upgrade", true, new Set([migration]));
    // Production catalog evidence: existing owner defaults grant this set to
    // service_role. Do not change those defaults to make the migration pass.
    psql("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO service_role;");
    psql(readFileSync("supabase/migrations/" + migration, "utf8"));
  }, 60_000);
  afterAll(() => stopDatabase());

  it("removes inherited destructive report access while preserving required grants and RLS", () => {
    expect(psql(`SELECT has_table_privilege('service_role','operational_daily_reports','SELECT')
      AND has_table_privilege('service_role','operational_daily_reports','INSERT')
      AND has_table_privilege('service_role','operational_daily_reports','UPDATE')`)).toBe("t");
    expect(psql("SELECT has_table_privilege('service_role','operational_daily_reports','DELETE,TRUNCATE,REFERENCES,TRIGGER')")).toBe("f");
    expect(psql("SELECT relrowsecurity FROM pg_class WHERE oid='operational_daily_reports'::regclass")).toBe("t");
    for (const role of ["anon", "authenticated"]) {
      expect(psql(`SELECT has_table_privilege('${role}','operational_daily_reports','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')`)).toBe("f");
    }
    expect(psql("SELECT has_function_privilege('service_role','capture_public_lead_v5(jsonb,jsonb,jsonb,text,jsonb)','EXECUTE')")).toBe("t");
  });

  it("supports the real report write contract but refuses deletion and duplicate identities", () => {
    psql(`INSERT INTO lead_center_users(id,name,email,role,"emailVerified")
      VALUES('report-grants-fixture','Synthetic operator','operator@example.test','administrator',true);
      SET ROLE service_role;
      INSERT INTO operational_daily_reports(recipient_user_id,recipient,period_from,period_to,idempotency_key,frozen_body)
      VALUES('report-grants-fixture','operator@example.test','2026-11-03T05:00Z','2026-11-04T05:00Z','synthetic-report-grants','{}');
      UPDATE operational_daily_reports SET status='retry',attempt_count=1 WHERE idempotency_key='synthetic-report-grants';
      RESET ROLE;`);
    expect(psql("SET ROLE service_role; SELECT status||':'||attempt_count FROM operational_daily_reports WHERE idempotency_key='synthetic-report-grants'")).toBe("retry:1");
    expect(() => psql("SET ROLE service_role; DELETE FROM operational_daily_reports WHERE idempotency_key='synthetic-report-grants'")).toThrow();
    expect(() => psql(`SET ROLE service_role; INSERT INTO operational_daily_reports(recipient_user_id,recipient,period_from,period_to,idempotency_key,frozen_body)
      VALUES('report-grants-fixture','operator@example.test','2026-11-03T05:00Z','2026-11-04T05:00Z','synthetic-report-grants','{}')`)).toThrow();
    expect(psql("SELECT count(*) FROM operational_daily_reports")).toBe("1");
    expect(psql("SELECT count(*) FROM leads")).toBe("0");
  });

  it("does not rewrite owner defaults or unrelated predecessor permissions", () => {
    // Reproduce the underlying inherited-grant behavior on a disposable probe.
    // The narrowly corrected report ACL must not change the global default.
    expect(psql(`BEGIN; CREATE TABLE public.amm_qa_inherited_acl_probe(id integer);
      GRANT SELECT,INSERT,UPDATE ON public.amm_qa_inherited_acl_probe TO service_role;
      SELECT has_table_privilege('service_role','public.amm_qa_inherited_acl_probe','DELETE'); ROLLBACK;`)).toBe("t");
    expect(psql("SELECT has_table_privilege('service_role','leads','DELETE')")).toBe("t");
    expect(psql("SELECT to_regprocedure('capture_public_lead_v4(jsonb,jsonb,jsonb,text,jsonb)') IS NOT NULL")).toBe("t");
  });
});
