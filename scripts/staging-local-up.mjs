#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const RUN_DIR = path.join(ROOT, ".amm-run", "local-staging");
const SUMMARY_PATH = path.join(RUN_DIR, "start-summary.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    ...options,
  });
}

function countMigrations() {
  const dir = path.join(ROOT, "supabase", "migrations");
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const remoteLink = path.join(ROOT, "supabase", ".temp", "project-ref");
if (fs.existsSync(remoteLink)) {
  fail("Refusing local staging start: supabase/.temp/project-ref exists.");
}

const migrations = countMigrations();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "amm-local-staging-"));
const rawLog = path.join(tempDir, "supabase-start.log");
const startedAt = new Date().toISOString();

try {
  run("supabase", ["stop", "--no-backup"], {
    stdio: ["ignore", "ignore", "ignore"],
  });

  const logFd = fs.openSync(rawLog, "w", 0o600);
  const start = run("supabase", ["start", "--debug"], {
    stdio: ["ignore", logFd, logFd],
  });
  fs.closeSync(logFd);

  const completedAt = new Date().toISOString();
  const summary = {
    generated_at_utc: completedAt,
    target_environment: "local",
    remote_project_linked: false,
    supabase_start_exit_code: start.status,
    migrations_expected_count: migrations.length,
    final_repository_migration: migrations.at(-1)?.replace(/\.sql$/, ""),
    raw_supabase_output_printed: false,
    raw_supabase_output_persisted: false,
    provider_calls: 0,
    emails_sent: 0,
    sms_sent: 0,
    next_step: "Run pnpm run staging:local:verify.",
  };

  writeJson(SUMMARY_PATH, summary);

  if (start.status !== 0) {
    fail(
      `Local Supabase start failed. Sanitized summary written to ${SUMMARY_PATH}.`
    );
  }

  console.log(`Local staging started. Sanitized summary: ${SUMMARY_PATH}`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
