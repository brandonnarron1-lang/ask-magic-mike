#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertLocalDatabaseTargets,
  hasUnsafeSummaryContent,
  runPreflightRehearsal,
  sanitizeSummary,
} from "./pr121-preflight-rehearsal.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const REMOTE_LINK = path.join(ROOT, "supabase/.temp/project-ref");

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function defaultEvidenceDir() {
  return path.join(ROOT, ".amm-run", `${timestamp()}-pr121-offline-release`);
}

function parseArgs(argv) {
  const options = { evidenceDir: defaultEvidenceDir() };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--evidence-dir") {
      options.evidenceDir = path.resolve(argv[index + 1]);
      index += 1;
    }
  }
  return options;
}

function run(command, args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
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

function runRequired(command, args, name, steps, options = {}) {
  console.log(`PR121 offline release: ${name}`);
  const result = run(command, args, options);
  steps.push({
    name,
    command: result.command,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
  });
  if (result.exitCode !== 0) {
    throw new Error(`${name}_failed`);
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

function stopLocalSupabase(steps) {
  const result = run("supabase", ["stop", "--no-backup"], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  steps.push({
    name: "stop local Supabase",
    command: "supabase stop --no-backup",
    exitCode: result.exitCode,
    durationMs: result.durationMs,
  });
}

function runningSupabaseContainerCount() {
  const result = run("docker", [
    "ps",
    "--filter",
    "name=supabase",
    "--format",
    "{{.Names}}",
  ]);
  if (result.exitCode !== 0) return null;
  return result.stdout.split("\n").filter(Boolean).length;
}

function runningNextProcessCount() {
  const result = run("ps", ["-axo", "pid,command"]);
  if (result.exitCode !== 0) return null;
  return result.stdout
    .split("\n")
    .filter((line) => /next (start|dev)|node .*next/.test(line))
    .filter((line) => !line.includes("pr121-offline-release"))
    .length;
}

function advisorsSummary(output) {
  try {
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed)) {
      return { findingCount: parsed.length, errorFindingCount: parsed.length };
    }
    if (Array.isArray(parsed?.lints)) {
      return { findingCount: parsed.lints.length, errorFindingCount: parsed.lints.length };
    }
  } catch {
    return { findingCount: null, errorFindingCount: null };
  }
  return { findingCount: null, errorFindingCount: null };
}

function writeReadinessMarkdown(file, summary) {
  const lines = [
    "# PR121 Offline Release Readiness",
    "",
    `Generated UTC: ${summary.generatedAt}`,
    `Branch: ${summary.branch}`,
    `HEAD: ${summary.head}`,
    `Target: ${summary.target}`,
    "",
    "## Results",
    "",
    `- Preflight fixture matrix: ${summary.preflightPassed ? "PASS" : "FAIL"}`,
    `- Migration chain verification: ${summary.migrationVerificationPassed ? "PASS" : "FAIL"}`,
    `- PostgreSQL contract test: ${summary.postgresContractPassed ? "PASS" : "FAIL"}`,
    `- Local Supabase lifecycle test: ${summary.supabaseLifecyclePassed ? "PASS" : "FAIL"}`,
    `- Schema lint: ${summary.schemaLintPassed ? "PASS" : "FAIL"}`,
    `- Security advisors: ${summary.securityAdvisorsPassed ? "PASS" : "FAIL"}`,
    `- Local Supabase stopped: ${summary.localSupabaseStopped ? "YES" : "NO"}`,
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const steps = [];
  const migrations = migrationFiles();
  mkdirSync(options.evidenceDir, { recursive: true });

  if (existsSync(REMOTE_LINK)) throw new Error("remote_supabase_project_ref_present");
  assertLocalDatabaseTargets(process.env);

  const branch = run("git", ["branch", "--show-current"]).stdout.trim();
  const head = run("git", ["rev-parse", "HEAD"]).stdout.trim();
  const localProjectIdConfigured = Boolean(projectId());

  let preflightSummary = null;
  let stagingVerify = null;
  let lint = null;
  let advisors = null;
  try {
    runRequired("pnpm", ["run", "staging:local:up"], "start/reset local Supabase", steps);
    stagingVerify = runRequired("pnpm", ["run", "staging:local:verify"], "verify migration chain", steps);

    preflightSummary = await runPreflightRehearsal({ evidenceDir: options.evidenceDir });

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
  } finally {
    stopLocalSupabase(steps);
  }

  const supabaseContainerCount = runningSupabaseContainerCount();
  const nextProcessCount = runningNextProcessCount();
  const localSupabaseStopped = supabaseContainerCount === 0;
  const temporaryNextProcessesStopped = nextProcessCount === 0;

  const generatedAt = new Date().toISOString();
  const migrationSummary = {
    schemaVersion: 1,
    generatedAt,
    target: "local-only",
    branch,
    head,
    localProjectIdConfigured,
    expectedMigrationCount: migrations.length,
    finalRepositoryMigration: migrations.at(-1),
    stagingVerificationPassed: stagingVerify?.exitCode === 0,
    steps: steps.filter((step) =>
      ["start/reset local Supabase", "verify migration chain", "reset to clean local state", "stop local Supabase"].includes(step.name),
    ),
    providerCalls: 0,
    productionChanges: 0,
    remoteDatabaseChanges: 0,
  };
  writeJson(path.join(options.evidenceDir, "migration-rehearsal-summary.json"), migrationSummary);

  const verificationSummary = {
    schemaVersion: 1,
    generatedAt,
    target: "local-only",
    branch,
    head,
    preflightPassed: preflightSummary?.passed === true,
    postgresContractPassed: steps.some((step) => step.name === "postgres contract" && step.exitCode === 0),
    supabaseLifecyclePassed: steps.some((step) => step.name === "local Supabase lifecycle" && step.exitCode === 0),
    schemaLintPassed: lint?.exitCode === 0,
    securityAdvisorsPassed: advisors?.exitCode === 0,
    securityAdvisors: advisorsSummary(advisors?.stdout || ""),
    localSupabaseStopped,
    runningSupabaseContainerCount: supabaseContainerCount,
    temporaryNextProcessesStopped,
    runningNextProcessCount: nextProcessCount,
    steps,
    providerCalls: 0,
    productionChanges: 0,
    remoteDatabaseChanges: 0,
  };
  writeJson(path.join(options.evidenceDir, "verification-summary.json"), verificationSummary);

  const readiness = {
    generatedAt,
    branch,
    head,
    target: "local-only",
    preflightPassed: verificationSummary.preflightPassed,
    migrationVerificationPassed: migrationSummary.stagingVerificationPassed,
    postgresContractPassed: verificationSummary.postgresContractPassed,
    supabaseLifecyclePassed: verificationSummary.supabaseLifecyclePassed,
    schemaLintPassed: verificationSummary.schemaLintPassed,
    securityAdvisorsPassed: verificationSummary.securityAdvisorsPassed,
    localSupabaseStopped,
  };
  writeReadinessMarkdown(path.join(options.evidenceDir, "release-readiness.md"), readiness);

  if (!localSupabaseStopped) throw new Error("local_supabase_containers_still_running");
  if (!temporaryNextProcessesStopped) throw new Error("temporary_next_processes_still_running");

  console.log(JSON.stringify({
    ok: true,
    evidenceDir: path.relative(ROOT, options.evidenceDir),
    branch,
    head,
    migrationCount: migrations.length,
    finalRepositoryMigration: migrations.at(-1),
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
