#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACCEPTED_PR121_SHA,
  PREDECESSOR_MIGRATION_FILE,
  PREDECESSOR_MIGRATION_VERSION,
  TARGET_MIGRATION_FILE,
  TARGET_MIGRATION_VERSION,
  assertLocalDatabaseTargets,
  assertLocalSupabaseCommand,
  assertPredecessorState,
  assertTargetState,
  exactProjectContainerNames,
  gitMetadata,
  readTargetObjectStatus,
  runPostMigrationCompatibilityAssertions,
  runPostMigrationRuntimeAssertions,
  runPreflightRehearsal,
  prepareCompatibilityFixtures,
  sanitizeSummary,
  sanitizedChildEnv,
  hasUnsafeSummaryContent,
} from "./pr121-preflight-rehearsal.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const REMOTE_LINK = path.join(ROOT, "supabase/.temp/project-ref");

class StageError extends Error {
  constructor(stage, code) {
    super(code);
    this.stage = stage;
    this.code = code;
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function defaultEvidenceDir(authoritative) {
  const prefix = authoritative ? `${timestamp()}-pr121-offline-release` : `pr121-offline-development-${timestamp()}`;
  return path.join(ROOT, ".amm-run", prefix);
}

function parseArgs(argv) {
  const options = { development: false, evidenceDir: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--development") {
      options.development = true;
    } else if (arg === "--evidence-dir") {
      options.evidenceDir = path.resolve(argv[index + 1]);
      index += 1;
    }
  }
  return {
    ...options,
    authoritative: !options.development,
    evidenceDir: options.evidenceDir ?? defaultEvidenceDir(!options.development),
  };
}

function run(command, args, options = {}) {
  assertLocalSupabaseCommand(command, args);
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
    env: sanitizedChildEnv(),
    ...options,
  });
  return {
    command: [command, ...args].join(" "),
    exitCode: result.status ?? 1,
    durationMs: Date.now() - startedAt,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function runRequired(command, args, name, steps) {
  console.log(`PR121 offline release: ${name}`);
  const result = run(command, args);
  steps.push({
    name,
    command: result.command,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
  });
  if (result.exitCode !== 0) {
    throw new StageError(name, `${name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_failed`);
  }
  return result;
}

function writeJson(file, value) {
  const sanitized = sanitizeSummary(value);
  if (hasUnsafeSummaryContent(sanitized)) throw new Error(`unsafe_summary_content:${path.basename(file)}`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(sanitized, null, 2)}\n`);
}

function migrationFiles() {
  return readdirSync(path.join(ROOT, "supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function projectId() {
  const config = run("sed", ["-n", "s/^project_id = \"\\(.*\\)\"/\\1/p", "supabase/config.toml"]);
  const id = config.stdout.trim();
  if (!id) throw new Error("local_project_id_missing");
  return id;
}

function stopLocalSupabase() {
  return run("supabase", ["stop", "--no-backup"], {
    stdio: ["ignore", "ignore", "ignore"],
  });
}

function runningProjectContainerCount(localProjectId) {
  const result = run("docker", ["ps", "--format", "{{.Names}}"]);
  if (result.exitCode !== 0) return null;
  return exactProjectContainerNames(result.stdout, localProjectId).length;
}

export function advisorsSummary(output) {
  try {
    const parsed = JSON.parse(output || "null");
    if (Array.isArray(parsed)) {
      return { parseStatus: "recognized", findingCount: parsed.length, errorFindingCount: parsed.length };
    }
    for (const key of ["lints", "advisors", "findings"]) {
      if (Array.isArray(parsed?.[key])) {
        return {
          parseStatus: "recognized",
          findingCount: parsed[key].length,
          errorFindingCount: parsed[key].length,
        };
      }
    }
  } catch {
    return { parseStatus: "unrecognized" };
  }
  return { parseStatus: "unrecognized" };
}

function writeReadinessMarkdown(file, summary) {
  const lines = [
    "# PR121 Offline Release Readiness",
    "",
    `Generated UTC: ${summary.generatedAt}`,
    `Authoritative: ${summary.authoritative ? "true" : "false"}`,
    `Branch: ${summary.branch}`,
    `HEAD: ${summary.head}`,
    `HEAD tree: ${summary.headTree}`,
    `Tracked worktree clean: ${summary.trackedWorktreeClean ? "true" : "false"}`,
    `Migration count: ${summary.migrationCount}`,
    `Target: ${summary.target}`,
    "",
    "## Results",
    "",
    `- Pre-migration preflight fixture matrix: ${summary.preflightPassed ? "PASS" : "FAIL"}`,
    `- Predecessor state verified: ${summary.predecessorStateVerified ? "PASS" : "FAIL"}`,
    `- Target migration transition: ${summary.targetMigrationApplied ? "PASS" : "FAIL"}`,
    `- Cutover compatibility assertions: ${summary.compatibilityPassed ? "PASS" : "FAIL"}`,
    `- Runtime replay/idempotency assertions: ${summary.runtimePassed ? "PASS" : "FAIL"}`,
    `- PostgreSQL contract test: ${summary.postgresContractPassed ? "PASS" : "FAIL"}`,
    `- Local Supabase lifecycle test: ${summary.supabaseLifecyclePassed ? "PASS" : "FAIL"}`,
    `- Schema lint: ${summary.schemaLintPassed ? "PASS" : "FAIL"}`,
    `- Security advisors: ${summary.securityAdvisorsPassed ? "PASS" : "FAIL"}`,
    `- Local Supabase stopped: ${summary.localSupabaseStopped ? "YES" : "NO"}`,
    "",
    "## Provenance",
    "",
    `- Accepted PR #121 SHA: ${summary.acceptedPr121Sha}`,
    `- Target migration blob SHA: ${summary.targetMigrationBlob}`,
    `- Corrected preflight blob SHA: ${summary.preflightScriptBlob}`,
    `- Executable fixture blob SHA: ${summary.fixtureFileBlob}`,
    "",
    "## Production Status",
    "",
    "- Remote preflight was not run.",
    "- Production credentials were not read or verified.",
    "- Production deployment is not authorized by this package.",
    "- Remote SQL was not applied.",
  ];
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${lines.join("\n")}\n`);
}

function provenance(metadata, authoritative, migrationCount) {
  return {
    authoritative,
    branch: metadata.branch,
    head: metadata.head,
    headParent: metadata.parent,
    headTree: metadata.tree,
    acceptedPr121Sha: ACCEPTED_PR121_SHA,
    trackedWorktreeClean: metadata.trackedWorktreeClean,
    targetMigration: TARGET_MIGRATION_FILE,
    targetMigrationVersion: TARGET_MIGRATION_VERSION,
    targetMigrationBlob: metadata.targetMigrationBlob,
    predecessorMigration: PREDECESSOR_MIGRATION_FILE,
    predecessorMigrationVersion: PREDECESSOR_MIGRATION_VERSION,
    preflightScriptBlob: metadata.preflightScriptBlob,
    fixtureFileBlob: metadata.fixtureFileBlob,
    ...(migrationCount === undefined ? {} : { migrationCount }),
    localOnlyTarget: true,
    remoteProjectLinked: false,
    productionChanges: 0,
    remoteSql: 0,
    providerCalls: 0,
  };
}

function writeFailureEvidence({ options, metadata, stage, code, steps, stopResult, remainingContainerCount }) {
  writeJson(path.join(options.evidenceDir, "failure-summary.json"), {
    schemaVersion: 2,
    ok: false,
    authoritative: false,
    generatedAt: new Date().toISOString(),
    failedStage: stage,
    failureCode: code,
    ...provenance(metadata, false),
    completedSteps: steps.map((step) => ({
      name: step.name,
      exitCode: step.exitCode,
      durationMs: step.durationMs,
    })),
    localStopResult: stopResult
      ? { exitCode: stopResult.exitCode, durationMs: stopResult.durationMs }
      : null,
    exactProjectRemainingContainerCount: remainingContainerCount,
    productionChanges: 0,
    remoteDatabaseChanges: 0,
    providerCalls: 0,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (existsSync(REMOTE_LINK)) throw new Error("remote_supabase_project_ref_present");
  assertLocalDatabaseTargets(process.env);

  const initialMetadata = gitMetadata();
  if (options.authoritative && !initialMetadata.trackedWorktreeClean) {
    throw new Error("authoritative_rehearsal_requires_clean_tracked_worktree");
  }

  mkdirSync(options.evidenceDir, { recursive: true });

  const steps = [];
  const migrations = migrationFiles();
  const localProjectId = projectId();
  const metadata = gitMetadata();
  const baseProvenance = provenance(metadata, options.authoritative, migrations.length);
  let failed = null;
  let stopResult = null;
  let remainingContainerCount = null;
  let predecessorState = null;
  let targetStateBefore = null;
  let targetStateAfter = null;
  let preflightSummary = null;
  let compatibilitySetup = null;
  let compatibilityRuntime = null;
  let runtimeSummary = null;
  let lint = null;
  let advisors = null;

  try {
    runRequired("pnpm", ["run", "staging:local:up"], "start/reset local Supabase", steps);
    runRequired(
      "supabase",
      ["db", "reset", "--local", "--version", PREDECESSOR_MIGRATION_VERSION, "--no-seed", "--yes"],
      "reset local database to predecessor migration",
      steps,
    );

    predecessorState = assertPredecessorState();
    targetStateBefore = readTargetObjectStatus();

    preflightSummary = await runPreflightRehearsal();
    compatibilitySetup = prepareCompatibilityFixtures();

    runRequired("supabase", ["migration", "up", "--local"], "apply pending local migrations", steps);
    targetStateAfter = assertTargetState();

    compatibilityRuntime = runPostMigrationCompatibilityAssertions();
    if (!compatibilityRuntime.passed) throw new StageError("cutover compatibility assertions", "cutover_compatibility_failed");

    runtimeSummary = runPostMigrationRuntimeAssertions();
    if (!runtimeSummary.passed) throw new StageError("runtime replay assertions", "runtime_replay_assertions_failed");

    runRequired("pnpm", ["run", "staging:local:up"], "reset to clean local state", steps);
    runRequired("pnpm", ["run", "test:postgres:infra02"], "postgres contract", steps);
    runRequired("pnpm", ["run", "test:supabase:infra02"], "local Supabase lifecycle", steps);
    lint = runRequired(
      "supabase",
      ["db", "lint", "--local", "--schema", "public", "--fail-on", "error"],
      "schema lint",
      steps,
    );
    advisors = runRequired(
      "supabase",
      ["db", "advisors", "--local", "--type", "security", "--level", "error", "--fail-on", "error", "--output", "json"],
      "security advisors",
      steps,
    );
  } catch (error) {
    failed = error instanceof StageError
      ? error
      : new StageError("unknown", error instanceof Error ? error.message : "unknown_failure");
  } finally {
    stopResult = stopLocalSupabase();
    steps.push({
      name: "stop local Supabase",
      command: "supabase stop --no-backup",
      exitCode: stopResult.exitCode,
      durationMs: stopResult.durationMs,
    });
    remainingContainerCount = runningProjectContainerCount(localProjectId);
    if (!failed && stopResult.exitCode !== 0) {
      failed = new StageError("stop local Supabase", "local_supabase_stop_failed");
    }
    if (!failed && remainingContainerCount !== 0) {
      failed = new StageError("verify local Supabase stopped", "local_supabase_containers_still_running");
    }
  }

  if (failed) {
    writeFailureEvidence({
      options,
      metadata,
      stage: failed.stage,
      code: failed.code,
      steps,
      stopResult,
      remainingContainerCount,
    });
    throw failed;
  }

  const generatedAt = new Date().toISOString();
  const advisorParse = advisorsSummary(advisors?.stdout || "");

  writeJson(path.join(options.evidenceDir, "preflight-summary.json"), {
    ...baseProvenance,
    ...preflightSummary,
    authoritative: options.authoritative,
  });

  writeJson(path.join(options.evidenceDir, "migration-rehearsal-summary.json"), {
    schemaVersion: 2,
    generatedAt,
    target: "local-only",
    ...baseProvenance,
    predecessorStateVerified: true,
    predecessorState,
    targetStateBefore,
    targetMigrationApplied: true,
    targetStateAfter,
    steps: steps.filter((step) =>
      [
        "start/reset local Supabase",
        "reset local database to predecessor migration",
        "apply pending local migrations",
        "reset to clean local state",
        "stop local Supabase",
      ].includes(step.name),
    ),
    productionChanges: 0,
    remoteDatabaseChanges: 0,
    providerCalls: 0,
  });

  writeJson(path.join(options.evidenceDir, "runtime-summary.json"), {
    schemaVersion: 2,
    generatedAt,
    target: "local-only",
    ...baseProvenance,
    compatibilityPreflight: compatibilitySetup.evaluations,
    compatibilityRuntime,
    runtimeSummary,
    productionChanges: 0,
    remoteDatabaseChanges: 0,
    providerCalls: 0,
  });

  const verificationSummary = {
    schemaVersion: 2,
    generatedAt,
    target: "local-only",
    ...baseProvenance,
    preflightPassed: preflightSummary?.passed === true,
    predecessorStateVerified: true,
    targetMigrationApplied: true,
    compatibilityPassed: compatibilityRuntime?.passed === true,
    runtimePassed: runtimeSummary?.passed === true,
    postgresContractPassed: steps.some((step) => step.name === "postgres contract" && step.exitCode === 0),
    supabaseLifecyclePassed: steps.some((step) => step.name === "local Supabase lifecycle" && step.exitCode === 0),
    schemaLintPassed: lint?.exitCode === 0,
    securityAdvisorsPassed: advisors?.exitCode === 0,
    securityAdvisors: advisorParse,
    localSupabaseStopped: remainingContainerCount === 0,
    exactProjectRemainingContainerCount: remainingContainerCount,
    steps,
    productionChanges: 0,
    remoteDatabaseChanges: 0,
    providerCalls: 0,
  };
  writeJson(path.join(options.evidenceDir, "verification-summary.json"), verificationSummary);

  writeReadinessMarkdown(path.join(options.evidenceDir, "release-readiness.md"), {
    generatedAt,
    target: "local-only",
    ...baseProvenance,
    preflightPassed: verificationSummary.preflightPassed,
    predecessorStateVerified: verificationSummary.predecessorStateVerified,
    targetMigrationApplied: verificationSummary.targetMigrationApplied,
    compatibilityPassed: verificationSummary.compatibilityPassed,
    runtimePassed: verificationSummary.runtimePassed,
    postgresContractPassed: verificationSummary.postgresContractPassed,
    supabaseLifecyclePassed: verificationSummary.supabaseLifecyclePassed,
    schemaLintPassed: verificationSummary.schemaLintPassed,
    securityAdvisorsPassed: verificationSummary.securityAdvisorsPassed,
    localSupabaseStopped: verificationSummary.localSupabaseStopped,
  });

  console.log(JSON.stringify({
    ok: true,
    authoritative: options.authoritative,
    evidenceDir: path.relative(ROOT, options.evidenceDir),
    branch: metadata.branch,
    head: metadata.head,
    headTree: metadata.tree,
    migrationCount: migrations.length,
    predecessorMigration: PREDECESSOR_MIGRATION_FILE,
    targetMigration: TARGET_MIGRATION_FILE,
  }, null, 2));
}

if (process.argv[1] === __filename) {
  try {
    await main();
  } catch (error) {
    console.error(`PR121 offline release rehearsal failed: ${error instanceof Error ? error.message : "unknown"}`);
    process.exitCode = 1;
  }
}
