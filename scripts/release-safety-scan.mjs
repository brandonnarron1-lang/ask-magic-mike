#!/usr/bin/env node
/**
 * Static release-safety scanner.
 *
 * Runs against the on-disk source tree (no network, no preview).
 * Fails fast on:
 *
 *   A. Secret exposure — process.env.ADMIN_SECRET / SUPABASE_SERVICE_ROLE_KEY
 *      / TWILIO_AUTH_TOKEN / EMAIL_API_KEY / CRON_SECRET read inside a
 *      client component (`"use client"` directive at the top).
 *
 *   B. Public-side MLS private-field leak — `agent_remarks`, `lockbox_info`,
 *      `showing_instructions`, `compensation`, `owner_notes`,
 *      `internal_notes`, `private_remarks`, `broker_notes` referenced
 *      in a *public* API route (anything under src/app/api that is NOT
 *      under src/app/api/admin/) or in any marketing-generation path.
 *      The sanitizer + CSV importer + tests are explicitly allowlisted.
 *
 *   C. Widget wiring — `MagicMikeWidgetController` must have at least
 *      one consumer outside its own file. Same for
 *      `MagicMikeWidgetFloating`. `/value` must import `MagicMikeWidgetFloating`.
 *      `/widget-preview` must import `MagicMikeWidgetController` or
 *      `MagicMikeWidgetFloating`.
 *
 *   D. Public listing whitelist — `/api/listings/search/route.ts` and
 *      `/api/listings/[id]/route.ts` must both reference
 *      `PUBLIC_FIELD_NAMES`.
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — at least one failure
 *
 * Run:
 *   node scripts/release-safety-scan.mjs
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, relative, join } from "node:path";

const REPO_ROOT = resolve(".");
const SRC = join(REPO_ROOT, "src");

/** @type {Array<{check: string; file?: string; line?: number; message: string}>} */
const failures = [];
const passes = [];

function fail(check, message, file, line) {
  failures.push({ check, file, line, message });
}
function pass(check, message) {
  passes.push({ check, message });
}

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      await walk(full, out);
    } else if (/\.(ts|tsx|mjs|js|jsx)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

const SECRET_VAR_NAMES = [
  "ADMIN_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TWILIO_AUTH_TOKEN",
  "EMAIL_API_KEY",
  "CRON_SECRET",
];

async function readWithMeta(file) {
  const text = await readFile(file, "utf8");
  const isClient =
    /^\s*["']use client["']\s*;?/m.test(text.split("\n").slice(0, 5).join("\n"));
  return { text, isClient };
}

/** A — secret exposure inside client components */
async function checkSecretExposure(files) {
  for (const file of files) {
    const { text, isClient } = await readWithMeta(file);
    if (!isClient) continue;
    for (const name of SECRET_VAR_NAMES) {
      const rx = new RegExp(`process\\.env\\.${name}\\b`);
      const m = text.match(rx);
      if (m) {
        const line = text.slice(0, text.indexOf(m[0])).split("\n").length;
        fail(
          "A. secret_exposure",
          `process.env.${name} read inside client component`,
          relative(REPO_ROOT, file),
          line
        );
      }
    }
    // NEXT_PUBLIC_*SECRET variants — anything with SECRET in the public-prefix
    // is a deploy-time mistake.
    const pubSecret = text.match(/process\.env\.NEXT_PUBLIC_[A-Z0-9_]*SECRET\b/);
    if (pubSecret) {
      fail(
        "A. secret_exposure",
        `${pubSecret[0]} — NEXT_PUBLIC_* secrets are shipped to the client`,
        relative(REPO_ROOT, file)
      );
    }
  }
  pass(
    "A. secret_exposure",
    `checked ${files.length} files for client-side secret reads`
  );
}

const PRIVATE_LISTING_FIELDS = [
  "agent_remarks",
  "lockbox_info",
  "showing_instructions",
  "compensation",
  "owner_notes",
  "internal_notes",
  "private_remarks",
  "broker_notes",
];

const PRIVATE_LISTING_ALLOWLIST = [
  "src/lib/compliance/listing-sanitizer.ts",
  "src/lib/adapters/listing-csv-provider.ts",
  "src/lib/engines/listing-match.ts", // doc-only refs
  "src/schemas/listing.schema.ts",
];

/** B — private MLS field leak inside *public* (non-admin) API routes */
async function checkPrivateFieldLeak(files) {
  for (const file of files) {
    const rel = relative(REPO_ROOT, file);
    // Public API routes only — admin routes legitimately handle these.
    const isPublicApi =
      rel.startsWith("src/app/api/") && !rel.startsWith("src/app/api/admin/");
    if (!isPublicApi) continue;
    const { text } = await readWithMeta(file);
    // Strip line comments + block comments before scanning.
    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const field of PRIVATE_LISTING_FIELDS) {
      if (new RegExp(`\\b${field}\\b`).test(stripped)) {
        fail(
          "B. private_listing_field_leak",
          `private field "${field}" referenced in public API route`,
          rel
        );
      }
    }
  }

  // Marketing-engine receives only sanitized public listings — assert the
  // sanitizer is the only entry point that names the private fields outside
  // the allowlist + tests.
  for (const file of files) {
    const rel = relative(REPO_ROOT, file);
    if (PRIVATE_LISTING_ALLOWLIST.includes(rel)) continue;
    if (rel.startsWith("tests/")) continue;
    if (!rel.startsWith("src/lib/engines/marketing-assets")) continue;
    const { text } = await readWithMeta(file);
    for (const field of PRIVATE_LISTING_FIELDS) {
      const rx = new RegExp(`\\b${field}\\b`);
      const stripped = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
      if (rx.test(stripped)) {
        fail(
          "B. private_listing_field_leak",
          `marketing engine references private field "${field}"`,
          rel
        );
      }
    }
  }
  pass(
    "B. private_listing_field_leak",
    `scanned public API + marketing engine for private MLS fields`
  );
}

/** C — widget wiring */
async function checkWidgetWiring(files) {
  const consumers = {
    MagicMikeWidgetController: 0,
    MagicMikeWidgetFloating: 0,
  };
  let valueHasFloating = false;
  let previewHasControllerOrFloating = false;
  for (const file of files) {
    const rel = relative(REPO_ROOT, file);
    // Skip the components' own definition files when counting consumers.
    if (rel.endsWith("magic-mike-widget-controller.tsx")) continue;
    if (rel.endsWith("magic-mike-widget-floating.tsx")) continue;
    const text = await readFile(file, "utf8");
    if (text.includes("MagicMikeWidgetController"))
      consumers.MagicMikeWidgetController += 1;
    if (text.includes("MagicMikeWidgetFloating"))
      consumers.MagicMikeWidgetFloating += 1;
    if (
      rel.endsWith("src/components/campaign/value-hero.tsx") &&
      text.includes("MagicMikeWidgetFloating")
    ) {
      valueHasFloating = true;
    }
    if (
      rel.endsWith("src/app/widget-preview/page.tsx") &&
      (text.includes("MagicMikeWidgetController") ||
        text.includes("MagicMikeWidgetFloating"))
    ) {
      previewHasControllerOrFloating = true;
    }
  }
  if (consumers.MagicMikeWidgetController === 0) {
    fail(
      "C. widget_wiring",
      "MagicMikeWidgetController has no consumers — it's a ghost component"
    );
  }
  if (consumers.MagicMikeWidgetFloating === 0) {
    fail(
      "C. widget_wiring",
      "MagicMikeWidgetFloating has no consumers — it's a ghost component"
    );
  }
  if (!valueHasFloating) {
    fail(
      "C. widget_wiring",
      "/value (value-hero.tsx) does not import or render MagicMikeWidgetFloating"
    );
  }
  if (!previewHasControllerOrFloating) {
    fail(
      "C. widget_wiring",
      "/widget-preview does not import or render MagicMikeWidgetController/Floating"
    );
  }
  pass(
    "C. widget_wiring",
    `controller ${consumers.MagicMikeWidgetController} consumer(s); floating ${consumers.MagicMikeWidgetFloating}`
  );
}

/** D — public listing whitelist */
async function checkPublicListingWhitelist() {
  const required = [
    "src/app/api/listings/search/route.ts",
    "src/app/api/listings/[id]/route.ts",
  ];
  for (const rel of required) {
    const full = join(REPO_ROOT, rel);
    try {
      const text = await readFile(full, "utf8");
      if (!text.includes("PUBLIC_FIELD_NAMES")) {
        fail(
          "D. public_listing_whitelist",
          `${rel} does not reference PUBLIC_FIELD_NAMES`
        );
      }
    } catch (err) {
      fail("D. public_listing_whitelist", `${rel} missing (${err.message})`);
    }
  }
  pass(
    "D. public_listing_whitelist",
    "/api/listings/search + /api/listings/[id] both reference PUBLIC_FIELD_NAMES"
  );
}

/** E — preview QA runner handles Vercel protection bypass safely */
async function checkPreviewQaBypassPlumbing() {
  const path = "scripts/preview-qa.mjs";
  let text;
  try {
    text = await readFile(join(REPO_ROOT, path), "utf8");
  } catch (err) {
    fail(
      "E. preview_qa_bypass",
      `${path} missing (${err.message})`
    );
    return;
  }
  if (!text.includes("x-vercel-protection-bypass")) {
    fail(
      "E. preview_qa_bypass",
      `${path} does not reference x-vercel-protection-bypass header`
    );
  }
  if (!text.includes("redactSecrets") && !text.includes("redact(")) {
    fail(
      "E. preview_qa_bypass",
      `${path} does not appear to redact secrets in log/excerpt output`
    );
  }
  // The runner must never console.log() the bypass secret value.
  // Catch obvious mistakes: any console.log line that names the env var
  // *and* contains the variable read.
  const offenders = text
    .split("\n")
    .filter(
      (line) =>
        /console\.(log|error|warn)/.test(line) &&
        /process\.env\.VERCEL_AUTOMATION_BYPASS_SECRET\b/.test(line)
    );
  if (offenders.length > 0) {
    fail(
      "E. preview_qa_bypass",
      `${path} logs the raw VERCEL_AUTOMATION_BYPASS_SECRET value`
    );
  }
  pass(
    "E. preview_qa_bypass",
    "preview-qa.mjs uses bypass header + redaction + never logs raw secret"
  );
}

/** F — /api/admin/health does not return raw env values */
async function checkHealthEndpointShape() {
  const path = "src/app/api/admin/health/route.ts";
  let text;
  try {
    text = await readFile(join(REPO_ROOT, path), "utf8");
  } catch (err) {
    fail("F. health_endpoint_shape", `${path} missing (${err.message})`);
    return;
  }
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  // Forbid the *value* of any of these env vars from appearing inside
  // a NextResponse.json(...) payload. Boolean-presence flags
  // (!!process.env.X) and `=== process.env.X` auth comparisons elsewhere
  // in the file are fine.
  const forbiddenInResponse = [
    "ADMIN_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CRON_SECRET",
    "TWILIO_AUTH_TOKEN",
    "EMAIL_API_KEY",
    "VERCEL_AUTOMATION_BYPASS_SECRET",
  ];
  // Capture each NextResponse.json(...) argument list. We approximate by
  // matching the call and balancing parens for the first argument block.
  const callRx = /NextResponse\.json\s*\(/g;
  let match;
  const slices = [];
  while ((match = callRx.exec(stripped))) {
    let depth = 1;
    let i = match.index + match[0].length;
    const start = i;
    while (i < stripped.length && depth > 0) {
      const ch = stripped[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      i++;
    }
    slices.push(stripped.slice(start, i - 1));
  }
  for (const slice of slices) {
    for (const name of forbiddenInResponse) {
      // Skip the boolean-presence pattern.
      const cleaned = slice.replace(
        new RegExp(`!!\\s*process\\.env\\.${name}\\b`, "g"),
        "__bool__"
      );
      if (new RegExp(`process\\.env\\.${name}\\b`).test(cleaned)) {
        fail(
          "F. health_endpoint_shape",
          `${path} embeds process.env.${name} value in a NextResponse.json payload`
        );
      }
    }
  }
  pass(
    "F. health_endpoint_shape",
    "health route response only emits boolean presence flags, never raw secret values"
  );
}

/** G — package.json wires the release scripts */
async function checkPackageScripts() {
  const path = "package.json";
  const text = await readFile(join(REPO_ROOT, path), "utf8");
  const pkg = JSON.parse(text);
  const scripts = pkg.scripts ?? {};
  const required = ["preview:qa", "release:safety", "release:gate"];
  for (const name of required) {
    if (!scripts[name]) {
      fail("G. package_scripts", `${path} is missing script "${name}"`);
    }
  }
  pass(
    "G. package_scripts",
    "package.json defines preview:qa, release:safety, release:gate"
  );
}

async function main() {
  const files = await walk(SRC);
  await checkSecretExposure(files);
  await checkPrivateFieldLeak(files);
  await checkWidgetWiring(files);
  await checkPublicListingWhitelist();
  await checkPreviewQaBypassPlumbing();
  await checkHealthEndpointShape();
  await checkPackageScripts();

  for (const p of passes) console.log(`PASS  ${p.check} — ${p.message}`);
  for (const f of failures) {
    const where = f.file ? ` ${f.file}${f.line ? ":" + f.line : ""}` : "";
    console.log(`FAIL  ${f.check}${where} — ${f.message}`);
  }
  console.log(
    `\nTotals: ${passes.length} pass · ${failures.length} fail`
  );
  if (failures.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(2);
});
