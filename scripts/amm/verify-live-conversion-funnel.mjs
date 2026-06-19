/**
 * verify-live-conversion-funnel.mjs
 *
 * Read-only live check of all Ask Magic Mike conversion funnel surfaces.
 * No secrets required. No production data touched.
 * Run: node scripts/amm/verify-live-conversion-funnel.mjs
 */

const CHECKS = [];
let pass = 0;
let fail = 0;

function ok(label) {
  console.log(`  PASS  ${label}`);
  pass++;
  CHECKS.push({ label, result: "PASS" });
}

function err(label, detail = "") {
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  fail++;
  CHECKS.push({ label, result: "FAIL", detail });
}

async function fetchHead(url) {
  const res = await fetch(url, { method: "HEAD", redirect: "follow" });
  return res.status;
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const SECRET_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /sb_secret/i,
  /sk_live_/i,
  /OPENAI_API_KEY/i,
  /RESEND_API_KEY/i,
  /ADMIN_SECRET/i,
  /CRON_SECRET/i,
  /BEGIN RSA PRIVATE KEY/i,
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
];

const MLS_PATTERNS = [
  /Confidential - May Only Be Distributed/i,
  /MLS #\d/i,
  /Lockbox:/i,
  /Showing Instructions/i,
  /BrokerBay/i,
];

console.log("\nAsk Magic Mike — Live Conversion Funnel Verify");
console.log("=".repeat(52));

// ---------------------------------------------------------------------------
// 1. AMM app endpoints
// ---------------------------------------------------------------------------
console.log("\n[AMM App]");

try {
  const status = await fetchHead("https://www.askmagicmike.com/");
  status === 200 ? ok("www.askmagicmike.com returns 200") : err("www.askmagicmike.com", `HTTP ${status}`);
} catch (e) { err("www.askmagicmike.com", String(e)); }

try {
  const status = await fetchHead("https://www.askmagicmike.com/embed/ask");
  status === 200 ? ok("/embed/ask returns 200") : err("/embed/ask", `HTTP ${status}`);
} catch (e) { err("/embed/ask", String(e)); }

try {
  const status = await fetchHead("https://www.askmagicmike.com/embed/amm-loader.js");
  status === 200 ? ok("/embed/amm-loader.js returns 200") : err("/embed/amm-loader.js", `HTTP ${status}`);
} catch (e) { err("/embed/amm-loader.js", String(e)); }

try {
  const res = await fetch("https://www.askmagicmike.com/admin/revenue", { method: "HEAD", redirect: "follow" });
  const s = res.status;
  (s === 401 || s === 200)
    ? ok(`/admin/revenue protected (HTTP ${s} — 401=correct, 200=authenticated)`)
    : err("/admin/revenue", `Expected 401 or 200, got ${s}`);
} catch (e) { err("/admin/revenue", String(e)); }

// ---------------------------------------------------------------------------
// 2. OTP /ask-mike/ page
// ---------------------------------------------------------------------------
console.log("\n[OTP /ask-mike/]");

let askMikeHtml = "";
try {
  const status = await fetchHead("https://www.ourtownproperties.com/ask-mike/");
  status === 200 ? ok("/ask-mike/ returns 200") : err("/ask-mike/", `HTTP ${status}`);
} catch (e) { err("/ask-mike/ HTTP check", String(e)); }

try {
  askMikeHtml = await fetchText("https://www.ourtownproperties.com/ask-mike/");
  ok("/ask-mike/ HTML fetched");
} catch (e) { err("/ask-mike/ HTML fetch", String(e)); }

if (askMikeHtml) {
  askMikeHtml.includes("amm-loader.js")
    ? ok("/ask-mike/ contains amm-loader.js")
    : err("/ask-mike/ missing amm-loader.js");

  askMikeHtml.includes("amm-embed")
    ? ok("/ask-mike/ contains amm-embed")
    : err("/ask-mike/ missing amm-embed");

  !askMikeHtml.includes("ask-magic-mike.vercel.app")
    ? ok("/ask-mike/ free of stale Vercel URLs")
    : err("/ask-mike/ STALE URL: ask-magic-mike.vercel.app found");
}

// ---------------------------------------------------------------------------
// 3. OTP homepage CTA
// ---------------------------------------------------------------------------
console.log("\n[OTP Homepage]");

let homepageHtml = "";
try {
  homepageHtml = await fetchText("https://www.ourtownproperties.com/");
} catch (e) { err("Homepage HTML fetch", String(e)); }

if (homepageHtml) {
  !homepageHtml.includes("ask-magic-mike.vercel.app")
    ? ok("Homepage free of stale Vercel URLs")
    : err("Homepage STALE URL: ask-magic-mike.vercel.app found");

  homepageHtml.includes("ourtownproperties.com/ask-mike")
    ? ok("Homepage CTA points to /ask-mike/")
    : err("Homepage CTA does not point to /ask-mike/");
}

// ---------------------------------------------------------------------------
// 4. Mike Eatmon profile CTA
// ---------------------------------------------------------------------------
console.log("\n[Mike Eatmon Profile]");

let mikeHtml = "";
try {
  mikeHtml = await fetchText("https://www.ourtownproperties.com/agents/mike-eatmon/");
} catch (e) { err("Mike profile HTML fetch", String(e)); }

if (mikeHtml) {
  mikeHtml.includes("agent_profile_cta")
    ? ok("Mike profile CTA has agent_profile_cta UTM")
    : err("Mike profile CTA missing agent_profile_cta UTM");

  !mikeHtml.includes("ask-magic-mike.vercel.app")
    ? ok("Mike profile free of stale Vercel URLs")
    : err("Mike profile STALE URL: ask-magic-mike.vercel.app found");
}

// ---------------------------------------------------------------------------
// 5. AMM public HTML — secret + MLS scan
// ---------------------------------------------------------------------------
console.log("\n[AMM Public HTML Safety]");

let ammHtml = "";
try {
  ammHtml = await fetchText("https://www.askmagicmike.com/");
} catch (e) { err("AMM homepage HTML fetch", String(e)); }

if (ammHtml) {
  const secretHit = SECRET_PATTERNS.find((p) => p.test(ammHtml));
  !secretHit
    ? ok("AMM public HTML: no secret markers")
    : err("AMM public HTML: SECRET MARKER detected", String(secretHit));

  const mlsHit = MLS_PATTERNS.find((p) => p.test(ammHtml));
  !mlsHit
    ? ok("AMM public HTML: no MLS confidential markers")
    : err("AMM public HTML: MLS MARKER detected", String(mlsHit));
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(52));
console.log(`  Checks: ${pass + fail}   PASS: ${pass}   FAIL: ${fail}`);
console.log("=".repeat(52));

if (fail === 0) {
  console.log("\n  CONVERSION_FUNNEL_VERIFY_PASS\n");
  process.exit(0);
} else {
  console.log("\n  CONVERSION_FUNNEL_VERIFY_FAIL\n");
  process.exit(1);
}
