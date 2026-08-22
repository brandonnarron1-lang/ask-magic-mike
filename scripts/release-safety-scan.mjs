#!/usr/bin/env node
/**
 * Static release-safety scanner.
 *
 * Runs against the on-disk source tree (no network, no preview).
 * Fails fast on:
 *
 *   A. Secret exposure — any canonical database, auth, provider, signing, or
 *      private-recipient environment variable read inside a client component
 *      (`"use client"` directive at the top).
 *
 *   B. Public-side MLS private-field leak — `agent_remarks`, `lockbox_info`,
 *      `showing_instructions`, `compensation`, `owner_notes`,
 *      `internal_notes`, `private_remarks`, `broker_notes` referenced
 *      in a *public* API route under the canonical app/ or retained src/app/
 *      tree (excluding admin routes), or in a marketing-generation path.
 *      The sanitizer + CSV importer + tests are explicitly allowlisted.
 *
 *   C. Widget wiring — the canonical `WidgetApp` must back both versioned and
 *      compatibility routes; Preview must load the owned loader, which must
 *      target the versioned route.
 *
 *   D. Public listing boundary — canonical routes must return the safe-empty
 *      provider shape; retained provider routes must select only the public
 *      field whitelist.
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
const DEPLOYABLE_ROOTS = [
  join(REPO_ROOT, "app"),
  join(REPO_ROOT, "src"),
];

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
  "AMM_PRODUCTION_APPROVAL",
  "AMM_PRODUCTION_DATABASE_URL",
  "ANTHROPIC_API_KEY",
  "AUTH_SECRET",
  "BETTER_AUTH_SECRET",
  "CONSENT_IP_HASH_SALT",
  "DATABASE_URL",
  "FUB_API_KEY",
  "KVCORE_API_KEY",
  "LEAD_NOTIFICATION_BCC",
  "OPENAI_API_KEY",
  "PHONE_SETUP_SIGNING_SECRET",
  "QA_EMAIL_SEND_SECRET",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "SMTP_PASSWORD",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TWILIO_AUTH_TOKEN",
  "EMAIL_API_KEY",
  "CRON_SECRET",
  "VAPID_PRIVATE_KEY",
  "WORDPRESS_BRIDGE_SECRET",
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
      (rel.startsWith("app/api/") && !rel.startsWith("app/api/admin/")) ||
      (rel.startsWith("src/app/api/") && !rel.startsWith("src/app/api/admin/"));
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
  let widgetAppConsumers = 0;
  let versionedRouteHasWidgetApp = false;
  let compatibilityRouteHasWidgetApp = false;
  let previewLoadsOwnedScript = false;
  for (const file of files) {
    const rel = relative(REPO_ROOT, file);
    const text = await readFile(file, "utf8");
    if (rel !== "app/components/black-diamond/WidgetApp.tsx" && text.includes("WidgetApp")) {
      widgetAppConsumers += 1;
    }
    if (rel === "app/widget/v1/page.tsx" && text.includes("WidgetApp")) {
      versionedRouteHasWidgetApp = true;
    }
    if (rel === "app/widget/page.tsx" && text.includes("WidgetApp")) {
      compatibilityRouteHasWidgetApp = true;
    }
    if (rel === "app/widget-preview/page.tsx" && text.includes('src="/widget.js"')) {
      previewLoadsOwnedScript = true;
    }
  }
  if (widgetAppConsumers < 2) {
    fail(
      "C. widget_wiring",
      `WidgetApp has only ${widgetAppConsumers} canonical consumer(s)`
    );
  }
  if (!versionedRouteHasWidgetApp) {
    fail(
      "C. widget_wiring",
      "/widget/v1 does not import or render WidgetApp"
    );
  }
  if (!compatibilityRouteHasWidgetApp) {
    fail(
      "C. widget_wiring",
      "/widget compatibility route does not import or render WidgetApp"
    );
  }
  if (!previewLoadsOwnedScript) {
    fail(
      "C. widget_wiring",
      "/widget-preview does not load the owned /widget.js loader"
    );
  }
  let loader = "";
  try {
    loader = await readFile(join(REPO_ROOT, "public/widget.js"), "utf8");
  } catch (err) {
    fail("C. widget_wiring", `public/widget.js missing (${err.message})`);
  }
  if (!loader.includes('"/widget/v1?"')) {
    fail("C. widget_wiring", "public/widget.js does not target /widget/v1");
  }
  pass(
    "C. widget_wiring",
    `WidgetApp has ${widgetAppConsumers} consumers; versioned route, alias, and owned loader are wired`
  );
}

/** D — public listing boundary */
async function checkPublicListingWhitelist() {
  const required = [
    ["app/api/listings/search/route.ts", "safeEmptyListingSearchResponse"],
    ["app/api/listings/[id]/route.ts", "safeEmptyListingDetailResponse"],
    ["src/app/api/listings/search/route.ts", "PUBLIC_FIELD_NAMES"],
    ["src/app/api/listings/[id]/route.ts", "PUBLIC_FIELD_NAMES"],
  ];
  for (const [rel, requiredMarker] of required) {
    const full = join(REPO_ROOT, rel);
    try {
      const text = await readFile(full, "utf8");
      if (!text.includes(requiredMarker)) {
        fail(
          "D. public_listing_whitelist",
          `${rel} does not reference ${requiredMarker}`
        );
      }
    } catch (err) {
      fail("D. public_listing_whitelist", `${rel} missing (${err.message})`);
    }
  }
  pass(
    "D. public_listing_whitelist",
    "canonical routes fail safely and retained provider routes use PUBLIC_FIELD_NAMES"
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
  const activePath = "app/api/admin/health/route.ts";
  try {
    const active = await readFile(join(REPO_ROOT, activePath), "utf8");
    if (!active.includes('from "../../../../src/app/api/admin/health/route"')) {
      fail(
        "F. health_endpoint_shape",
        `${activePath} does not delegate to the reviewed health implementation`
      );
    }
  } catch (err) {
    fail("F. health_endpoint_shape", `${activePath} missing (${err.message})`);
  }
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
    ...SECRET_VAR_NAMES,
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
      // Skip the two supported boolean-presence patterns. Both return only a
      // status bit; any other direct process.env reference remains a failure.
      const cleaned = slice
        .replace(
          new RegExp(`!!\\s*process\\.env\\.${name}\\b`, "g"),
          "__bool__"
        )
        .replace(
          new RegExp(`Boolean\\(\\s*process\\.env\\.${name}\\s*\\)`, "g"),
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
  const required = [
    "preview:find",
    "preview:wait",
    "preview:qa",
    "preview:e2e",
    "release:safety",
    "amm:verify:isolation",
    "release:doctor",
    "release:gate",
    "release:report",
    "release:assert",
    "launch:authority",
    "monitor:synthetic",
  ];
  for (const name of required) {
    if (!scripts[name]) {
      fail("G. package_scripts", `${path} is missing script "${name}"`);
    }
  }
  pass(
    "G. package_scripts",
    `package.json defines all ${required.length} required scripts`
  );
}

/** H — mutation gate must use the health endpoint as source of truth */
async function checkMutationGateContract() {
  const libPath = "scripts/preview-qa-lib.mjs";
  const qaPath = "scripts/preview-qa.mjs";

  let lib;
  try {
    lib = await readFile(join(REPO_ROOT, libPath), "utf8");
  } catch (err) {
    fail("H. mutation_gate", `${libPath} missing (${err.message})`);
    return;
  }
  let qa;
  try {
    qa = await readFile(join(REPO_ROOT, qaPath), "utf8");
  } catch (err) {
    fail("H. mutation_gate", `${qaPath} missing (${err.message})`);
    return;
  }

  if (!/export function shouldRunMutationChecks\b/.test(lib)) {
    fail(
      "H. mutation_gate",
      `${libPath} does not export shouldRunMutationChecks`
    );
  }
  if (!qa.includes(`from "./preview-qa-lib.mjs"`) &&
      !qa.includes(`from './preview-qa-lib.mjs'`)) {
    fail(
      "H. mutation_gate",
      `${qaPath} does not import from preview-qa-lib.mjs`
    );
  }
  // The lib must check health.safety.safe_for_preview_mutation and
  // refuse when it is false. We look for the literal property access.
  if (!lib.includes("safe_for_preview_mutation")) {
    fail(
      "H. mutation_gate",
      `${libPath} does not reference health.safety.safe_for_preview_mutation`
    );
  }
  // Defense in depth: there must NOT be a `force &&` shortcut that
  // skips the safe_for_preview_mutation check.
  if (/!health\.safety\?\.safe_for_preview_mutation && !force/.test(lib)) {
    fail(
      "H. mutation_gate",
      `${libPath} still treats FORCE_DB_WRITE as an override for safe_for_preview_mutation`
    );
  }
  pass(
    "H. mutation_gate",
    "shouldRunMutationChecks honours health.safety.safe_for_preview_mutation with no force override"
  );
}

/** I — widget e2e must intercept /api/leads so no real lead is created */
async function checkWidgetE2eInterception() {
  const path = "tests/e2e/widget-preview-flow.spec.ts";
  let text;
  try {
    text = await readFile(join(REPO_ROOT, path), "utf8");
  } catch (err) {
    fail("I. widget_e2e", `${path} missing (${err.message})`);
    return;
  }
  if (!/page\.route\(\s*['"`]\*\*\/api\/leads['"`]/.test(text)) {
    fail(
      "I. widget_e2e",
      `${path} does not intercept POST /api/leads via page.route`
    );
  }
  // Belt and braces: ensure the spec doesn't use route.continue() which
  // would let the real request through.
  if (/route\.continue\s*\(/.test(text)) {
    fail(
      "I. widget_e2e",
      `${path} uses route.continue() — real /api/leads request can pass`
    );
  }
  pass(
    "I. widget_e2e",
    `${path} intercepts /api/leads with route.fulfill (no real lead creation)`
  );
}

/** J — release-gate docs name the bypass secret and SAFE_DB_WRITE default */
async function checkReleaseDocs() {
  const path = "docs/release-gate.md";
  let text;
  try {
    text = await readFile(join(REPO_ROOT, path), "utf8");
  } catch (err) {
    fail("J. release_docs", `${path} missing (${err.message})`);
    return;
  }
  if (!text.includes("VERCEL_AUTOMATION_BYPASS_SECRET")) {
    fail(
      "J. release_docs",
      `${path} does not mention VERCEL_AUTOMATION_BYPASS_SECRET`
    );
  }
  if (!text.includes("SAFE_DB_WRITE=false")) {
    fail(
      "J. release_docs",
      `${path} does not mention SAFE_DB_WRITE=false default`
    );
  }
  pass(
    "J. release_docs",
    "release-gate.md documents bypass secret + SAFE_DB_WRITE default"
  );
}

/** K — GitHub workflows exist and contain no forbidden phrases */
async function checkWorkflows() {
  const required = [
    ".github/workflows/release-gate.yml",
    ".github/workflows/preview-qa.yml",
    ".github/pull_request_template.md",
  ];
  for (const path of required) {
    try {
      await readFile(join(REPO_ROOT, path), "utf8");
    } catch (err) {
      fail("K. workflows", `${path} missing (${err.message})`);
    }
  }

  let releaseGateText = "";
  let previewQaText = "";
  try {
    releaseGateText = await readFile(
      join(REPO_ROOT, ".github/workflows/release-gate.yml"),
      "utf8"
    );
  } catch {
    // already failed above
  }
  try {
    previewQaText = await readFile(
      join(REPO_ROOT, ".github/workflows/preview-qa.yml"),
      "utf8"
    );
  } catch {
    // already failed above
  }

  const banned = [
    "SAFE_DB_WRITE=true",
    "vercel promote",
    "git merge",
    "git checkout main",
    "vercel rollback",
  ];
  for (const phrase of banned) {
    if (releaseGateText.includes(phrase) || previewQaText.includes(phrase)) {
      fail(
        "K. workflows",
        `forbidden phrase "${phrase}" present in a workflow`
      );
    }
  }

  // release-gate.yml must reference these commands.
  const gateMustReference = [
    "npm run release:doctor",
    "npm run release:safety",
    "npm run test",
    "npm run typecheck",
    "npm run lint",
    "npm run build",
    "npm run launch:authority",
    "upload-artifact",
  ];
  for (const phrase of gateMustReference) {
    if (!releaseGateText.includes(phrase)) {
      fail(
        "K. workflows",
        `release-gate.yml is missing reference to "${phrase}"`
      );
    }
  }

  // preview-qa.yml must reference these.
  const qaMustReference = [
    "VERCEL_AUTOMATION_BYPASS_SECRET",
    "SAFE_DB_WRITE",
    "npm run preview:qa",
    "preview:e2e",
    "upload-artifact",
  ];
  for (const phrase of qaMustReference) {
    if (!previewQaText.includes(phrase)) {
      fail(
        "K. workflows",
        `preview-qa.yml is missing reference to "${phrase}"`
      );
    }
  }

  // preview-qa must refuse SAFE_DB_WRITE override.
  if (!/inputs\.safe_db_write/.test(previewQaText)) {
    fail(
      "K. workflows",
      `preview-qa.yml must accept and validate the safe_db_write input`
    );
  }

  pass(
    "K. workflows",
    "release-gate + preview-qa workflows exist with required references and no forbidden phrases"
  );
}

/** L — governance + rollback docs exist */
async function checkGovernanceDocs() {
  const required = [
    "docs/controlled-preview-mutation-qa.md",
    "docs/rollback-runbook.md",
    "docs/github-actions-release-gate.md",
  ];
  for (const path of required) {
    try {
      await readFile(join(REPO_ROOT, path), "utf8");
    } catch (err) {
      fail("L. governance_docs", `${path} missing (${err.message})`);
    }
  }
  pass(
    "L. governance_docs",
    "controlled-mutation, rollback, and CI docs all present"
  );
}

/** M — synthetic monitor uses no mutating methods, never POSTs /api/leads */
async function checkSyntheticMonitor() {
  const path = "scripts/synthetic-monitor.mjs";
  let text;
  try {
    text = await readFile(join(REPO_ROOT, path), "utf8");
  } catch (err) {
    fail("M. synthetic_monitor", `${path} missing (${err.message})`);
    return;
  }
  if (/method\s*:\s*["'`](POST|PATCH|PUT|DELETE)["'`]/i.test(text)) {
    fail(
      "M. synthetic_monitor",
      `${path} contains a mutating HTTP method literal`
    );
  }
  // Belt and braces: forbid the literal string "/api/leads" anywhere
  // *outside* of a comment that explains it's forbidden.
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  if (stripped.includes("/api/leads")) {
    fail(
      "M. synthetic_monitor",
      `${path} references /api/leads in executable code`
    );
  }
  pass(
    "M. synthetic_monitor",
    "synthetic-monitor.mjs uses no mutating verbs and never references /api/leads at runtime"
  );
}

/** N — artifacts directory is gitignored */
async function checkArtifactsGitignored() {
  const path = ".gitignore";
  let text;
  try {
    text = await readFile(join(REPO_ROOT, path), "utf8");
  } catch (err) {
    fail("N. gitignore", `${path} missing (${err.message})`);
    return;
  }
  if (!/(^|\n)\/?artifacts\/?(\s|$)/.test(text)) {
    fail("N. gitignore", `${path} should contain an entry for artifacts/`);
  }
  pass("N. gitignore", "artifacts/ is gitignored");
}

async function main() {
  const files = (await Promise.all(
    DEPLOYABLE_ROOTS.map((root) => walk(root, []))
  )).flat();
  await checkSecretExposure(files);
  await checkPrivateFieldLeak(files);
  await checkWidgetWiring(files);
  await checkPublicListingWhitelist();
  await checkPreviewQaBypassPlumbing();
  await checkHealthEndpointShape();
  await checkPackageScripts();
  await checkMutationGateContract();
  await checkWidgetE2eInterception();
  await checkReleaseDocs();
  await checkWorkflows();
  await checkGovernanceDocs();
  await checkSyntheticMonitor();
  await checkArtifactsGitignored();

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
