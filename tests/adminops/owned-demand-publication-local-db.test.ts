import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveOwnedDemandPlacement } from "../../app/lib/growth/owned-demand";

const contract = readFileSync(
  "supabase/tests/owned_demand_publication_proofs_pg17.sql",
  "utf8",
);
const wordpressScopeMigration = readFileSync(
  "supabase/migrations/20260822195000_owned_demand_wordpress_proof_scope.sql",
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

  it("executes every canonical WordPress placement against the additive database contract", () => {
    for (const marker of [
      "ourtown_wordpress",
      "wordpress_homepage_ask_mike",
      "wordpress_home_value_page",
      "wordpress_we_buy_homes",
      "wordpress_mike_agent_page",
      "wordpress_listing_buyer",
      "wordpress_rental_to_homeownership",
      "wordpress_ask_magic_mike_embed",
    ]) {
      expect(wordpressScopeMigration).toContain(marker);
      expect(contract).toContain(marker);
    }
    expect(wordpressScopeMigration).toContain("ourtownproperties\\.com");
    expect(wordpressScopeMigration).toContain("NOT VALID");
    expect(wordpressScopeMigration).toContain("VALIDATE CONSTRAINT");
    expect(contract).toContain("version = '20260822195000'");
    expect(contract).toContain("WordPress proof rejects a foreign evidence host");
    expect(contract).toContain("non-WordPress channels reject WordPress-only placements");
    expect(wordpressScopeMigration).toContain("channel_key <> 'ourtown_wordpress'");
    expect(contract).toContain("WHERE channel_key = 'ourtown_wordpress'");
  });

  it("keeps the application resolver and database WordPress tuples identical", () => {
    const placementKeys = [
      "general_question",
      "seller_review",
      "buyer_match",
      "renter_plan",
      "wordpress_homepage_ask_mike",
      "wordpress_home_value",
      "wordpress_we_buy_homes",
      "wordpress_mike_agent",
      "wordpress_listing_buyer",
      "wordpress_rental_to_homeownership",
      "wordpress_ask_magic_mike_embed",
    ];

    for (const placementKey of placementKeys) {
      const placement = resolveOwnedDemandPlacement(
        "ourtown_wordpress",
        placementKey,
      );
      expect(placement).not.toBeNull();
      expect(wordpressScopeMigration).toContain(
        `placement_key = '${placementKey}' AND utm_content = '${placement?.content}'`,
      );
    }
  });

  it("is a required part of the isolated local staging verifier", () => {
    expect(localVerifier).toContain("owned_demand_publication_proofs_pg17.sql");
    expect(localVerifier).toContain("publication_proof_sql_passed");
    expect(localVerifier).toContain("publicationProof.status !== 0");
    expect(localVerifier).toContain("supabase/.temp/project-ref");
  });
});
