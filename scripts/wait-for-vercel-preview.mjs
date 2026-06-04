#!/usr/bin/env node
/**
 * Wait for a Vercel preview deployment that matches the *current*
 * branch and commit.
 *
 * Why: `vercel ls` returns the latest Ready deployment, but that may
 * predate your most recent push. This poller is the only way to know
 * the URL you are about to test is built from the commit you wrote.
 *
 * Behaviour:
 *   - Reads current git commit + branch (unless overridden via env).
 *   - Polls `vercel ls --format json --environment preview`.
 *   - Accepts a deployment when:
 *       state === "READY"
 *       AND meta.githubCommitRef === current branch (unless BRANCH_FILTER set)
 *       AND meta.githubCommitSha startsWith currentSha OR currentSha startsWith meta sha
 *   - Default interval: 10s, default timeout: 600s (10min).
 *
 * Emits JSON. Never guesses. On timeout or CLI failure, emits a
 * deterministic error envelope with manual commands.
 */

import { spawnSync } from "node:child_process";

const PROJECT = process.env.VERCEL_PROJECT ?? "ask-magic-mike";
const SCOPE = process.env.VERCEL_SCOPE ?? "eyes-up-industries";
const BIN = process.env.VERCEL_BIN ?? "vercel";
const BRANCH_FILTER = process.env.BRANCH_FILTER ?? null;
const COMMIT_SHA_OVERRIDE = process.env.COMMIT_SHA ?? null;
const TIMEOUT_S = Number(process.env.PREVIEW_WAIT_TIMEOUT_SECONDS ?? "600");
const INTERVAL_S = Number(process.env.PREVIEW_WAIT_INTERVAL_SECONDS ?? "10");

const MANUAL_COMMANDS = [
  `Confirm Vercel CLI is on PATH: '${BIN} --version'.`,
  `Authenticate: '${BIN} login'.`,
  `Link project once: '${BIN} link --project ${PROJECT} --scope ${SCOPE}'.`,
  `Inspect deployments: '${BIN} ls ${PROJECT} --scope ${SCOPE} --format json --environment preview'.`,
  `Set PREVIEW_URL manually from the deployment whose meta.githubCommitSha matches HEAD.`,
];

function git(args) {
  const r = spawnSync("git", args, { encoding: "utf8" });
  return (r.stdout ?? "").trim();
}

function resolveBranchAndSha() {
  const branch = BRANCH_FILTER ?? git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const sha = (COMMIT_SHA_OVERRIDE ?? git(["rev-parse", "HEAD"])).toLowerCase();
  return { branch, sha };
}

/**
 * Decide whether a single deployment record from `vercel ls --format json`
 * matches the target branch + commit.
 *
 * SHA matching is lenient on length so abbreviated commit refs from
 * `git rev-parse --short` also match the full SHA from Vercel.
 *
 * Exported for unit tests.
 */
export function matchesDeployment(deployment, target) {
  if (!deployment || deployment.state !== "READY") return false;
  const branch = deployment.meta?.githubCommitRef ?? null;
  const sha = (deployment.meta?.githubCommitSha ?? "").toLowerCase();
  if (target.branch && branch !== target.branch) return false;
  if (!sha) return false;
  const tSha = String(target.sha ?? "").toLowerCase();
  if (!tSha) return false;
  // Either is a prefix of the other.
  return sha.startsWith(tSha) || tSha.startsWith(sha);
}

/**
 * Walk a `vercel ls --format json` envelope looking for the first
 * deployment that matches the target. Returns the picked deployment or
 * null. Exported for unit tests.
 */
export function pickMatchingDeployment(parsed, target) {
  if (!parsed || !Array.isArray(parsed.deployments)) return null;
  for (const d of parsed.deployments) {
    if (matchesDeployment(d, target)) return d;
  }
  return null;
}

function emit(ok, extras = {}) {
  const out = {
    ok,
    project: PROJECT,
    scope: SCOPE,
    ...extras,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(out, null, 2));
  process.exit(ok ? 0 : 1);
}

function fetchVercelJson() {
  const r = spawnSync(
    BIN,
    [
      "ls",
      PROJECT,
      "--scope",
      SCOPE,
      "--format",
      "json",
      "--environment",
      "preview",
    ],
    { encoding: "utf8", timeout: 30_000 }
  );
  if (r.error) {
    return { ok: false, error: r.error.message };
  }
  if (r.status !== 0) {
    return {
      ok: false,
      error: `vercel ls exited ${r.status}`,
      stderr: (r.stderr ?? "").trim().slice(0, 400),
    };
  }
  try {
    return { ok: true, data: JSON.parse(r.stdout ?? "{}") };
  } catch (err) {
    return { ok: false, error: `vercel ls JSON parse: ${err.message}` };
  }
}

async function sleep(seconds) {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function main() {
  const target = resolveBranchAndSha();
  if (!target.sha) {
    emit(false, {
      error: "could not determine current commit SHA",
      manual_commands: MANUAL_COMMANDS,
    });
    return;
  }

  const startedAt = Date.now();
  let lastError = null;

  while (true) {
    const elapsedS = Math.round((Date.now() - startedAt) / 1000);
    if (elapsedS >= TIMEOUT_S) {
      emit(false, {
        error:
          "timed out waiting for preview deployment matching branch + commit",
        branch: target.branch,
        commit_sha: target.sha.slice(0, 12),
        waited_seconds: elapsedS,
        last_error: lastError,
        manual_commands: MANUAL_COMMANDS,
      });
      return;
    }

    const r = fetchVercelJson();
    if (!r.ok) {
      lastError = r.error;
      // CLI is missing/auth-broken — no point retrying for 10 minutes.
      if (
        /not installed|ENOENT|authenticate|please login/i.test(r.error ?? "")
      ) {
        emit(false, {
          error: r.error,
          branch: target.branch,
          commit_sha: target.sha.slice(0, 12),
          manual_commands: MANUAL_COMMANDS,
        });
        return;
      }
    } else {
      const picked = pickMatchingDeployment(r.data, target);
      if (picked) {
        const host = String(picked.url ?? "");
        const url = host.startsWith("http") ? host : `https://${host}`;
        emit(true, {
          preview_url: url,
          branch: picked.meta?.githubCommitRef ?? target.branch,
          commit_sha: (picked.meta?.githubCommitSha ?? target.sha).slice(0, 12),
          deployment_state: picked.state,
          waited_seconds: elapsedS,
        });
        return;
      }
    }

    // eslint-disable-next-line no-console
    console.error(
      `waiting for preview… branch=${target.branch} sha=${target.sha.slice(
        0,
        7
      )} elapsed=${elapsedS}s`
    );
    await sleep(INTERVAL_S);
  }
}

const isDirect = import.meta.url === `file://${process.argv[1]}`;
if (isDirect) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("FATAL", err);
    process.exit(2);
  });
}
