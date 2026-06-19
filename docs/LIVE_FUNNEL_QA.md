# Live Funnel QA — Verification Runbook

**This is read-only. It does not send email, SMS, calls, automations, or outbound messages.**

Run this whenever a WordPress change, plugin update, or code deploy happens that could affect the Ask Magic Mike funnel.

---

## Quick Command

```bash
cd /path/to/ask-magic-mike
pnpm run amm:verify:funnel
```

Or directly:
```bash
node scripts/amm/verify-live-conversion-funnel.mjs
```

No secrets needed. No production data touched. Takes ~5 seconds.

---

## URLs Checked

| Check | URL |
|---|---|
| AMM app | `https://www.askmagicmike.com/` |
| Embed frame | `https://www.askmagicmike.com/embed/ask` |
| Loader JS | `https://www.askmagicmike.com/embed/amm-loader.js` |
| Admin | `https://www.askmagicmike.com/admin/revenue` |
| OTP Ask Mike page | `https://www.ourtownproperties.com/ask-mike/` |
| OTP Homepage | `https://www.ourtownproperties.com/` |
| Mike Eatmon profile | `https://www.ourtownproperties.com/agents/mike-eatmon/` |

---

## Expected Outputs

A clean run looks like:

```
Ask Magic Mike — Live Conversion Funnel Verify
====================================================
[AMM App]
  PASS  www.askmagicmike.com returns 200
  PASS  /embed/ask returns 200
  PASS  /embed/amm-loader.js returns 200
  PASS  /admin/revenue protected (HTTP 401 — 401=correct, 200=authenticated)

[OTP /ask-mike/]
  PASS  /ask-mike/ returns 200
  PASS  /ask-mike/ HTML fetched
  PASS  /ask-mike/ contains amm-loader.js
  PASS  /ask-mike/ contains amm-embed
  PASS  /ask-mike/ free of stale Vercel URLs

[OTP Homepage]
  PASS  Homepage free of stale Vercel URLs
  PASS  Homepage CTA points to /ask-mike/

[Mike Eatmon Profile]
  PASS  Mike profile CTA has agent_profile_cta UTM
  PASS  Mike profile free of stale Vercel URLs

[AMM Public HTML Safety]
  PASS  AMM public HTML: no secret markers
  PASS  AMM public HTML: no MLS confidential markers

====================================================
  Checks: 15   PASS: 15   FAIL: 0
====================================================

  CONVERSION_FUNNEL_VERIFY_PASS
```

Final line must be `CONVERSION_FUNNEL_VERIFY_PASS`. Exit code 0.

---

## What to Do If ask-magic-mike.vercel.app Reappears

**Symptom**: FAIL on `/ask-mike/ free of stale Vercel URLs`, `Homepage free of stale Vercel URLs`, or `Mike profile free of stale Vercel URLs`.

**Cause**: A WordPress plugin, widget, or content update reverted a link to the old preview alias.

**Fix**:
1. Log into OTP WordPress admin (`https://www.ourtownproperties.com/wp-admin`)
2. Check Ask Magic Mike Connector plugin settings (`Settings → Ask Magic Mike Connector`)
3. Ensure `base_url` = `https://www.ourtownproperties.com` (NOT `ask-magic-mike.vercel.app`)
4. Ensure `value_route` = `/ask-mike/`
5. For page content edits: navigate to the specific page (post ID) in `wp-admin/post.php?post=ID&action=edit`
6. Re-run the verify script after fixing

---

## What to Do If /ask-mike/ Loses amm-loader.js

**Symptom**: FAIL on `/ask-mike/ contains amm-loader.js` or `/ask-mike/ contains amm-embed`.

**Cause**: The WordPress page content for `/ask-mike/` (post ID 4366) was overwritten or the plugin reverted it.

**Fix**:
1. Log into OTP WordPress admin
2. Navigate to `wp-admin/post.php?post=4366&action=edit`
3. Switch to Classic Editor Code/Text view
4. Ensure the following embed block is present:
   ```html
   <div class="amm-embed"
        data-utm-source="ourtownproperties"
        data-utm-medium="referral"
        data-utm-campaign="website_widget"></div>
   <script src="https://www.askmagicmike.com/embed/amm-loader.js" defer></script>
   ```
5. Save and purge WP Super Cache (WP Admin → Settings → WP Super Cache → Contents → Delete Cache)
6. Re-run verify

---

## What to Do If /admin/revenue Is Not Protected

**Symptom**: FAIL on `/admin/revenue protected` — specifically if it returns a non-401/200 status, or a 200 without a Basic Auth prompt.

**Expected**: `/admin/revenue` should return HTTP 401 with `WWW-Authenticate: Basic realm="Ask Magic Mike Admin"` for unauthenticated requests.

**Fix**:
1. Check `middleware.ts` in the ask-magic-mike repo — it should enforce HTTP Basic Auth on `/admin/*`
2. Check that `ADMIN_SECRET` Vercel environment variable is set in the Production scope
3. Check the Vercel deployment is the current production deployment (run `node scripts/amm/verify-production-alias.mjs`)
4. Do NOT commit or log the ADMIN_SECRET value

---

## What to Do If the Script Fails to Fetch AMM Endpoints

**Symptom**: FAIL on `www.askmagicmike.com returns 200` or similar network failures.

**Cause**: The Vercel deployment may be down or the deployment alias may be wrong.

**Fix**:
1. Check `https://www.askmagicmike.com` in a browser
2. Check Vercel dashboard for active deployment status
3. Run `node scripts/amm/verify-production-alias.mjs` to confirm which deployment is live
4. If a rollback occurred, deploy the latest `main` branch commit

---

## Secret Marker Patterns Checked

The script scans AMM public HTML for these patterns (none should appear):
- `SUPABASE_SERVICE_ROLE_KEY`
- `sb_secret`
- `sk_live_`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `ADMIN_SECRET`
- `CRON_SECRET`
- `BEGIN RSA PRIVATE KEY`
- Long JWT-format strings

If any are found, treat it as a critical security incident — rotate the exposed secret immediately via Vercel dashboard and investigate how it appeared in the public bundle.

---

## MLS / Confidential Marker Patterns Checked

The script scans for:
- `Confidential - May Only Be Distributed`
- `MLS #` followed by digits
- `Lockbox:`
- `Showing Instructions`
- `BrokerBay`

These should never appear in Ask Magic Mike public HTML. If found, check for accidental MLS data inclusion in the build and roll back immediately.

---

## What This Script Does NOT Check

- Whether leads are being successfully created (requires a real submission — do not create synthetic prod leads)
- Whether scoring or attribution is writing correctly (check Supabase directly or use `/admin/revenue`)
- Whether email/SMS notifications are working (not in scope — no outbound messaging)
- WordPress plugin version or settings (manual check only)
