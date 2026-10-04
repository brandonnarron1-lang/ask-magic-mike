#!/usr/bin/env node
// Opt-in, real built app + Better Auth + isolated SQL. Never a Preview/Production
// credential venue. Five synthetic role identities; outbound providers held.
import { spawn } from "node:child_process";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createServer } from "node:net";
import { hashPassword } from "better-auth/crypto";
import { startDatabase, stopDatabase, install, psql, literal } from "../../tests/support/qa-audit-postgres.ts";

if (process.env.AMM_QA_POSTGRES_TEST !== "1" || process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview" || process.env.DATABASE_URL || process.env.PREVIEW_URL) throw new Error("explicit_clean_isolated_venue_required");
const runDir = path.resolve(".amm-run/reference-session-acceptance");
mkdirSync(runDir, { recursive: true });
const reserve = createServer();
await new Promise(resolve => reserve.listen(0, "127.0.0.1", resolve));
const port = reserve.address().port;
await new Promise(resolve => reserve.close(resolve));
const origin = `http://localhost:${port}`;
const password = `SYNTHETIC-${randomBytes(24).toString("hex")}`;
const commandSecret = randomBytes(32).toString("hex");
const authToken = randomBytes(32).toString("hex");
const ids = { admin: randomUUID(), owner: randomUUID(), agent: randomUUID(), analyst: randomUUID(), other: randomUUID() };
const agents = { owner: "00000000-0000-4000-8000-000000009901", agent: randomUUID(), other: randomUUID() };
const leads = { owner: randomUUID(), agent: randomUUID(), other: randomUUID(), offer: randomUUID(), pass: randomUUID(), sms: randomUUID() };
const phones = { agent: "+12025550111", other: "+12025550112" }; // reserved fictional range, no sends
const fingerprint = phone => createHmac("sha256", commandSecret).update(`amm:staff-phone:v1:${phone}`).digest("hex");
const code = offer => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(createHmac("sha256", commandSecret).update(`amm:offer:v1:${offer.id}:${offer.version}:${offer.agent_id}`).digest().subarray(0, 8), b => alphabet[b % 32]).join("");
};
let child;
try {
  // Next's fetch wrapper validates Neon’s derived URL before the test wire
  // adapter. localhost avoids Neon rewriting a numeric IP into an invalid URL.
  const connection = (await startDatabase({ loopbackTcp: true })).replace("@127.0.0.1:", "@localhost:");
  install("amm_qa_upgrade", true);
  const hash = await hashPassword(password);
  const roles = { admin: "administrator", owner: "primary_lead_owner", agent: "approved_agent", analyst: "read_only_analyst", other: "approved_agent" };
  for (const [key, userId] of Object.entries(ids)) {
    psql(`INSERT INTO lead_center_users(id,name,email,role,"emailVerified","agentId") VALUES(${literal(userId)},${literal(`SYNTHETIC ${key.toUpperCase()} — DO NOT CONTACT`)},${literal(`${key}@example.test`)},${literal(roles[key])},true,${literal(agents[key])});
      INSERT INTO lead_center_accounts(id,"accountId","providerId","userId",password) VALUES(${literal(randomUUID())},${literal(userId)},'credential',${literal(userId)},${literal(hash)});`);
  }
  for (const key of ["agent", "other"]) {
    psql(`INSERT INTO agents(id,name,email,role,is_active,max_daily_leads,current_load,notification_phone,notification_sms,notification_email,availability) VALUES(${literal(agents[key])},${literal(`SYNTHETIC ${key.toUpperCase()}`)},${literal(`directory-${key}@example.test`)},'backup',true,100,0,${literal(phones[key])},true,true,'{"sun":[0,24],"mon":[0,24],"tue":[0,24],"wed":[0,24],"thu":[0,24],"fri":[0,24],"sat":[0,24]}');
      INSERT INTO agent_operational_enrollment(agent_id,user_id,approved_at,approved_by,paused,email_enabled,sms_enabled,towns,intents,daily_cap,concurrent_cap,consent_at,consent_version,possession_verified_at,phone_fingerprint) VALUES(${literal(agents[key])},${literal(ids[key])},now(),${literal(ids.admin)},false,true,true,ARRAY['Wilson'],ARRAY['buyer'],100,20,now(),'staff_operational_sms_v1',now(),${literal(fingerprint(phones[key]))});`);
  }
  for (const [key, lead] of Object.entries(leads)) {
    const session = randomUUID();
    psql(`INSERT INTO sessions(id) VALUES(${literal(session)}); INSERT INTO leads(id,session_id,first_name,last_name,email,phone,lead_type,primary_intent,city,state,source,is_test,communication_suppressed,assigned_agent_id,assigned_at) VALUES(${literal(lead)},${literal(session)},'SYNTHETIC',${literal(`${key.toUpperCase()} DO NOT CONTACT`)},${literal(`private-${key}@example.test`)},'+12025550199','buyer','buy','Wilson','NC','isolated_session_acceptance',false,false,${literal(agents[key] || agents.owner)},now());`);
  }
  psql(`UPDATE lead_allocation_policy SET active=true,starts_at=now()-interval '5 minutes',version=version+1,approved_at=now(),approved_by=${literal(ids.admin)},fallback_agent_id=${literal(agents.owner)},mode='first_claim',max_fanout=2,daily_segment_budget=0,daily_estimated_cost_micros=0 WHERE id='staff_v1';`);
  const offers = {};
  for (const key of ["offer", "pass", "sms"]) {
    const version = Number(psql(`SELECT allocation_version FROM leads WHERE id=${literal(leads[key])};`));
    const created = JSON.parse(psql(`SELECT create_lead_allocation_offers_v1(${literal(leads[key])},${version},${literal(ids.admin)});`));
    if (!created.ok) throw new Error(`isolated_offer_seed_failed:${created.error}`);
    offers[key] = JSON.parse(psql(`SELECT json_agg(o) FROM lead_allocation_offers o WHERE lead_id=${literal(leads[key])};`));
  }
  // Recognized, unmistakably synthetic timeline fixtures exercise the existing
  // offset pagination. Unknown audit actions intentionally do not render.
  psql(`INSERT INTO audit_logs(actor,action,resource_type,resource_id,metadata,after_state,created_at) SELECT 'isolated-fixture','lead.lifecycle_changed','lead',${literal(leads.agent)},'{"fixture":true}','{"status":"new","reason":"isolated_fixture"}',now()-i*interval '1 minute' FROM generate_series(1,35) i;
    INSERT INTO tasks(lead_id,agent_id,created_by,title,status,priority,category,due_at) VALUES(${literal(leads.agent)},${literal(agents.agent)},${literal(ids.admin)},'SYNTHETIC follow-up — DO NOT CONTACT','open','high','followup:manual_callback',now()-interval '1 hour');`);
  psql(`INSERT INTO communication_permissions(lead_id,channel,purpose,state,consent_text,consent_version,source,evidence_at) VALUES(${literal(leads.agent)},'email','requested_service_response','allowed','ISOLATED SYNTHETIC PERMISSION — NOT A REAL CONSUMER','isolated_fixture_v1','isolated_session_acceptance',now());`);
  const fixture = { ids, agents, leads, phones, offers, codes: Object.fromEntries(Object.entries(offers).map(([key, rows]) => [key, rows.map(o => code(o))])) };
  const fixturePath = path.join(runDir, "fixtures.json");
  writeFileSync(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
  // Inherit tool/runtime paths only. Never carry user provider credentials into
  // this app. The generated secrets exist solely for the disposable local venue.
  const env = {
    PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
    AMM_QA_POSTGRES_TEST: "1", AMM_ISOLATED_SESSION_ACCEPTANCE: "1", AMM_E2E_FIXTURE_PATH: fixturePath,
    AMM_E2E_FIXTURE_PASSWORD: password, AMM_E2E_BUILT: "1", AMM_E2E_PORT: String(port),
    VERCEL_ENV: "development", DATABASE_URL: connection, BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: randomBytes(32).toString("hex"), LEAD_CENTER_RBAC_ENABLED: "true",
    NEXT_PUBLIC_SITE_URL: origin, LEAD_ALLOCATION_ENABLED: "true", LEAD_ALLOCATION_SENDS_ENABLED: "false", LEAD_ALLOCATION_DUE_ENABLED: "false",
    LEAD_ALLOCATION_COMMAND_SECRET: commandSecret, EMAIL_ENABLED: "false", EMAIL_PROVIDER: "console",
    CUSTOMER_EMAIL_ENABLED: "false", CUSTOMER_SMS_ENABLED: "false", AGENT_SMS_NOTIFICATIONS_ENABLED: "false",
    AGENT_EMAIL_NOTIFICATIONS_ENABLED: "false", LEAD_NOTIFICATION_ENABLED: "false", WEB_PUSH_ENABLED: "false",
    TWILIO_AUTH_TOKEN: authToken, TWILIO_ACCOUNT_SID: `AC${"a".repeat(32)}`, TWILIO_FROM_PHONE: "+12025550100",
    RATE_LIMIT_HASH_SECRET: randomBytes(32).toString("hex"),
    AMM_E2E_TWILIO_TOKEN: authToken,
    NODE_OPTIONS: `--dns-result-order=ipv4first --import=${path.resolve("tests/support/isolated-neon-transport.mjs")}`,
  };
  child = spawn("pnpm", ["exec", "playwright", "test", "tests/e2e/reference-real-session.spec.ts"], { env, stdio: "inherit" });
  const exit = await new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", resolve); });
  const counts = JSON.parse(psql(`SELECT json_build_object('leads',count(*),'notifications',(SELECT count(*) FROM lead_notifications),'provider_ids',(SELECT count(*) FROM lead_notifications WHERE provider_message_id IS NOT NULL),'reservations',(SELECT count(*) FROM lead_allocation_send_reservations)) FROM leads;`));
  writeFileSync(path.join(runDir, "receipt.json"), JSON.stringify({ at: new Date().toISOString(), exit, scope: "built-app-real-auth-isolated-postgresql", productionWrites: 0, providerCalls: 0, counts }, null, 2), { mode: 0o600 });
  process.exitCode = Number(exit || 0);
} finally { if (child && child.exitCode === null) child.kill("SIGTERM"); stopDatabase(); }
