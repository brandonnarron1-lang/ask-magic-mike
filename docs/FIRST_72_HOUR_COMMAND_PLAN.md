# First 72-Hour Launch Command Plan
# Ask Magic Mike — Our Town Properties · Wilson, NC
# Version: 2026-06-16

This is the operator-controlled, hour-by-hour launch sequence for the 72 hours following
**go-live confirmation** (moment when production is fully live and approved). Execute in order.

---

## PRE-LAUNCH CHECKLIST (before Hour 0)

These must be complete before starting the 72-hour clock:

- [ ] PR #69 merged: embed `page_view` analytics event
- [ ] PR #70 merged: `FINAL_OWNER_ACTIONS.md` owner checklist
- [ ] PR #71 merged: Traffic Activation Packet + Revenue OS report
- [ ] This PR merged: Conversion Intelligence + QA Control Tower
- [ ] Vercel deployment confirmed green at https://www.askmagicmike.com
- [ ] Admin cockpit accessible at `/admin` (Supabase env vars live)
- [ ] Lead test passed: submit `qa+amm-preflight@ourtownproperties.com` → confirm QA badge in `/admin/leads`
- [ ] SLA sweep cron verified in Vercel Pro dashboard (`0 * * * *` → `/api/admin/sla/sweep`)

---

## HOUR 0–2: Verify Production Systems

**0:00 — Production smoke**
- Load https://www.askmagicmike.com in browser (incognito)
- Load https://www.askmagicmike.com/value
- Load https://www.askmagicmike.com/embed/ask
- Load https://www.askmagicmike.com/admin → confirm dashboard shows (no 500)

**0:15 — Lead flow test**
1. Open `/embed/ask` in incognito
2. Submit a full lead with email `qa+amm-hour0@ourtownproperties.com`
3. Open `/admin/leads` → confirm the lead appears with purple **QA** badge
4. Open lead detail → confirm `isSynthetic: true` in Next Best Action panel
5. Confirm lead is NOT in follow-up queue on revenue command page

**0:30 — Analytics event verification**
- Open browser DevTools → Network tab
- Load `/embed/ask` → confirm `POST /api/analytics/event` fires with `event_name: "page_view"`
- Open `/admin/traffic` → verify `sessions7d` is a real number (not the lead-count fallback)

**1:00 — Admin workflow walkthrough**
- Open `/admin` → review all metrics
- Open `/admin/leads` → confirm sorting, filters, and QA badge work
- Open `/admin/revenue` → confirm follow-up queue does not include QA leads
- Open `/admin/traffic` → confirm traffic dashboard loads with real session data

**2:00 — Declare Hour 0 complete. Note any blockers in BLOCKERS.md.**

---

## HOUR 2–8: WordPress Traffic Activation

**2:00 — Embed widget verification on ourtownproperties.com**
- Navigate to the WordPress page that has the `/ask-mike/` embed
- Fill out and submit the embed form from the WordPress page
- Confirm lead appears in admin with `utm_medium: website_widget`
- Confirm attribution is captured correctly in source rollup

**3:00 — Install WordPress CTAs (if not already live)**
Use snippets from `docs/wordpress-cta-snippets.md`:
1. Homepage hero CTA → `/value?utm_source=ourtown_wp&utm_medium=homepage_cta&...`
2. Mike profile/bio page CTA → `utm_medium=mike_profile`
3. Seller landing page CTA → `utm_medium=seller_page_cta`
4. Verify all three CTAs open askmagicmike.com in a new tab with correct UTMs

**4:00 — Verify UTM attribution round-trip**
- Click each CTA → submit lead → check `/admin/traffic` source rollup
- Confirm source shows `ourtown_wp` in top sources within ~5 minutes

**6:00 — Check admin dashboard for first organic leads**
- If CTA traffic is live, expect first organic leads by Hour 6
- If no leads yet: that's normal — no action needed until Hour 24

---

## HOUR 8–24: Social + Email Activation

**8:00 — Facebook / Instagram first post**
Copy from `docs/TRAFFIC_ACTIVATION_PACKET.md` → Facebook copy block:

> _"Curious what your Wilson NC home is worth in 2026? Ask Mike directly — no account, no waiting. Mike Eatmon · Our Town Properties."_
> Link: `https://www.askmagicmike.com/value?utm_source=facebook&utm_medium=social_post&utm_campaign=launch_week`

Post to:
- Our Town Properties Facebook page
- Mike Eatmon personal page (optional)
- Wilson NC real estate / community groups (with mod permission)

**10:00 — Instagram Story + Feed post**
Use the same copy shortened for Instagram. UTM:
`utm_source=instagram&utm_medium=social_story&utm_campaign=launch_week`

**12:00 — Email blast (if list exists)**
Send to past clients / leads with email consent:
Subject: "Curious what your Wilson NC home is worth?"
Body: Short intro + button linking to `/value?utm_source=email_blast&utm_medium=email&utm_campaign=launch_week`
**Do not send to any lead without explicit email consent.**

**16:00 — Check admin dashboard for traffic ramp**
- Expected: 5–25 sessions from social by end of Hour 24
- If sessions > 0 but leads = 0: normal — 2–5% conversion is typical
- If sessions = 0: check UTM links are correct, check social posts are live

**20:00 — Agent SOP walkthrough (Mike)**
Mike should open `/admin/leads` and review the admin cockpit:
- Check follow-up queue in `/admin/revenue`
- Note any `urgent` or `hot` temperature leads
- Verify he can reach the lead detail page and see Next Best Action

---

## HOUR 24: First Daily Check-in

Run this routine at Hour 24 and then every 24 hours:

| Check | Where | Pass condition |
|-------|-------|----------------|
| Lead count | `/admin` → New Today | Any real leads (non-QA) |
| Follow-up queue | `/admin/revenue` → Follow-up queue | No QA leads in queue |
| SLA overdue | `/admin` → Overdue SLA | Should be 0 if Mike is responding |
| Traffic sessions | `/admin/traffic` | sessions7d growing |
| Conversion rate | `/admin/traffic` | Any non-null rate |
| Social traffic | `/admin/traffic` → Source rollup | facebook/instagram appearing |
| WordPress widget | `/admin/traffic` → Source rollup | `website_widget` appearing |
| Synthetic lead count | `/admin/traffic` → synthetic7d | Should be low (QA smoke only) |

---

## HOUR 24–48: Nurture + Optimization

**24:00 — Follow up on any urgent/hot leads**
- Open follow-up queue in `/admin/revenue`
- Any `urgent` leads (A+ grade): call or text same day
- Any `hot` leads (A grade): respond within 24 hours
- All leads should have Next Best Action guidance on detail page

**36:00 — Second social post**
Post a market-data angle:
> _"The Wilson NC market is moving. If you're thinking about selling — or buying — now's a good time to get a local take. No forms, no waiting. Ask Mike."_
> Link: `/value?utm_source=facebook&utm_medium=social_post&utm_campaign=launch_week_d2`

**40:00 — Review question intelligence**
- Open `/admin/traffic` → Question Intelligence section
- Note top questions coming in from real leads
- These become organic content topics (do NOT publish without review)

---

## HOUR 48–72: Velocity Assessment

**48:00 — Traffic ramp assessment**

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Leads in 48h | ≥ 3 real leads | 1–2 real leads | 0 real leads |
| Sessions in 48h | ≥ 20 sessions | 5–19 | < 5 |
| Widget leads | ≥ 1 from embed | 0 from embed | — |
| Conversion rate | 2–10% | < 2% | N/A |
| SLA compliance | 0 breaches | 1–2 | ≥ 3 uncontacted A+ |

**Green**: Continue ramp. Add one more social post. Consider agent referral push.
**Yellow**: Check CTA links. Verify UTMs tracking. No change to system — just more traffic.
**Red**: Check WordPress embed is live. Verify CTAs installed. Check social posts are published.

**60:00 — Agent referral activation (optional)**
If Mike has other agents at Our Town Properties:
- Brief them on Ask Magic Mike embed + `/value` link
- Ask them to share with their sphere via text or social
- UTM: `utm_source=agent_referral&utm_medium=referral&utm_campaign=agent_push`

**70:00 — 72-hour report prep**
Gather from admin cockpit:
- Total leads (real, non-QA)
- Lead source breakdown
- Sessions count
- Top questions
- Any SLA breaches (and whether Mike responded)
- Conversion rate

**72:00 — Decision point: steady-state operations or escalate?**

**Declare success** if:
- ≥ 3 real leads in 72 hours
- At least 1 attributed lead from WordPress widget
- Mike has reviewed all leads and responded to urgent/hot ones
- No prod errors in Vercel logs

**Escalate** if:
- 0 leads in 72 hours AND CTAs confirmed live → organic content sprint
- Supabase errors → check BLOCKERS.md / escalate to engineering
- SLA breach alerts on A+ leads → immediately contact those leads

---

## STOP CONDITIONS

Pause all traffic activation and notify immediately if:

- Any production 500 errors on intake API (`/api/intake/ask`)
- Real customer data visible in QA/test tooling
- Supabase quota exceeded or billing alert
- Any lead submits PII and is routed to wrong agent
- Mike asks to pause

---

## DAILY ADMIN ROUTINE (Post-72h)

Perform once each morning:

1. Open `/admin` → note New Today, Hot Leads, Overdue SLA counts
2. Open `/admin/revenue` → work follow-up queue top-to-bottom
3. Open `/admin/leads` → filter `sla_breach` → respond to any breached A+/A leads
4. Optional: open `/admin/traffic` → note conversion rate trend
5. Note any questions with high frequency → flag as content topics

Time budget: 10–15 minutes per day.

---

## SUCCESS METRICS AFTER 72 HOURS

| Metric | Target |
|--------|--------|
| Real leads captured | ≥ 3 |
| Lead sources | ≥ 2 distinct sources |
| WordPress widget leads | ≥ 1 |
| Urgent/hot response time | < 24 h for all A+/A leads |
| SLA overdue at Hour 72 | 0 |
| Admin cockpit used | Yes (Mike reviewed leads) |
| Synthetic leads in follow-up queue | 0 |
| Production errors | 0 |
