import { describe, expect, it, vi } from "vitest";
import {
  SCENARIOS,
  assertLocalDatabaseTargets,
  evaluateScenario,
  executeScenario,
  hasUnsafeSummaryContent,
  sanitizeSummary,
} from "../../scripts/release/pr121-preflight-rehearsal.mjs";

function scenario(name: string) {
  const found = SCENARIOS.find((entry) => entry.name === name);
  if (!found) throw new Error(`missing scenario ${name}`);
  return found;
}

function representativeActual(entry: (typeof SCENARIOS)[number]) {
  const preflightRows = entry.expectedPreflightTypes.map((identity_type) => ({
    identity_type,
    normalized_value: "synthetic-redacted",
    contact_count: 2,
    contact_ids: [],
  }));
  const supplemental =
    entry.expectedClassification === "idempotency_risk"
      ? { orphan_sessions: 1, changed_session_idempotency_risks: 0 }
      : entry.expectedClassification === "operator_review"
        ? { legacy_leads_without_contact: 1 }
        : {};
  return { preflightRows, supplemental };
}

describe("PR121 preflight rehearsal helpers", () => {
  it("refuses non-local database URLs without echoing the value", () => {
    const remoteUrl = ["postgres", "://user:secret@", "remote.invalid", ":5432/postgres"].join("");
    expect(() =>
      assertLocalDatabaseTargets({
        DATABASE_URL: remoteUrl,
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow("DATABASE_URL_must_point_to_localhost_for_offline_rehearsal");
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

  it("maps every fixture scenario to the expected classification", () => {
    for (const entry of SCENARIOS) {
      expect(evaluateScenario(entry, representativeActual(entry))).toMatchObject({
        scenario: entry.name,
        actualClassification: entry.expectedClassification,
        passed: true,
      });
    }
  });

  it("classifies clean data with no blocker", () => {
    expect(evaluateScenario(scenario("clean_baseline"), { preflightRows: [], supplemental: {} })).toMatchObject({
      actualClassification: "clean",
      passed: true,
    });
  });

  it("classifies cross-contact collisions as blockers", () => {
    for (const name of [
      "duplicate_normalized_email",
      "duplicate_normalized_phone",
      "split_identity_collision",
    ]) {
      const entry = scenario(name);
      expect(evaluateScenario(entry, representativeActual(entry))).toMatchObject({
        actualClassification: "contact_identity_blocker",
        passed: true,
      });
    }
  });

  it("does not misclassify same-contact repeated identity as a cross-contact blocker", () => {
    expect(evaluateScenario(scenario("same_contact_repeated_identity"), {
      preflightRows: [],
      supplemental: {},
    })).toMatchObject({
      actualClassification: "clean",
      passed: true,
    });
  });

  it("runs cleanup after success", async () => {
    const cleanup = vi.fn(async () => {});
    await expect(executeScenario({
      scenario: scenario("clean_baseline"),
      queryScenario: vi.fn(async () => ({ preflightRows: [], supplemental: {} })),
      cleanup,
    })).resolves.toMatchObject({ passed: true });

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("runs cleanup after failure and exits the scenario nonzero by throwing", async () => {
    const cleanup = vi.fn(async () => {});
    await expect(executeScenario({
      scenario: scenario("duplicate_normalized_email"),
      queryScenario: vi.fn(async () => ({ preflightRows: [], supplemental: {} })),
      cleanup,
    })).rejects.toThrow("preflight_fixture_mismatch:duplicate_normalized_email");

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("detects an expected/actual mismatch", () => {
    const result = evaluateScenario(scenario("duplicate_normalized_phone"), {
      preflightRows: [{ identity_type: "email" }],
      supplemental: {},
    });

    expect(result.passed).toBe(false);
    expect(result.actualPreflightTypes).toEqual(["email"]);
    expect(result.expectedPreflightTypes).toEqual(["phone"]);
  });
});
