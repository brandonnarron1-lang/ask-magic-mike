#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  externalMutationTotal,
  parseReleaseIntent,
  validateReleaseAuthorityPolicy,
} from "../lib/release-authority-receipt.mjs";

function fail(code) {
  throw new Error(code);
}

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) fail("release_intent_git_diff_failed");
  return result.stdout;
}

function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) fail("release_intent_github_event_missing");
  const event = JSON.parse(readFileSync(eventPath, "utf8"));
  const pull = event.pull_request;
  if (!pull) fail("release_intent_pull_request_event_required");

  const policy = validateReleaseAuthorityPolicy(
    JSON.parse(readFileSync("config/release-authority-policy.json", "utf8")),
  );
  const intent = parseReleaseIntent(pull.body);
  if (intent.ownerGate === "OWNER_GATE_AFTER_REVIEW") {
    fail("release_intent_owner_gate_unsealed");
  }
  if (
    externalMutationTotal(intent.externalMutations)
    > policy.approvalPolicy.automaticExternalMutationMaximum
  ) {
    fail("release_intent_external_mutation_requires_separate_process");
  }

  const baseSha = String(pull.base?.sha ?? "");
  const headSha = String(pull.head?.sha ?? "");
  if (!/^[0-9a-f]{40}$/.test(baseSha) || !/^[0-9a-f]{40}$/.test(headSha)) {
    fail("release_intent_pull_request_source_invalid");
  }
  const changed = git(["diff", "--name-status", `${baseSha}...${headSha}`])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [status, ...pathParts] = line.split("\t");
      return { status, path: pathParts.at(-1) ?? "" };
    });
  const migrations = changed.filter(({ path }) =>
    /^supabase\/migrations\/[^/]+\.sql$/.test(path),
  );
  if (migrations.some(({ status }) => status !== "A")) {
    fail("release_intent_existing_migration_modified_or_removed");
  }
  if (migrations.length !== intent.migrationCount) {
    fail("release_intent_migration_count_mismatch");
  }

  process.stdout.write(`${JSON.stringify({
    status: "valid",
    pr: pull.number,
    headSha,
    migrationCount: migrations.length,
    environmentChangeCount: intent.environmentChangeCount,
    externalMutationCount: externalMutationTotal(intent.externalMutations),
  })}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `release intent validation failed: ${error instanceof Error ? error.message : "unknown_error"}\n`,
  );
  process.exitCode = 1;
}
