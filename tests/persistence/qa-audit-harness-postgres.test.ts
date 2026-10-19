// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addressCaptureMigration, install, launchIntakeMigration, psql, startDatabase, stopDatabase } from "../support/qa-audit-postgres";

// Exercise actual installations, not a mocked migration selector. Each case
// owns a disposable database pair through the existing native/Docker fixture.
const histories = [
  { name: "pre-repair audit", repair: false, excluded: [], v2: false, v3: false, v4: false, r2: false },
  { name: "excluded structured-address predecessor", repair: true, excluded: [addressCaptureMigration], v2: true, v3: false, v4: false, r2: false },
  { name: "excluded launch predecessor", repair: true, excluded: [launchIntakeMigration], v2: true, v3: true, v4: false, r2: false },
  { name: "complete installation", repair: true, excluded: [], v2: true, v3: true, v4: true, r2: true },
];

for (const history of histories) {
  describe.runIf(process.env.AMM_QA_POSTGRES_TEST === "1")(`historical harness: ${history.name}`, () => {
    beforeAll(async () => {
      await startDatabase();
      install("amm_qa_upgrade", history.repair, new Set(history.excluded));
    }, 120_000);
    afterAll(() => stopDatabase(), 20_000);

    it("omits only dependent successors and retains independent/full-install contracts", () => {
      expect(psql("SELECT current_database(),current_user,inet_server_addr() IS NULL")).toBe("amm_qa_upgrade|postgres|t");
      const observed = JSON.parse(psql(`SELECT jsonb_build_object(
        'v1',to_regprocedure('public.capture_public_lead_v1(jsonb,jsonb,jsonb,text)') IS NOT NULL,
        'v2',to_regprocedure('public.capture_public_lead_v2(jsonb,jsonb,jsonb,text,jsonb)') IS NOT NULL,
        'v3',to_regprocedure('public.capture_public_lead_v3(jsonb,jsonb,jsonb,text,jsonb)') IS NOT NULL,
        'v4',to_regprocedure('public.capture_public_lead_v4(jsonb,jsonb,jsonb,text,jsonb)') IS NOT NULL,
        'buyerInterest',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='buyer_interest'),
        'handoff',to_regprocedure('public.r2_handoff_context_v1(uuid,text)') IS NOT NULL,
        'sourceTable',to_regclass('public.intelligence_sources') IS NOT NULL,
        'sourceValidity',to_regprocedure('public.r2_sources_valid_v1(jsonb,text)') IS NOT NULL,
        'feedbackTable',to_regclass('public.intelligence_answer_feedback') IS NOT NULL,
        'feedbackSubmission',to_regprocedure('public.submit_r2_feedback_v1(uuid,integer,text,text,text,uuid,text,text,text,text)') IS NOT NULL,
        'independentWorkers',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_intelligence_jobs' AND column_name='r2_contract'),
        'independentConsumer',to_regclass('public.consumer_users') IS NOT NULL)`));
      expect(observed).toEqual({
        v1: true, v2: history.v2, v3: history.v3, v4: history.v4, buyerInterest: history.v4,
        handoff: history.r2, sourceTable: history.r2, sourceValidity: history.r2,
        feedbackTable: history.r2, feedbackSubmission: history.r2,
        independentWorkers: true, independentConsumer: true,
      });
    });
  });
}
