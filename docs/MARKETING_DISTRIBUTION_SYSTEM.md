# Marketing Distribution System — Ask Magic Mike

**Version:** 1.0 (Sprint V2)  
**Last updated:** 2026-06-25  
**Brand URL:** askmagicmike.com  
**Canonical production link target:** `/value` page with UTM parameters  

---

## Overview

This document defines the UTM tracking system, content distribution channels, link architecture, and attribution rules for Ask Magic Mike marketing. All public-facing content should use tracked UTM links. Untracked links produce attribution gaps in the admin dashboard.

---

## Hard Rules

1. **Never link directly to `/ask`** — send traffic to `/value` first. The value page builds conversion intent before the intake form. Direct-to-ask links skip this and reduce conversion.

2. **Always include UTM parameters** — untracked links produce `source=direct` / `referrer_type=unknown` in attribution. Attribution gaps make the admin revenue command less actionable.

3. **Use `askmagicmike.com` as the canonical URL in all posts** — not the Vercel deployment URL, not ourtownproperties.com/ask. The askmagicmike.com domain is the brand anchor.

4. **Do not post without UTMs** — a link without UTM params is a wasted impression from a data standpoint.

5. **Organic social posts must pass the compliance QA** — no guaranteed values, no fair housing violations, no unverifiable claims (see `docs/COMPLIANCE_CHECKLIST.md`).

---

## UTM Parameter Architecture

### Standard Parameters

| Parameter | Required | Values |
|-----------|----------|--------|
| `utm_source` | Yes | See channel list below |
| `utm_medium` | Yes | `organic_social`, `paid_social`, `email`, `direct`, `website_widget`, `homepage_cta` |
| `utm_campaign` | Recommended | Campaign slug: `launch_day`, `seller_push_q3_2026`, `buyer_open_house` |
| `utm_content` | Optional | Creative variant: `headshot_cta`, `stat_cta`, `listing_cta` |
| `utm_term` | Optional | Ad keyword or audience segment |

### Channel Source Values

| Channel | `utm_source` |
|---------|-------------|
| Facebook (personal) | `facebook_personal` |
| Facebook (business page) | `facebook_page` |
| Facebook (group post) | `facebook_group` |
| Instagram | `instagram` |
| LinkedIn | `linkedin` |
| YouTube description | `youtube` |
| Nextdoor | `nextdoor` |
| Email newsletter | `email_list` |
| MLS / Zillow profile link | `mls_profile` |
| Google Business | `google_business` |
| Referral / partner site | `partner_referral` |
| askmagicmike.com CTA | `amm_dot_com` |
| OTP WordPress widget | `website_widget` (medium) |

---

## Link Templates

### Primary CTA — Seller Lead

```
[BASE_URL]/value?utm_source=CHANNEL&utm_medium=organic_social&utm_campaign=CAMPAIGN&utm_content=seller_cta
```

Replace `CHANNEL` with the source value from the table above.

Example (Facebook personal):
```
/value?utm_source=facebook_personal&utm_medium=organic_social&utm_campaign=launch_day&utm_content=seller_cta
```

### Primary CTA — Buyer Lead

```
/value?utm_source=CHANNEL&utm_medium=organic_social&utm_campaign=CAMPAIGN&utm_content=buyer_cta
```

### Ask Mike a Question (general)

```
/value?utm_source=CHANNEL&utm_medium=organic_social&utm_campaign=CAMPAIGN&utm_content=ask_cta
```

### Direct-to-Mike (profile/bio link)

```
/value?utm_source=CHANNEL&utm_medium=agent_profile_cta&utm_campaign=CAMPAIGN
```

---

## Channel Distribution Plan

### Tier 1 — Activate on Launch Day

**Facebook (Personal Profile)**
- Post type: Short-form text + link + Mike headshot
- UTM: `utm_source=facebook_personal&utm_medium=organic_social&utm_campaign=launch_day`
- Cadence: 3 posts per week
- Best time: Tuesday/Thursday 8–10am, Saturday 9–11am
- Content: Market updates, seller success stories, "ask Mike" prompts
- Compliance: Required — review each post against fair-housing checklist before publishing

**Google Business Profile**
- Update description to include `askmagicmike.com` link
- UTM: `utm_source=google_business&utm_medium=referral&utm_campaign=profile`
- Add CTA button pointing to `/value` page

### Tier 2 — Activate Within 30 Days

**Facebook Business Page**
- Consistent branding with personal profile
- Longer-form market reports
- UTM: `utm_source=facebook_page&utm_medium=organic_social`

**Nextdoor**
- Wilson County neighborhood posts
- "Local real estate Q&A — ask Mike"
- UTM: `utm_source=nextdoor&utm_medium=organic_social`

**LinkedIn**
- Professional credibility content
- Agent network referrals
- UTM: `utm_source=linkedin&utm_medium=organic_social`

### Tier 3 — Activate When Volume Justifies

**Instagram**
- Visual market stats (use admin traffic command data)
- Listing showcases
- UTM: `utm_source=instagram&utm_medium=organic_social`

**YouTube**
- Market tour videos
- "Ask Mike Monday" Q&A
- UTM in description: `utm_source=youtube&utm_medium=organic_social`

**Email Newsletter**
- Monthly market update to existing contact list
- UTM: `utm_source=email_list&utm_medium=email`

---

## Content Categories

### High-Converting Content Types

| Content type | Signal | Expected temp |
|-------------|--------|---------------|
| "What's your home worth?" prompt | Seller intent, high urgency | urgent/hot |
| Market stats for Wilson County | Seller curiosity | warm/hot |
| Listing showcase with address | Buyer intent | warm/hot |
| "Ask Mike anything" prompt | General inquiry | warm |
| First-time buyer tips | Buyer education | nurture |
| Investment property market data | Investor intent | warm/hot |

### Compliance-Required Reviews

Any post mentioning:
- Specific home values → must not guarantee; must say "estimated" or "market data"
- Interest rates → must include current date caveat
- School districts → cannot be the primary marketing point (fair housing)
- Demographics of any area → prohibited

Use the content QA checklist in `docs/COMPLIANCE_CHECKLIST.md` before publishing.

---

## Admin Attribution Review

After each content push, check the Traffic Command Center (`/admin/traffic`) within 24–48 hours:

1. **Source table** — confirm UTM source appears with leads attributed
2. **Intent score** — high-intent posts should show intent scores ≥ 60
3. **Missing attribution** — any leads with no UTM data = untracked impression
4. **Conversion rate** — sessions/leads ratio; optimize content toward highest-converting types

---

## WordPress Widget Attribution (When Active)

The WordPress embed widget automatically captures:
- `utm_medium=website_widget`
- `utm_source` from the parent page URL
- `utm_campaign=wordpress_widget` (injected by the widget loader)

No manual UTM work needed for widget leads — attribution is automatic once the widget is deployed on ourtownproperties.com.

---

## Paid Traffic (Not Yet Active)

Paid social (Facebook/Instagram ads) and paid search (Google Ads) are architecturally supported via the attribution model's `is_paid` flag and `PAID_TRAFFIC` score bonus (+5 points). To activate:

1. Create ad campaigns in respective platforms
2. Use `utm_medium=paid_social` or `utm_medium=paid_search`
3. Set `is_paid=true` detection via referrer classifier (already implemented)
4. Monitor conversion cost vs. lead score quality in Revenue Command

Paid traffic decisions require Mike's approval and are outside this sprint's scope.

---

## Distribution Log

Track each content push in `docs/SOCIAL_DISTRIBUTION_LOG.md` (already exists):
- Date, channel, UTM campaign slug, post type
- Leads attributed within 48h
- Notes on performance

This log enables optimization: which content types and channels produce the highest-quality (highest-score, highest-temperature) leads.
