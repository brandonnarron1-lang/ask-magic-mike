#!/usr/bin/env node
/**
 * Find the latest Ready Vercel preview deployment for this project.
 *
 * Strategy:
 *   1. Try `vercel ls <project> --scope <scope> --format json --environment preview`.
 *   2. Parse the JSON envelope `{ deployments: [...] }`.
 *   3. Pick the first entry whose `state === "READY"`. Optionally filter
 *      by `meta.githubCommitRef === BRANCH_FILTER` when set.
 *   4. Emit JSON to stdout.
 *
 * Falls back to text parsing if `--format json` is not supported by the
 * installed CLI (older versions). Never guesses.
 *
 * Usage:
 *   npm run preview:find
 *
 * Optional env:
 *   VERCEL_PROJECT   default "ask-magic-mike"
 *   VERCEL_SCOPE     default "eyes-up-industries"
 *   VERCEL_BIN       default "vercel"
 *   BRANCH_FILTER    if set, only consider deployments built from this branch
 */

import { spawnSync } from "node:child_process";

const PROJECT = process.env.VERCEL_PROJECT ?? "ask-magic-mike";
const SCOPE = process.env.VERCEL_SCOPE ?? "eyes-up-industries";
const BIN = process.env.VERCEL_BIN ?? "vercel";
const BRANCH_FILTER = process.env.BRANCH_FILTER ?? null;

const MANUAL_COMMANDS = [
  `Ensure the Vercel CLI is installed and on PATH: 'npm i -g vercel' or 'brew install vercel-cli'.`,
  `Authenticate: '${BIN} login' (one-time per machine).`,
  `Link this project once: '${BIN} link --project ${PROJECT} --scope ${SCOPE}'.`,
  `Run manually to inspect: '${BIN} ls ${PROJECT} --scope ${SCOPE} --format json --environment preview'.`,
  `Set PREVIEW_URL by hand from the latest Ready Preview deployment.`,
];

function emit(ok, extras = {}) {
  const out = {
    ok,
    project: PROJECT,
    scope: SCOPE,
    branch_filter: BRANCH_FILTER,
    ...extras,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(out, null, 2));
  process.exit(ok ? 0 : 1);
}

/**
 * Parse the JSON envelope emitted by `vercel ls --format json`. Optional
 * `branchFilter` narrows to deployments built from a given branch
 * (matches `meta.githubCommitRef`).
 *
 * Returns `{ url, state, branch, commit_sha, created_at } | null`.
 */
export function pickReadyPreview(parsed, branchFilter = null) {
  if (!parsed || !Array.isArray(parsed.deployments)) return null;
  // The CLI returns newest-first. We pick the first READY deployment
  // that matches the branch filter if one is given.
  for (const d of parsed.deployments) {
    if (d.state !== "READY") continue;
    const branch = d.meta?.githubCommitRef ?? null;
    if (branchFilter && branch !== branchFilter) continue;
    const host = String(d.url ?? "");
    if (!host) continue;
    return {
      url: host.startsWith("http") ? host : `https://${host}`,
      state: d.state,
      branch,
      commit_sha: d.meta?.githubCommitSha ?? null,
      created_at: d.createdAt ?? null,
    };
  }
  return null;
}

/**
 * Fallback parser for the row-based `vercel ls` table output, which
 * older CLI versions emit. Returns the first row whose Status is
 * "Ready" and Environment is "Preview".
 */
export function parseVercelLsOutput(text) {
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!trimmed.includes("https://")) continue;
    const cleaned = trimmed.replace(/●/g, " ").replace(/\s+/g, " ");
    const tokens = cleaned.split(" ");
    const urlIdx = tokens.findIndex((t) => t.startsWith("https://"));
    if (urlIdx === -1) continue;
    const url = tokens[urlIdx];
    const status = tokens[urlIdx + 1] ?? "";
    const env = tokens[urlIdx + 2] ?? "";
    if (status === "Ready" && env === "Preview") {
      return { url, status, env };
    }
  }
  return null;
}

function main() {
  // Primary: JSON mode.
  const jsonRun = spawnSync(
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
    { encoding: "utf8", timeout: 20_000 }
  );

  if (jsonRun.error) {
    emit(false, {
      error:
        jsonRun.error.code === "ENOENT"
          ? "Vercel CLI not installed or not on PATH"
          : jsonRun.error.message,
      manual_commands: MANUAL_COMMANDS,
    });
    return;
  }

  if (jsonRun.status === 0 && (jsonRun.stdout ?? "").trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(jsonRun.stdout);
      const pick = pickReadyPreview(parsed, BRANCH_FILTER);
      if (pick) {
        emit(true, {
          preview_url: pick.url,
          source: "vercel_ls_json",
          deployment_state: pick.state,
          branch: pick.branch,
          commit_sha: pick.commit_sha,
          created_at: pick.created_at,
        });
        return;
      }
    } catch {
      // fall through to text-mode fallback
    }
  }

  // Fallback: text table mode (older CLIs).
  const textRun = spawnSync(BIN, ["ls", PROJECT, "--scope", SCOPE], {
    encoding: "utf8",
    timeout: 20_000,
  });

  if (textRun.status === 0) {
    const picked = parseVercelLsOutput(textRun.stdout ?? "");
    if (picked) {
      emit(true, {
        preview_url: picked.url,
        source: "vercel_ls_text",
        deployment_state: picked.status,
      });
      return;
    }
  }

  emit(false, {
    error:
      "no Ready Preview deployment found. JSON exit=" +
      jsonRun.status +
      " text exit=" +
      textRun.status,
    stderr: ((jsonRun.stderr ?? "") + (textRun.stderr ?? ""))
      .trim()
      .slice(0, 400),
    manual_commands: MANUAL_COMMANDS,
  });
}

// Only run main() when invoked directly, so the parsers can be unit-tested.
const isDirect = import.meta.url === `file://${process.argv[1]}`;
if (isDirect) main();
