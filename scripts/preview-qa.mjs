#!/usr/bin/env node
/**
 * Preview release-gate QA runner.
 *
 * Walks a Vercel preview URL end-to-end:
 *   - vercel_preview_access — early access precheck. Detects 401/403 from
 *     Vercel Deployment Protection and fails fast with a clear remedy.
 *   - Public funnel HTTP 200 + required-copy spot-checks
 *   - GET /api/admin/health (auth required)
 *   - Admin REST: dashboard / leads / list filters
 *   - SLA sweep with admin auth + optional cron-secret auth
 *   - Public listing search — asserts no private MLS fields
 *   - Optional mutation tests (lead create / note / task / message /
 *     SLA persist / inbound webhooks) gated by SAFE_DB_WRITE and the
 *     health endpoint's `safe_for_preview_mutation` flag.
 *
 * Run:
 *   PREVIEW_URL="https://…vercel.app" \
 *   ADMIN_SECRET="…" \
 *   CRON_SECRET="…" \
 *   VERCEL_AUTOMATION_BYPASS_SECRET="…" \
 *   SAFE_DB_WRITE=false \
 *   npm run preview:qa
 *
 * Bypass-secret env vars (precedence: highest first):
 *   1. VERCEL_AUTOMATION_BYPASS_SECRET
 *   2. VERCEL_PROTECTION_BYPASS_TOKEN
 *   3. VERCEL_BYPASS_SECRET
 * SET_VERCEL_BYPASS_COOKIE=true adds `x-vercel-set-bypass-cookie: true`.
 *
 * Defaults to SAFE_DB_WRITE=false. Mutation tests are NEVER run by
 * accident — they require BOTH SAFE_DB_WRITE=true AND the health
 * endpoint to report safe_for_preview_mutation=true, OR an explicit
 * FORCE_DB_WRITE=true + CONFIRM_FORCE_DB_WRITE confirmation token.
 *
 * Output:
 *   - human summary on stdout
 *   - artifacts/preview-qa-report.json
 *   - artifacts/preview-qa-report.md
 *   - process exit code: nonzero if any required check fails
 *
 * Secrets are NEVER logged. Bypass token is added via the
 * `x-vercel-protection-bypass` header — never appended to URLs in
 * artifacts. A manual browser URL hint is printed only if
 * PRINT_MANUAL_BYPASS_URL=true, and even then the token itself is
 * not printed.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getBypassConfig,
  buildRequestHeaders,
  classifyAccessStatus,
  redactSecrets,
  shouldRunMutationChecks,
  summarizeFetchError,
  formatFetchErrorSummary,
} from "./preview-qa-lib.mjs";

const PREVIEW_URL = (process.env.PREVIEW_URL ?? "").replace(/\/$/, "");
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const PRINT_MANUAL_BYPASS_URL =
  (process.env.PRINT_MANUAL_BYPASS_URL ?? "false").toLowerCase() === "true";

const BYPASS = getBypassConfig(process.env);
// Redact admin/cron secrets, the normalized bypass token, and — defensively —
// the raw bypass env values (in case one was invalid and never normalized).
const ALL_SECRETS = [
  ADMIN_SECRET,
  CRON_SECRET,
  BYPASS.secret,
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  process.env.VERCEL_PROTECTION_BYPASS_TOKEN,
  process.env.VERCEL_BYPASS_SECRET,
];

const OUT_DIR = resolve("artifacts");

/** @type {Array<{ name: string; status: "pass"|"fail"|"skip"; http?: number; message?: string; excerpt?: string }>} */
const results = [];

let accessBlocked = false;

function record(name, status, extras = {}) {
  results.push({ name, status, ...extras });
  const tag = status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "SKIP";
  const http = extras.http !== undefined ? ` (${extras.http})` : "";
  const msg = extras.message ? " — " + redact(extras.message) : "";
  // eslint-disable-next-line no-console
  console.log(`[${tag}] ${name}${http}${msg}`);
}

/** Truncate response excerpts so secrets / giant payloads don't leak. */
function redact(s) {
  if (!s) return "";
  return redactSecrets(String(s).slice(0, 400), ALL_SECRETS);
}

async function http(method, path, opts = {}) {
  const url = `${PREVIEW_URL}${path}`;
  const headers = buildRequestHeaders(
    {
      "User-Agent": "amm-preview-qa/1.0",
      ...(opts.headers ?? {}),
    },
    process.env
  );
  let body = opts.body;
  if (body && typeof body !== "string") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (err) {
    // fetch threw before any HTTP response (DNS/TLS/socket, or an invalid
    // header value). Surface a safe, secret-free summary instead of hiding
    // it behind a generic "network error". Redact each field defensively.
    const summary = summarizeFetchError(err);
    /** @type {Record<string, string|null>} */
    const safe = {};
    for (const [k, v] of Object.entries(summary)) {
      safe[k] = typeof v === "string" ? redact(v) : v;
    }
    return {
      ok: false,
      status: 0,
      json: null,
      text: "",
      error: safe,
    };
  }
  const ct = res.headers.get("content-type") ?? "";
  let json = null;
  let text = "";
  if (ct.includes("application/json")) {
    try {
      json = await res.json();
    } catch {
      json = null;
    }
  } else {
    try {
      text = await res.text();
    } catch {
      text = "";
    }
  }
  return { ok: res.ok, status: res.status, json, text };
}

function adminHeaders() {
  if (!ADMIN_SECRET) return {};
  return { "x-admin-secret": ADMIN_SECRET };
}

function cronHeaders() {
  if (!CRON_SECRET) return {};
  return { Authorization: `Bearer ${CRON_SECRET}` };
}

// ─── Checks ────────────────────────────────────────────────────────────────

async function vercelPreviewAccess() {
  // A bypass secret was supplied but failed normalization — fail fast with the
  // reason (never the secret) instead of letting fetch throw a vague error.
  if (BYPASS.present && !BYPASS.valid) {
    record("vercel_preview_access", "fail", {
      message: `Invalid Vercel bypass secret: ${BYPASS.invalidReason}`,
    });
    return false;
  }
  const r = await http("GET", "/");
  const classification = classifyAccessStatus(r.status, BYPASS.present);
  switch (classification) {
    case "ok":
      record("vercel_preview_access", "pass", {
        http: r.status,
        message: BYPASS.present
          ? "bypass header accepted"
          : "preview reachable without bypass",
      });
      return true;
    case "missing_bypass":
      record("vercel_preview_access", "fail", {
        http: r.status,
        message:
          "Preview is protected. Provide VERCEL_AUTOMATION_BYPASS_SECRET or run vercel curl manually.",
      });
      return false;
    case "rejected_bypass":
      record("vercel_preview_access", "fail", {
        http: r.status,
        message:
          "Preview protection bypass was provided but rejected. Check secret, project, branch, and deployment URL.",
      });
      return false;
    case "network_error": {
      const detail = formatFetchErrorSummary(r.error);
      record("vercel_preview_access", "fail", {
        http: 0,
        message: detail
          ? `network error reaching preview — ${detail}`
          : "network error reaching preview",
        // Safe, already-redacted fetch error summary for the artifacts.
        fetch_error: r.error ?? null,
      });
      return false;
    }
    default:
      record("vercel_preview_access", "fail", {
        http: r.status,
        message: "preview returned an unexpected status",
      });
      return false;
  }
}

async function publicRoutes() {
  const paths = ["/", "/ask", "/value", "/widget-preview"];
  for (const p of paths) {
    const r = await http("GET", p);
    if (r.status >= 200 && r.status < 400) {
      record(`public:${p}`, "pass", { http: r.status });
    } else {
      record(`public:${p}`, "fail", {
        http: r.status,
        excerpt: redact(r.text ?? JSON.stringify(r.json)),
      });
    }
  }
}

async function wpUtmVariants() {
  const mediums = ["homepage_cta", "mike_profile", "seller_page_cta"];
  for (const m of mediums) {
    const path = `/value?utm_source=ourtown_wp&utm_medium=${m}&utm_campaign=ask_magic_mike`;
    const r = await http("GET", path);
    const required = [
      "Start with your address",
      "Mike Eatmon",
      "Our Town Properties",
      "not an appraisal",
    ];
    const html = r.text || JSON.stringify(r.json ?? "");
    const missing = required.filter((s) => !html.includes(s));
    if (r.ok && missing.length === 0) {
      record(`wp_utm:${m}`, "pass", { http: r.status });
    } else {
      record(`wp_utm:${m}`, "fail", {
        http: r.status,
        message: missing.length ? `missing: ${missing.join(", ")}` : "non-200",
      });
    }
  }
}

async function healthCheck() {
  if (!ADMIN_SECRET && !CRON_SECRET) {
    record("health", "skip", { message: "no ADMIN_SECRET or CRON_SECRET" });
    return null;
  }
  const r = await http("GET", "/api/admin/health", {
    headers: { ...adminHeaders(), ...cronHeaders() },
  });
  if (!r.ok || !r.json) {
    record("health", "fail", { http: r.status, excerpt: redact(r.text) });
    return null;
  }
  const h = r.json;
  // Verify no raw secret values leaked.
  const blob = JSON.stringify(h);
  const leaks = [];
  if (ADMIN_SECRET && blob.includes(ADMIN_SECRET)) leaks.push("ADMIN_SECRET");
  if (CRON_SECRET && blob.includes(CRON_SECRET)) leaks.push("CRON_SECRET");
  if (BYPASS.secret && blob.includes(BYPASS.secret))
    leaks.push("VERCEL_AUTOMATION_BYPASS_SECRET");
  if (leaks.length) {
    record("health:no_secret_leak", "fail", {
      http: r.status,
      message: `response contains raw secret(s): ${leaks.join(", ")}`,
    });
  } else {
    record("health:no_secret_leak", "pass", { http: r.status });
  }
  record("health", "pass", { http: r.status });
  return h;
}

async function adminListAndDashboard() {
  if (!ADMIN_SECRET) {
    record("admin:dashboard", "skip", { message: "no ADMIN_SECRET" });
    record("admin:leads", "skip", { message: "no ADMIN_SECRET" });
    return;
  }
  const dash = await http("GET", "/api/admin/dashboard", {
    headers: adminHeaders(),
  });
  if (dash.ok && dash.json?.ok)
    record("admin:dashboard", "pass", { http: dash.status });
  else
    record("admin:dashboard", "fail", {
      http: dash.status,
      excerpt: redact(JSON.stringify(dash.json ?? dash.text)),
    });

  const list = await http("GET", "/api/admin/leads?limit=5", {
    headers: adminHeaders(),
  });
  if (list.ok && list.json?.ok)
    record("admin:leads", "pass", { http: list.status });
  else
    record("admin:leads", "fail", {
      http: list.status,
      excerpt: redact(JSON.stringify(list.json ?? list.text)),
    });
}

async function slaSweep() {
  if (!ADMIN_SECRET) {
    record("sla:sweep_admin", "skip", { message: "no ADMIN_SECRET" });
  } else {
    const r = await http("POST", "/api/admin/sla/sweep", {
      headers: adminHeaders(),
      body: {},
    });
    if (r.ok && r.json?.ok) record("sla:sweep_admin", "pass", { http: r.status });
    else
      record("sla:sweep_admin", "fail", {
        http: r.status,
        excerpt: redact(JSON.stringify(r.json ?? r.text)),
      });
  }
  if (CRON_SECRET) {
    const r = await http("GET", "/api/admin/sla/sweep", {
      headers: cronHeaders(),
    });
    if (r.ok && r.json?.ok && r.json.mode === "cron")
      record("sla:sweep_cron", "pass", { http: r.status });
    else
      record("sla:sweep_cron", "fail", {
        http: r.status,
        excerpt: redact(JSON.stringify(r.json ?? r.text)),
      });
  } else {
    record("sla:sweep_cron", "skip", { message: "no CRON_SECRET" });
  }
}

async function listingPrivateLeakCheck() {
  const r = await http("GET", "/api/listings/search?q=Wilson&limit=3");
  if (!r.ok || !r.json) {
    record("listing:search", "fail", {
      http: r.status,
      excerpt: redact(JSON.stringify(r.json ?? r.text)),
    });
    return;
  }
  record("listing:search", "pass", { http: r.status });

  const forbidden = [
    "agent_remarks",
    "lockbox_info",
    "showing_instructions",
    "compensation",
    "owner_notes",
    "internal_notes",
    "private_remarks",
    "broker_notes",
  ];
  const items = Array.isArray(r.json.items) ? r.json.items : [];
  let leak = null;
  for (const it of items) {
    for (const key of forbidden) {
      if (key in (it ?? {})) {
        leak = `field ${key} present in listing ${it.id ?? "?"}`;
        break;
      }
    }
    if (leak) break;
  }
  if (leak) {
    record("listing:no_private_field_leak", "fail", { message: leak });
  } else {
    record("listing:no_private_field_leak", "pass", { http: r.status });
  }
}

async function mutationTests(gate) {
  if (!gate.allowed) {
    record("mutation:lead_create", "skip", { message: gate.reason });
    record("mutation:lead_note", "skip", { message: gate.reason });
    record("mutation:lead_task", "skip", { message: gate.reason });
    record("mutation:sla_persist", "skip", { message: gate.reason });
    record("mutation:webhook_sms_stop", "skip", { message: gate.reason });
    record("mutation:webhook_email_unsub", "skip", { message: gate.reason });
    return;
  }
  // 1) Create a QA lead.
  const lead = await http("POST", "/api/leads", {
    body: {
      name: "Preview QA",
      email: `qa+${Date.now()}@example.com`,
      phone: "+12525550100",
      lead_type: "buyer",
      source: "ad_form",
      utm_source: "preview_qa",
      consent: { sms: true, email: true },
    },
  });
  if (!lead.ok || !lead.json?.lead_id) {
    record("mutation:lead_create", "fail", {
      http: lead.status,
      excerpt: redact(JSON.stringify(lead.json ?? lead.text)),
    });
    return;
  }
  record("mutation:lead_create", "pass", { http: lead.status });
  const leadId = lead.json.lead_id;

  // 2) Note.
  const note = await http("POST", `/api/admin/leads/${leadId}/notes`, {
    headers: adminHeaders(),
    body: { note: "preview-qa note" },
  });
  record(
    "mutation:lead_note",
    note.ok && note.json?.ok ? "pass" : "fail",
    { http: note.status }
  );

  // 3) Task.
  const task = await http("POST", `/api/admin/leads/${leadId}/tasks`, {
    headers: adminHeaders(),
    body: { title: "preview-qa task", priority: "low" },
  });
  record(
    "mutation:lead_task",
    task.ok && task.json?.ok ? "pass" : "fail",
    { http: task.status }
  );

  // 4) SLA persist.
  const sla = await http("POST", "/api/admin/sla/sweep?persist=true", {
    headers: adminHeaders(),
    body: { persist: true },
  });
  record(
    "mutation:sla_persist",
    sla.ok && sla.json?.ok ? "pass" : "fail",
    { http: sla.status }
  );

  // 5) Webhook SMS STOP (mock auth).
  const sms = await http("POST", "/api/webhooks/sms/inbound", {
    headers: adminHeaders(),
    body: { From: "+12525550100", Body: "STOP" },
  });
  record(
    "mutation:webhook_sms_stop",
    sms.ok && sms.json?.stop_handled ? "pass" : "fail",
    { http: sms.status, message: redact(JSON.stringify(sms.json ?? sms.text)) }
  );

  // 6) Webhook email unsubscribe.
  const email = await http("POST", "/api/webhooks/email/events", {
    headers: adminHeaders(),
    body: {
      type: "email.unsubscribed",
      data: { email_id: `em_${Date.now()}` },
    },
  });
  record(
    "mutation:webhook_email_unsub",
    email.ok && email.json?.event_type === "unsubscribed" ? "pass" : "fail",
    { http: email.status }
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function writeReport(summary) {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    resolve(OUT_DIR, "preview-qa-report.json"),
    JSON.stringify(summary, null, 2)
  );
  await writeFile(
    resolve(OUT_DIR, "preview-qa-report.md"),
    renderMarkdown(summary)
  );
}

async function main() {
  if (!PREVIEW_URL) {
    console.error("ERROR: PREVIEW_URL is required. Example:");
    console.error(
      "  PREVIEW_URL=https://my-preview.vercel.app ADMIN_SECRET=… npm run preview:qa"
    );
    process.exit(2);
  }
  console.log(`Preview QA against: ${PREVIEW_URL}`);
  console.log(
    `Bypass: ${
      BYPASS.present
        ? BYPASS.valid
          ? `present via ${BYPASS.source} (header mode)`
          : `present via ${BYPASS.source} but INVALID (${BYPASS.invalidReason})`
        : "not provided"
    }`
  );
  console.log(
    `Mode: SAFE_DB_WRITE=${process.env.SAFE_DB_WRITE ?? "false"} ` +
      `FORCE_DB_WRITE=${process.env.FORCE_DB_WRITE ?? "false"}`
  );
  if (PRINT_MANUAL_BYPASS_URL && BYPASS.present) {
    // Print *how* to construct the URL, not the URL itself.
    console.log(
      "Manual browser bypass: open PREVIEW_URL with " +
        "?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=true"
    );
  }

  const accessOk = await vercelPreviewAccess();

  let health = null;
  if (accessOk) {
    await publicRoutes();
    await wpUtmVariants();
    health = await healthCheck();
    await adminListAndDashboard();
    await slaSweep();
    await listingPrivateLeakCheck();

    const gate = shouldRunMutationChecks(health, process.env);
    if (!gate.allowed) {
      console.log(`Mutation tests skipped: ${gate.reason}`);
    }
    await mutationTests(gate);
  } else {
    accessBlocked = true;
    console.log(
      "Skipping downstream checks because preview access failed early."
    );
  }

  const gate = shouldRunMutationChecks(health, process.env);
  const summary = {
    preview_url: PREVIEW_URL,
    run_at: new Date().toISOString(),
    mode: {
      SAFE_DB_WRITE:
        (process.env.SAFE_DB_WRITE ?? "false").toLowerCase() === "true",
      FORCE_DB_WRITE:
        (process.env.FORCE_DB_WRITE ?? "false").toLowerCase() === "true",
    },
    protection_bypass_present: BYPASS.present,
    protection_bypass_valid: BYPASS.valid,
    protection_bypass_source: BYPASS.source,
    protection_bypass_invalid_reason: BYPASS.invalidReason,
    protection_bypass_mode: BYPASS.present && BYPASS.valid ? "header" : null,
    set_bypass_cookie: BYPASS.setCookie,
    access_blocked: accessBlocked,
    mutation_gate: gate,
    health: health
      ? {
          build: health.build,
          env_keys_present: Object.entries(health.env)
            .filter(([, v]) => v === true)
            .map(([k]) => k),
          database: health.database,
          safety: health.safety,
        }
      : null,
    results,
  };
  await writeReport(summary);

  const failed = results.filter((r) => r.status === "fail");
  console.log(
    `\nTotals: ${results.filter((r) => r.status === "pass").length} pass · ${
      results.filter((r) => r.status === "skip").length
    } skip · ${failed.length} fail`
  );
  console.log(`Report: artifacts/preview-qa-report.json + .md`);
  if (failed.length > 0) process.exit(1);
}

function renderMarkdown(s) {
  const rows = s.results
    .map(
      (r) =>
        `| ${r.name} | ${r.status} | ${r.http ?? ""} | ${(r.message ?? "").replace(/\|/g, "\\|")} |`
    )
    .join("\n");
  return [
    "# Preview QA report",
    "",
    `- Preview: \`${s.preview_url}\``,
    `- Run at: ${s.run_at}`,
    `- Mode: SAFE_DB_WRITE=${s.mode.SAFE_DB_WRITE} · FORCE_DB_WRITE=${s.mode.FORCE_DB_WRITE}`,
    `- Protection bypass: ${
      s.protection_bypass_present
        ? s.protection_bypass_valid
          ? "present (header mode)"
          : `present but INVALID (${s.protection_bypass_invalid_reason})`
        : "not provided"
    }`,
    `- Set bypass cookie: ${s.set_bypass_cookie}`,
    `- Access blocked early: ${s.access_blocked}`,
    `- Mutation gate: ${s.mutation_gate.allowed ? "ALLOWED" : "BLOCKED"} (${s.mutation_gate.reason})`,
    "",
    "## Build",
    "",
    s.health
      ? "```json\n" + JSON.stringify(s.health.build, null, 2) + "\n```"
      : "_no health response_",
    "",
    "## Results",
    "",
    "| Check | Status | HTTP | Message |",
    "| --- | --- | --- | --- |",
    rows,
    "",
  ].join("\n");
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(2);
});
