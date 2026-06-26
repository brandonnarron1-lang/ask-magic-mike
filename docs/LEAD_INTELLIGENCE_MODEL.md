# Lead Intelligence Model — Ask Magic Mike

**Version:** 2.0 (Sprint V2)  
**Last updated:** 2026-06-25  

---

## Overview

Ask Magic Mike uses a deterministic, rule-based lead intelligence system. Every component is a pure function — no AI inference, no DB writes at read time, no outbound side effects. The full model runs in under 1ms and is safe to call from any admin page.

---

## Scoring Engine

### Architecture

```
IntakeFlow.submit()
  → POST /api/leads/canonical
    → calculateScore(lead) — returns {sellerScore, buyerScore, compositeScore, factors}
    → INSERT amm_leads.score = compositeScore
    → INSERT amm_lead_score_factors (key, points, reason) per factor
```

### Composite Score

```ts
compositeScore = max(sellerScore, buyerScore)
```

Both seller and buyer scores are calculated independently. The composite is the higher of the two, ensuring a lead who is both a seller and a buyer gets credit for their dominant intent.

### Score Factors

**Seller factors:**

| Factor key | Points | Trigger |
|------------|--------|---------|
| `INTENT_SELL` | +30 | `leadType === "seller"` |
| `CTA_SELL_NOW` | +25 | CTA chip = `sell_now` |
| `CTA_HOME_WORTH` | +20 | CTA chip = `home_worth` |
| `TIMELINE_ASAP` | +20 | timeline = 0–1 months |
| `TIMELINE_3MO` | +15 | timeline = 3 months |
| `TIMELINE_6MO` | +10 | timeline = 6 months |
| `HAS_ADDRESS` | +5 | address provided |
| `INTENT_BOTH` | +15 | `leadType === "both"` |

**Buyer factors:**

| Factor key | Points | Trigger |
|------------|--------|---------|
| `INTENT_BUY` | +30 | `leadType === "buyer"` |
| `CTA_TALK_MIKE` | +15 | CTA chip = `talk_to_mike` |
| `TIMELINE_ASAP` | +20 | shared |
| `TIMELINE_3MO` | +15 | shared |

**Shared factors (add to whichever score is being calculated):**

| Factor key | Points | Trigger |
|------------|--------|---------|
| `HAS_PHONE` | +10 | phone provided |
| `HAS_EMAIL` | +5 | email provided |
| `HAS_NAME` | +5 | first name provided |
| `CONSENT_CALL` | +10 | `consentCall === true` |
| `CONSENT_SMS` | +5 | `consentSms === true` |
| `CTA_TALK_MIKE` | +15 | CTA chip = `talk_to_mike` |
| `PAID_TRAFFIC` | +5 | `is_paid === true` from attribution |

---

## Temperature Classification

Temperature is stored on `amm_leads.temperature` and derived from the composite score + timeline.

```ts
function classifyTemperature(compositeScore, timelineMonths): Temperature {
  if (compositeScore >= 80 && timelineMonths !== null && timelineMonths <= 3) return "urgent";
  if (compositeScore >= 65) return "hot";
  if (compositeScore >= 40) return "warm";
  if (compositeScore >= 20) return "nurture";
  return "low";
}
```

### Temperature Tiers

| Tier | Score | Timeline | Admin badge | Action required |
|------|-------|----------|-------------|-----------------|
| `urgent` | ≥ 80 | ≤ 3 months | ruby-400/[0.14] text-ruby-300 | Same-day contact |
| `hot` | ≥ 65 | any | gold-400/20 text-gold-300 | Within 24 hours |
| `warm` | ≥ 40 | any | amber-500/10 text-amber-300 | This week |
| `nurture` | ≥ 20 | any | blue-500/10 text-blue-300 | Within 30 days |
| `low` | < 20 | any | slate-600/30 text-slate-400 | Long-term monitoring |

**Critical rule:** A score ≥ 80 is NOT urgent unless the timeline is ≤ 3 months. A motivated homeowner with a 12-month horizon is hot, not urgent — they need a different outreach posture.

---

## Next Best Action (NBA)

The NBA function (`src/lib/admin/next-best-action.ts`) is a pure, read-only function that derives actionable intelligence from stored lead fields.

### Inputs

```ts
interface NextBestActionInput {
  leadType, status, temperature, score, source,
  utmMedium, utmCampaign, firstName,
  hasEmail, hasPhone, hasAddress,
  email, phone, addressRaw,
  consentSms, consentEmail, isSynthetic
}
```

### Outputs

| Field | Description |
|-------|-------------|
| `sourcePath` | Human-readable source label (e.g., "OTP WordPress embed", "OTP homepage CTA") |
| `scoreLabel` | Score + verbatim tier (e.g., "85 — very high") |
| `temperatureLabel` | Tier + action directive (e.g., "Urgent — act same day") |
| `intentSummary` | One-line intent statement (e.g., "Selling intent — homeowner exploring selling options") |
| `missingInfo` | Array of missing data points (email, phone, address, consent) |
| `followUpAngle` | Specific, actionable follow-up instruction |
| `isSynthetic` | True if email matches known test/QA patterns |
| `doNotContact` | True if synthetic OR no consent granted |

### Temperature Labels

| Temperature | Label |
|-------------|-------|
| `urgent` | Urgent — act same day |
| `hot` | Hot — act within 24 h |
| `warm` | Warm — follow up this week |
| `nurture` | Nurture — follow up next month |
| `low` | Low — add to long-term list |
| `null` / unknown | Not assessed |

### Follow-Up Angle Logic (priority order)

1. **Synthetic lead** → "DO NOT CONTACT — synthetic/test lead."
2. **Consent gap** (no email or SMS consent) → Block outbound, surface gap
3. **Urgent or hot + seller** → "Call or text seller directly. Ask timeline, motivation, other offers."
4. **Urgent or hot + buyer** → "Reach out today. Ask must-haves, timeline, pre-approval."
5. **Urgent or hot + general** → "Hot lead — make contact today."
6. **Warm + seller** → "Follow up within the week. Ask timeline."
7. **Warm + buyer** → "Follow up this week. Ask neighborhoods and price range."
8. **Nurture** → "Re-engage in 30 days with a market update or value check-in."
9. **Missing info** → "Collect missing info before following up."
10. **Low / fallback** → "Low urgency — no immediate follow-up. Monitor for re-engagement."

### Synthetic Lead Detection

Email markers that trigger `isSyntheticLead()`:
- `@example.com`, `@test.com`
- `+qa`, `+test`, `+synthetic` suffixes
- `test@`, `synthetic@` prefixes

### Source Path Detection

| UTM signal | Source label |
|------------|--------------|
| `utm_medium=website_widget` | OTP WordPress embed (website_widget) |
| `utm_campaign` contains `wordpress_widget` | OTP WordPress embed (website_widget) |
| `utm_medium=homepage_cta` | OTP homepage CTA |
| `utm_medium=agent_profile_cta` | Mike Eatmon profile CTA |
| `utm_medium=direct_purchase` | Direct-purchase review path |
| `source=we_buy_houses_landing` | We Buy Houses landing page |
| `source=direct` / no medium | Direct / unknown source |

---

## Attribution Model

Attribution is written on session creation (before the lead is submitted) from URL params and sessionStorage. The write path:

1. User lands on `/value` or `/ask` with UTM params
2. `captureAttribution()` parses URL, writes to sessionStorage
3. `useSession()` calls `POST /api/session` with attribution data
4. API writes to `source_attribution` table, returns `session_id`
5. Lead submission references `session_id` — attribution is joined on the DB side

**Referrer types:** `organic_search`, `paid_search`, `paid_social`, `organic_social`, `direct`, `referral`, `email`, `unknown`

---

## Lead Grading

Lead grade (`amm_leads.lead_grade`) is a simplified tier for quick visual scanning:

| Grade | Score range | Meaning |
|-------|-------------|---------|
| A | ≥ 80 | Highly qualified, high intent |
| B | 65–79 | Well-qualified, clear intent |
| C | 40–64 | Moderate signal, follow up |
| D | 20–39 | Weak signal, nurture |
| F | < 20 | Very low signal |

---

## Compliance Rules

- **Consent gate:** `doNotContact = true` when neither `consentEmail` nor `consentSms` is true
- **Opt-out flags:** `opt_out_sms` and `opt_out_email` compliance flags block respective channels (checked from `amm_compliance_flags` in lead detail)
- **Synthetic skip:** Any lead with a synthetic email marker is flagged and blocked from follow-up display
- **No write on read:** NBA function has zero DB writes; admin viewing a lead cannot mutate state

---

## Known Limitations

| Limitation | Mitigation |
|------------|------------|
| Score is set at intake — not recalculated on consent/data updates | Admin can manually re-classify status; re-score endpoint is a P17 item |
| "Not assessed" temperature for leads where temp is null/empty | Temperature should always be set at submission; null means a pre-scoring era lead |
| FlexMLS listing matches not in prod | Migration 00012 missing; hotfix PR #5 degrades gracefully |
