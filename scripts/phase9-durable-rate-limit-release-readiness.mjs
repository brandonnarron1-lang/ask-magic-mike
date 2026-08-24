#!/usr/bin/env node

import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const MODULE_URL = new URL(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(MODULE_URL)), "..");

export const RELEASE_AUTHORITY = Object.freeze({
  repository: "brandonnarron1-lang/ask-magic-mike",
  pr: 209,
  branch: "codex/phase9-controlled-release-candidate-20260823",
  baseBranch: "main",
  productionCommit: "b450b41c66c6740bd20571cdbe7d8caf82e92d5e",
  productionDeployment: "dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW",
  productionUrl: "https://www.askmagicmike.com",
  vercelScope: "eyes-up-industries",
  vercelOrgId: "team_OVg2uOSyJCpX100BPgb8nJK9",
  vercelProjectId: "prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8",
  vercelProjectName: "ask-magic-mike",
  requiredSecretName: "RATE_LIMIT_HASH_SECRET",
  requiredDatabaseName: "DATABASE_URL",
  exactGate:
    "APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT",
});

const SENSITIVE_KEY = /(SECRET|TOKEN|PASSWORD|PRIVATE|DATABASE_URL|API_KEY|BCC)/i;

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}: ${detail}` : code);
  error.code = code;
  error.safeDetail = detail;
  throw error;
}

export function parseArguments(argv) {
  let mode = "plan";
  let vercelCwd = process.env.AMM_VERCEL_PROJECT_CWD || "";

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--plan") {
      mode = "plan";
      continue;
    }
    if (argument === "--preflight") {
      mode = "preflight";
      continue;
    }
    if (argument === "--vercel-cwd") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail("vercel_cwd_value_missing");
      vercelCwd = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--vercel-cwd=")) {
      vercelCwd = argument.slice("--vercel-cwd=".length);
      if (!vercelCwd) fail("vercel_cwd_value_missing");
      continue;
    }
    if (argument === "--execute" || argument === "--merge" || argument === "--deploy") {
      fail("write_mode_not_supported");
    }
    fail("unknown_argument", argument);
  }

  return { mode, vercelCwd };
}

export function plan() {
  return {
    operation: "phase9_durable_rate_limit_release_readiness",
    mode: "read_only_rehearsal",
    mutates_production: false,
    writes_local_files: false,
    authority: {
      repository: RELEASE_AUTHORITY.repository,
      pull_request: RELEASE_AUTHORITY.pr,
      candidate_branch: RELEASE_AUTHORITY.branch,
      base_branch: RELEASE_AUTHORITY.baseBranch,
      current_production_commit: RELEASE_AUTHORITY.productionCommit,
      current_production_deployment: RELEASE_AUTHORITY.productionDeployment,
      vercel_project: RELEASE_AUTHORITY.vercelProjectName,
      vercel_project_id: RELEASE_AUTHORITY.vercelProjectId,
    },
    preflight_proves: [
      "local HEAD equals the live PR head and the worktree is clean",
      "PR base equals current origin/main and the recorded Production commit",
      "required GitHub and Vercel checks are successful",
      "the exact Ask Magic Mike Vercel project and rollback deployment are active",
      "the dedicated Production secret name is absent before cutover",
      "the encrypted Production database variable name is present",
      "the exact candidate Preview is Ready and its read-only Neon capability flags are true",
      "the current immutable Production health response remains on the pre-release contract",
      "no NellySelly project, alias, environment name, or deployment identity is in scope",
    ],
    proposed_approved_actions: [
      "generate one new high-entropy value directly into the Vercel encrypted Production interface",
      `create ${RELEASE_AUTHORITY.requiredSecretName} for Production only`,
      "merge only the revalidated PR head through the protected GitHub branch",
      "let the canonical Git integration build that exact merge commit",
      "verify both custom aliases, all durable-limiter booleans, one approved malformed analytics request, logs, and the nine-check monitor",
    ],
    prohibited_without_separate_authority: [
      "database migration or lead/event mutation",
      "email, SMS, Push, or consumer acknowledgment",
      "WordPress, DNS, marketing publication, paid media, or provider purchase",
      "NellySelly access or configuration",
      "deleting stale Upstash variables or any deployment",
    ],
    rollback: {
      first_action: `restore alias to ${RELEASE_AUTHORITY.productionDeployment}`,
      second_action:
        "after prior health is restored, remove only the newly added secret from future Production builds if required",
      preserve: "rate_limit_buckets, leads, events, notifications, consent, attribution, and audit records",
    },
    exact_gate: RELEASE_AUTHORITY.exactGate,
  };
}

function normalizeRepositoryRemote(raw) {
  const value = String(raw || "").trim();
  if (value.startsWith("git@github.com:")) {
    return value.slice("git@github.com:".length).replace(/\.git$/, "");
  }
  try {
    const url = new URL(value);
    if (url.hostname !== "github.com") return "";
    return url.pathname.replace(/^\//, "").replace(/\.git$/, "");
  } catch {
    return "";
  }
}

export function sanitizeVercelEnvironmentInventory(raw) {
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    fail("vercel_environment_inventory_invalid_json");
  }
  const records = Array.isArray(parsed)
    ? parsed
    : parsed?.envs || parsed?.environmentVariables || [];
  if (!Array.isArray(records)) fail("vercel_environment_inventory_invalid");

  return records.map((record) => {
    const key = String(record?.key || record?.name || "");
    const type = String(record?.type || "");
    const target = Array.isArray(record?.target)
      ? record.target.map(String)
      : Array.isArray(record?.environments)
        ? record.environments.map(String)
        : [];
    const valueWasReturned = Object.prototype.hasOwnProperty.call(record || {}, "value")
      && record.value !== undefined
      && record.value !== null;
    if (valueWasReturned && (type !== "plain" || SENSITIVE_KEY.test(key))) {
      fail("vercel_sensitive_value_returned", key || "unnamed");
    }
    return { key, type, target };
  });
}

export function deploymentIdFromChecks(checks) {
  const check = checks.find((item) =>
    item?.name === "Vercel"
    && item?.bucket === "pass"
    && typeof item?.link === "string"
    && item.link.includes("/ask-magic-mike/"));
  if (!check) fail("successful_vercel_check_missing");
  let identifier;
  try {
    identifier = new URL(check.link).pathname.split("/").filter(Boolean).at(-1);
  } catch {
    fail("vercel_check_link_invalid");
  }
  if (!identifier || !/^[A-Za-z0-9]+$/.test(identifier)) {
    fail("vercel_check_deployment_id_invalid");
  }
  return identifier.startsWith("dpl_") ? identifier : `dpl_${identifier}`;
}

function selectedHealth(body) {
  const source = body && typeof body === "object" ? body : {};
  return {
    database: source.database,
    rate_limit_required: source.rate_limit_required,
    rate_limit_table: source.rate_limit_table,
    rate_limit_schema_ready: source.rate_limit_schema_ready,
    rate_limit_permissions_ready: source.rate_limit_permissions_ready,
    rate_limit_rls_ready: source.rate_limit_rls_ready,
    rate_limit_store_ready: source.rate_limit_store_ready,
    rate_limit_secret_ready: source.rate_limit_secret_ready,
    rate_limit_ready: source.rate_limit_ready,
  };
}

export function validatePreflight(snapshot) {
  const environment = snapshot.vercel.environment;
  const previewHealth = snapshot.vercel.preview.health;
  const productionHealth = snapshot.vercel.production.health;
  const identityText = JSON.stringify({
    project: snapshot.vercel.project,
    preview: {
      id: snapshot.vercel.preview.id,
      name: snapshot.vercel.preview.name,
      url: snapshot.vercel.preview.url,
      aliases: snapshot.vercel.preview.aliases,
    },
    production: {
      id: snapshot.vercel.production.id,
      name: snapshot.vercel.production.name,
      url: snapshot.vercel.production.url,
      aliases: snapshot.vercel.production.aliases,
    },
    environment_keys: environment.keys,
  });

  const requiredChecks = new Map(
    snapshot.github.checks.map((check) => [check.name, check.bucket]),
  );
  const checks = {
    operation_read_only: snapshot.mutates_production === false,
    local_worktree_clean: snapshot.git.clean === true,
    canonical_repository: snapshot.git.repository === RELEASE_AUTHORITY.repository,
    local_head_is_pr_head: snapshot.git.head === snapshot.github.pr.headRefOid,
    current_candidate_branch:
      snapshot.github.pr.headRefName === RELEASE_AUTHORITY.branch,
    pr_open: snapshot.github.pr.state === "OPEN",
    pr_draft_safety: snapshot.github.pr.isDraft === true,
    pr_mergeable: snapshot.github.pr.mergeable === "MERGEABLE",
    pr_merge_state_clean: snapshot.github.pr.mergeStateStatus === "CLEAN",
    pr_base_branch:
      snapshot.github.pr.baseRefName === RELEASE_AUTHORITY.baseBranch,
    pr_base_is_remote_main:
      snapshot.github.pr.baseRefOid === snapshot.git.remote_main,
    production_commit_pinned:
      snapshot.git.remote_main === RELEASE_AUTHORITY.productionCommit,
    github_checks_all_pass:
      snapshot.github.checks.length > 0
      && snapshot.github.checks.every((check) => check.bucket === "pass"),
    release_gate_pass: requiredChecks.get("local-release-gate") === "pass",
    vercel_check_pass: requiredChecks.get("Vercel") === "pass",
    vercel_org: snapshot.vercel.project.orgId === RELEASE_AUTHORITY.vercelOrgId,
    vercel_project_id:
      snapshot.vercel.project.projectId === RELEASE_AUTHORITY.vercelProjectId,
    vercel_project_name:
      snapshot.vercel.project.projectName === RELEASE_AUTHORITY.vercelProjectName,
    preview_id_matches_check:
      snapshot.vercel.preview.id === snapshot.github.vercelDeploymentId,
    preview_project_name:
      snapshot.vercel.preview.name === RELEASE_AUTHORITY.vercelProjectName,
    preview_target: snapshot.vercel.preview.target === "preview",
    preview_ready: snapshot.vercel.preview.status === "READY",
    preview_database: previewHealth.database === "ready",
    preview_rate_limit_not_required: previewHealth.rate_limit_required === false,
    preview_rate_limit_table: previewHealth.rate_limit_table === true,
    preview_rate_limit_schema: previewHealth.rate_limit_schema_ready === true,
    preview_rate_limit_permissions:
      previewHealth.rate_limit_permissions_ready === true,
    preview_rate_limit_rls: previewHealth.rate_limit_rls_ready === true,
    preview_rate_limit_store: previewHealth.rate_limit_store_ready === true,
    preview_dedicated_secret_absent:
      previewHealth.rate_limit_secret_ready === false,
    preview_rate_limit_ready: previewHealth.rate_limit_ready === true,
    production_deployment_pinned:
      snapshot.vercel.production.id === RELEASE_AUTHORITY.productionDeployment,
    production_project_name:
      snapshot.vercel.production.name === RELEASE_AUTHORITY.vercelProjectName,
    production_target: snapshot.vercel.production.target === "production",
    production_ready: snapshot.vercel.production.status === "READY",
    production_www_alias:
      snapshot.vercel.production.aliases.includes("www.askmagicmike.com"),
    production_apex_alias:
      snapshot.vercel.production.aliases.includes("askmagicmike.com"),
    production_database_ready: productionHealth.database === "ready",
    production_old_contract:
      productionHealth.rate_limit_required === undefined
      && productionHealth.rate_limit_ready === undefined,
    production_database_variable:
      environment.keys.includes(RELEASE_AUTHORITY.requiredDatabaseName),
    production_database_variable_protected:
      environment.databaseType === "sensitive"
      || environment.databaseType === "encrypted",
    dedicated_secret_absent_before_cutover:
      environment.rateLimitHashSecretPresent === false,
    no_nellyselly_identity: !/nelly\s*selly|nellyselly/i.test(identityText),
  };

  const failures = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  if (failures.length) fail("durable_rate_limit_release_preflight_failed", failures.join(","));
  return checks;
}

async function run(program, args, cwd = ROOT) {
  try {
    const result = await execFile(program, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 45_000,
    });
    return String(result.stdout || "").trim();
  } catch {
    fail("read_only_command_failed", `${program}:${args[0] || "unknown"}`);
  }
}

async function readJsonCommand(program, args, cwd = ROOT) {
  const output = await run(program, args, cwd);
  try {
    return JSON.parse(output);
  } catch {
    fail("read_only_command_invalid_json", `${program}:${args[0] || "unknown"}`);
  }
}

async function readHealth(url) {
  let response;
  try {
    response = await fetch(url, {
      redirect: "manual",
      headers: {
        Accept: "application/json",
        "User-Agent": "AskMagicMike-Release-Readiness/1.0",
      },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    fail("production_health_request_failed");
  }
  if (response.status !== 200) fail("production_health_status_unexpected", String(response.status));
  try {
    return selectedHealth(await response.json());
  } catch {
    fail("production_health_invalid_json");
  }
}

async function linkedProject(vercelCwd) {
  const cwd = resolve(vercelCwd || ROOT);
  let raw;
  try {
    raw = await readFile(resolve(cwd, ".vercel", "project.json"), "utf8");
  } catch {
    fail("vercel_linked_cwd_required");
  }
  let project;
  try {
    project = JSON.parse(raw);
  } catch {
    fail("vercel_project_link_invalid");
  }
  return { cwd, project };
}

export async function collectPreflight({ vercelCwd = "" } = {}) {
  const linked = await linkedProject(vercelCwd);
  const [originRaw, head, statusRaw, mainRaw, pr, checks] = await Promise.all([
    run("git", ["config", "--get", "remote.origin.url"]),
    run("git", ["rev-parse", "HEAD"]),
    run("git", ["status", "--porcelain"]),
    run("git", ["ls-remote", "origin", "refs/heads/main"]),
    readJsonCommand("gh", [
      "pr", "view", String(RELEASE_AUTHORITY.pr),
      "--repo", RELEASE_AUTHORITY.repository,
      "--json",
      "number,state,isDraft,mergeable,mergeStateStatus,headRefName,headRefOid,baseRefName,baseRefOid,url",
    ]),
    readJsonCommand("gh", [
      "pr", "checks", String(RELEASE_AUTHORITY.pr),
      "--repo", RELEASE_AUTHORITY.repository,
      "--json", "name,state,bucket,link,workflow",
    ]),
  ]);
  const remoteMain = mainRaw.split(/\s+/)[0] || "";
  const vercelDeploymentId = deploymentIdFromChecks(checks);
  const [preview, production, environmentRaw, previewHealthRaw] = await Promise.all([
    readJsonCommand("vercel", [
      "inspect", vercelDeploymentId, "--format=json",
      "--scope", RELEASE_AUTHORITY.vercelScope,
    ], linked.cwd),
    readJsonCommand("vercel", [
      "inspect", RELEASE_AUTHORITY.productionUrl, "--format=json",
      "--scope", RELEASE_AUTHORITY.vercelScope,
    ], linked.cwd),
    run("vercel", [
      "env", "ls", "production", "--format=json",
      "--scope", RELEASE_AUTHORITY.vercelScope,
    ], linked.cwd),
    run("vercel", [
      "curl", "/api/health/ready", "--deployment", vercelDeploymentId,
      "--scope", RELEASE_AUTHORITY.vercelScope,
    ], linked.cwd),
  ]);
  const inventory = sanitizeVercelEnvironmentInventory(environmentRaw);
  let previewHealthBody;
  try {
    previewHealthBody = JSON.parse(previewHealthRaw);
  } catch {
    fail("preview_health_invalid_json");
  }
  const databaseVariable = inventory.find((item) =>
    item.key === RELEASE_AUTHORITY.requiredDatabaseName
    && item.target.includes("production"));
  const rateLimitHashSecretPresent = inventory.some((item) =>
    item.key === RELEASE_AUTHORITY.requiredSecretName
    && item.target.includes("production"));

  return {
    checked_at: new Date().toISOString(),
    mode: "read_only_preflight",
    mutates_production: false,
    git: {
      repository: normalizeRepositoryRemote(originRaw),
      head,
      clean: statusRaw === "",
      remote_main: remoteMain,
    },
    github: {
      pr,
      checks: checks.map(({ name, state, bucket, workflow }) => ({
        name,
        state,
        bucket,
        workflow,
      })),
      vercelDeploymentId,
    },
    vercel: {
      project: {
        projectId: linked.project.projectId,
        orgId: linked.project.orgId,
        projectName: linked.project.projectName,
      },
      environment: {
        inventoryCount: inventory.length,
        keys: inventory.map((item) => item.key),
        databaseType: databaseVariable?.type || "",
        rateLimitHashSecretPresent,
      },
      preview: {
        id: preview.id,
        name: preview.name,
        target: preview.target,
        status: preview.readyState || preview.status,
        url: preview.url,
        aliases: Array.isArray(preview.aliases) ? preview.aliases : [],
        health: selectedHealth(previewHealthBody),
      },
      production: {
        id: production.id,
        name: production.name,
        target: production.target,
        status: production.readyState || production.status,
        url: production.url,
        aliases: Array.isArray(production.aliases) ? production.aliases : [],
        health: await readHealth(`${RELEASE_AUTHORITY.productionUrl}/api/health/ready`),
      },
    },
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  if (args.mode === "plan") {
    console.log(JSON.stringify(plan(), null, 2));
    return;
  }
  const snapshot = await collectPreflight({ vercelCwd: args.vercelCwd });
  const checks = validatePreflight(snapshot);
  console.log(JSON.stringify({
    status: "READY_FOR_EXACT_GATE",
    checked_at: snapshot.checked_at,
    mutates_production: false,
    authority: plan().authority,
    exact_gate: RELEASE_AUTHORITY.exactGate,
    checks,
    evidence: {
      git_head: snapshot.git.head,
      remote_main: snapshot.git.remote_main,
      pull_request: snapshot.github.pr.number,
      github_checks: snapshot.github.checks,
      preview_deployment: snapshot.vercel.preview.id,
      production_deployment: snapshot.vercel.production.id,
      environment: {
        database_variable_present: snapshot.vercel.environment.keys.includes(
          RELEASE_AUTHORITY.requiredDatabaseName,
        ),
        dedicated_secret_present: snapshot.vercel.environment.rateLimitHashSecretPresent,
      },
      preview_health: snapshot.vercel.preview.health,
      production_health: snapshot.vercel.production.health,
    },
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(JSON.stringify({
      status: "BLOCKED",
      code: error?.code || "durable_rate_limit_release_readiness_failed",
      detail: error?.safeDetail || "",
      mutates_production: false,
    }, null, 2));
    process.exitCode = 1;
  });
}
