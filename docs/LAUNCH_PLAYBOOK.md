# Launch Playbook — Ask Magic Mike

_Ask Magic Mike · Our Town Properties, Inc. · Wilson, NC_
_The authoritative guide for going from "built" to "in front of buyers and sellers."_

---

## System URLs

| Surface | URL | Notes |
|---|---|---|
| Homepage | https://askmagicmike.com | Primary public surface |
| Ask / Intake | https://askmagicmike.com/ask | Direct funnel entry |
| Value campaign | https://askmagicmike.com/value | Home value landing |
| Admin dashboard | https://askmagicmike.com/admin | Requires ADMIN_SECRET cookie |
| Leads inbox | https://askmagicmike.com/admin/leads | Filter + sort all leads |
| Revenue Command | https://askmagicmike.com/admin/revenue | Pipeline + sentinel |
| Traffic Command | https://askmagicmike.com/admin/traffic | UTM + source attribution |
| Distribution Command | https://askmagicmike.com/admin/distribution | Content queue + publish plan |
| OTP embed | https://www.ourtownproperties.com/ask-mike/ | WordPress embed |
| Mike's OTP profile | https://www.ourtownproperties.com/agents/mike-eatmon/ | Should link to /ask |

---

## Pre-Launch Checklist

Run these checks before the first real marketing push:

```bash
# 1. Verify funnel end-to-end (15 checks)
pnpm run amm:verify:funnel

# 2. Check social previews (40/42 expected — OTP FB blocked by WAF)
pnpm run amm:verify:social-preview || true

# 3. Full build
pnpm typecheck && pnpm lint && pnpm test && pnpm build

# 4. Check Vercel production alias
node scripts/amm/verify-production-alias.mjs
```

All should be green. 40/42 on social preview is the current expected floor (not a failure).

---

## Week 1 — Organic Social Launch

### Day 1: Soft Launch Post (Facebook)

**Target profile:** Brandon Narron personal Facebook (no OTP page to start — OTP FB previews blocked by WAF).

**UTM-tagged link for Day 1:**
```
https://www.askmagicmike.com/ask?utm_source=facebook&utm_medium=social_organic&utm_campaign=askmagicmike_launch&utm_content=variant_c_buyerseller
```

**Post copy:**
> If you've been thinking about buying or selling in Wilson or Eastern NC, here's the fastest way to get a real answer from a licensed broker — without filling out a form or getting put on a list.
>
> Ask Magic Mike. Start with your question. [link]
>
> Mike Eatmon, Our Town Properties. Licensed since 1993. $750M+ in sales.

**Check:** Open Distribution Command Center → Recommended Publishing Queue for current top-ranked posts.

---

### Day 2: Instagram Bio Link Update

Update the Instagram bio link to:
```
https://www.askmagicmike.com/?utm_source=instagram&utm_medium=social_organic&utm_campaign=askmagicmike_launch&utm_content=bio_link
```

**Post copy (caption for a Mike photo or sold sign):**
> Real answers. Local insight. Eastern NC real estate.
> Link in bio → Ask Mike your real estate question.

---

### Day 3: LinkedIn Post (Investor / Professional Audience)

**UTM-tagged link:**
```
https://www.askmagicmike.com/value?utm_source=linkedin&utm_medium=social_organic&utm_campaign=askmagicmike_launch&utm_content=linkedin_value
```

**Post angle:** Market timing for Eastern NC investors.

---

### Day 4: Threads / X

Short takes. Use the Traffic Command Center Viral Post Set for pre-written hooks.

---

### Day 5: Check attribution

- Open Traffic Command Center — review session sources and UTM attribution.
- Open Revenue Command Center — check "New Today" and pipeline status.
- If traffic arrived but no leads: review stale content detector in Distribution Command Center.

---

## Ongoing Weekly Rhythm

Follow the Distribution Command Center weekly plan:

| Day | Platform | Goal |
|---|---|---|
| Monday | Facebook | Homeowners thinking about selling |
| Tuesday | Instagram | First-time buyers / relocators |
| Wednesday | LinkedIn | Investors and professionals |
| Thursday | Threads | Conversational market insight |
| Friday | X / Twitter | Short viral take, link clicks |

Always use tracked UTM links from the Traffic Command Center UTM Copy Bank.

---

## OTP Website Integration

### Step 1: OTP Profile Page (`/agents/mike-eatmon/`)

The profile page CTA should already link to the OTP embed at `/ask-mike/`. Confirm:
- The "Ask Mike" button points to `/ask-mike/` with `utm_source=ourtownproperties&utm_medium=agent_profile_cta`
- The AMM iframe embed loads correctly (`amm-loader.js` is present)

### Step 2: Homepage Widget

The WordPress site has the AMM widget available at `/ask-mike/`. Optionally promote it on the OTP homepage:
- Add a `Ask Mike a Question` button to the OTP homepage sidebar
- Use tracked link: `https://www.askmagicmike.com/ask?utm_source=ourtownproperties&utm_medium=website_widget&utm_campaign=homepage_widget`

### Step 3: OTP Facebook

Until the cPanel ModSecurity rule is whitelisted, do NOT share OTP domain links on Facebook. Use `askmagicmike.com` links exclusively. See **Facebook WAF Blocker** section below.

---

## Admin Operations

### Daily Admin Routine

1. **Open `/admin`** (dashboard) — check tile counts for new/urgent leads.
2. **Open `/admin/leads`** — review new leads, check urgency.
   - Click into each new lead to see Next Best Action.
   - Update status (contacted/qualified/won/lost) after follow-up.
3. **Open `/admin/revenue`** — check Revenue Sentinel for alerts.
4. **Monday morning: Open `/admin/distribution`** — read Executive Summary, plan the week.

### Responding to Leads

When a new lead arrives:
1. Go to `/admin/leads` → click the lead row.
2. Read **Next Best Action** — it will tell you: source path, temperature, suggested follow-up angle, and what info is missing.
3. Click **Assign** to assign to yourself.
4. Click **Status → Contacted** after you reach out.
5. Use **Add Note** to log call outcomes.
6. If consent_sms = ✓ and sms_enabled, use **Send SMS** for template messages.

### SLA Compliance

Vercel Cron sweeps for SLA breaches every hour. If `SLA Breached` count in the admin is non-zero:
- These leads expected a response within the SLA window and haven't been contacted.
- Prioritize immediately — filter by `temperature=urgent` in `/admin/leads`.

---

## UTM Link Building

Use the Traffic Command Center UTM Copy Bank for pre-built tracked links. Or build manually:

```
https://www.askmagicmike.com/{page}?utm_source={source}&utm_medium={medium}&utm_campaign={campaign}&utm_content={content}
```

| Source | Medium | Campaign | Page |
|---|---|---|---|
| `facebook` | `social_organic` | `askmagicmike_launch` | `/ask` or `/` |
| `instagram` | `social_organic` | `askmagicmike_launch` | `/ask` or `/value` |
| `linkedin` | `social_organic` | `askmagicmike_launch` | `/value` |
| `threads` | `social_organic` | `askmagicmike_launch` | `/ask` |
| `x` | `social_organic` | `askmagicmike_launch` | `/ask` |
| `ourtownproperties` | `agent_profile_cta` | `profile_page` | `/ask` |
| `email` | `email_signature` | `signature` | `/` |

All attributed sessions appear in the Traffic Command Center within ~30 seconds.

---

## Facebook WAF Blocker

**Situation:** Regency shared hosting (cPanel, user `wilsonho`) has a ModSecurity rule that blocks `facebookexternalhit` user-agent from `ourtownproperties.com`. Facebook won't render OG previews for OTP domain links.

**Impact:** Can't share `ourtownproperties.com` links on Facebook with link previews.

**Workaround (in use):** Share `askmagicmike.com` links on Facebook. AMM domain is hosted on Vercel and returns 200 to facebookexternalhit. Link previews work correctly.

**Fix (needs cPanel access):**
1. Log into cPanel for `wilsonho` at Regency
2. Security → ModSecurity → Tools → Hits List
3. Find the rule ID firing on `facebookexternalhit` from `ourtownproperties.com`
4. Add a `SecRuleRemoveById <rule_id>` directive in `.htaccess` (or ask host to whitelist)
5. Re-run `pnpm run amm:verify:social-preview` — target 42/42

---

## Optional Upgrades (Post-Launch)

| Upgrade | Effort | Value |
|---|---|---|
| Appointment scheduler on confirmation step | Medium | Direct revenue — lets warm leads book a call |
| Automated SMS follow-up sequence | High | Conversion lift for warm/nurture leads |
| WP → AMM lead sync webhook | Medium | Unified lead store, single source of truth |
| CSV export on Revenue Command Center | Low | Mike can export leads for CRM import |
| Operator push notification (urgent leads) | Medium | Faster response on urgent leads |
| Custom domain email for follow-up | Low | Looks more professional than @ourtownproperties.com |

---

## Emergency Runbook

### Funnel not capturing leads
1. Check Vercel logs at Vercel Dashboard → Functions → `/api/intake/submit`
2. Check Supabase for failed inserts
3. Run `pnpm run amm:verify:funnel` — should be 15/15
4. Check that `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel environment

### Admin shows "Admin Unavailable"
- Supabase env vars are not set in the Vercel project.
- Go to Vercel → ask-magic-mike project → Settings → Environment Variables.
- Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### Listings API 500
- The `listings` table may not exist in the Supabase project (migration 00012 may be missing in prod).
- A safe fallback returns an empty array — the funnel continues. Not a blocker.
- Apply migration when ready.

### Social preview fails
- Run `pnpm run amm:verify:social-preview || true`
- 40/42 is the expected floor (OTP FB 403 = external WAF)
- If AMM pages drop below 42: check Vercel logs, confirm og:image is accessible

### Production out of sync with branch
```bash
node scripts/amm/verify-production-alias.mjs
```
Confirms the production Vercel alias points to the correct deployment.

---

## Verification Commands

```bash
# Full validation (run before every deploy)
pnpm typecheck && pnpm lint && pnpm test && pnpm build

# Funnel end-to-end
pnpm run amm:verify:funnel

# Social previews
pnpm run amm:verify:social-preview || true

# Production alias
node scripts/amm/verify-production-alias.mjs

# Live conversion funnel (requires internet)
node scripts/amm/verify-live-conversion-funnel.mjs
```

---

_Ask Magic Mike · Our Town Properties, Inc. · Wilson, NC_
