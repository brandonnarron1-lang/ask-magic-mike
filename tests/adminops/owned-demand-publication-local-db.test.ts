import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync(
  "supabase/tests/owned_demand_publication_proofs_pg17.sql",
  "utf8",
);
const localVerifier = readFileSync("scripts/staging-local-verify.mjs", "utf8");

describe("owned-demand publication-proof PostgreSQL contract", () => {
  it("tests the actual service-role, browser-role, idempotency, and audit boundaries", () => {
    expect(contract).toContain("SET LOCAL ROLE service_role");
    expect(contract).toContain("SET LOCAL ROLE authenticated");
    expect(contract).toContain("idempotent_replay");
    expect(contract).toContain("growth.publication_proof_recorded");
    expect(contract).toContain("unapproved.example.test");
    expect(contract).toContain("external_mutation_performed");
    expect(contract).toContain("raw_copy_retained");
    expect(contract).toContain("'42501'");
  });

  it("proves append-only enforcement and rolls back all synthetic mutations", () => {
    expect(contract).toContain("owned_demand_publication_proofs_reject_change");
    expect(contract).toContain("'55000'");
    expect(contract).toContain("UPDATE public.owned_demand_publication_proofs");
    expect(contract).toContain("DELETE FROM public.owned_demand_publication_proofs");
    expect(contract).toMatch(/BEGIN;[\s\S]*ROLLBACK;/);
    expect(contract).toContain("INTERNAL_QA_LOCAL_ONLY");
  });

  it("is a required part of the isolated local staging verifier", () => {
    expect(localVerifier).toContain("owned_demand_publication_proofs_pg17.sql");
    expect(localVerifier).toContain("publication_proof_sql_passed");
    expect(localVerifier).toContain("publicationProof.status !== 0");
    expect(localVerifier).toContain("supabase/.temp/project-ref");
  });
});
