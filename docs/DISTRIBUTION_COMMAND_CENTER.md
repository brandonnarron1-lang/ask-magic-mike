# Distribution Command Center — Operator Guide

Ask Magic Mike · Our Town Properties · Wilson, NC

---

## Purpose

The Distribution Command Center (`/admin/distribution`) answers the question the Traffic Command Center doesn't: **not "what traffic arrived" but "what should go out next, where, and why."**

It is the operational layer between having content and actually publishing it. It tracks:

- What content opportunities exist (draft ideas)
- Which platforms show attribution traffic (inferred as "something was posted there")
- What traffic arrived per platform and generated leads
- Which platforms are stale (traffic without conversions)
- What to post Monday through Friday
- What to do next

This is NOT social automation. No posts are created. No messages are sent. The operator copies content into the native platform editor manually.

---

## Daily Operator Workflow

1. **Open `/admin/distribution`** — check Publishing Command Center counts.
2. **Review Platform Coverage Matrix** — find the platforms with `No Posts Yet` (amber warning).
3. **Pick a post** from the Recommended Publishing Queue (section 3) for each gap platform.
4. **Copy the content** into the native platform editor. Use tracked UTM links from the Traffic Command Center UTM Copy Bank.
5. After posting, return to Traffic Command Center in 24h to see attribution data.
6. **Review Stale Content Detector** (section 5) weekly — refresh CTAs on platforms with traffic but 0 leads.
7. **Follow the Weekly Publishing Plan** (section 6) — one post per platform, Monday through Friday.
8. **Read the Executive Summary** (section 8) each Monday morning before planning the week.

---

## Traffic → Content → Posting Loop

```
Traffic Command Center          Distribution Command Center
───────────────────────         ────────────────────────────
What traffic arrived?    →      What should I post next?
Which questions were asked? →   Which content matches those questions?
Which platform drove traffic? → Which platforms have coverage gaps?
```

The loop:
1. Post content using tracked UTM links
2. Traffic arrives and attribution is recorded
3. Traffic Command Center shows where sessions came from
4. Distribution Command Center shows what to post next
5. Go to step 1

---

## Platform Coverage Matrix

The matrix shows 6 platforms: Facebook, Instagram, LinkedIn, Threads, X, Email.

| Column | Meaning |
|---|---|
| **Drafted** | Content templates exist (always ✓ — 25 evergreen templates available) |
| **Published** | Attribution traffic detected — something was posted here and drove a click |
| **Traffic 7d** | Sessions from this platform in the last 7 days |
| **Leads** | Leads attributed to this platform |
| **Status** | No Posts Yet / Needs Refresh / Active |

**"No Posts Yet"** (amber) = no attribution traffic. Post content and UTM-tag the link.

**"Needs Refresh"** = traffic exists but no leads. The CTA or landing page isn't converting.

**"Active"** = traffic and leads both present.

---

## How to Use the Publishing Queue

The Recommended Publishing Queue (section 3) shows top 25 content opportunities sorted by intent score, each labeled:

| Status | Meaning |
|---|---|
| **High Priority** | Intent score ≥ 85. Post this week. |
| **Ready** | Intent score 60–84. Post within 2 weeks. |
| **Monitor** | Intent score < 60. Use as filler or when other content is exhausted. |

Each item shows:
- Title (the post headline)
- Hook (the body/first paragraph)
- CTA (what to tell people to do)
- Recommended platform

**How to post:**
1. Pick a "High Priority" or "Ready" item for your target platform.
2. Copy the title into the post.
3. Copy the hook as the first paragraph.
4. Append the CTA with a UTM-tagged link from the Traffic Command Center UTM Copy Bank.
5. Paste into the native platform editor and publish manually.

---

## How to Use the Stale Content Detector

If a platform shows traffic but 0 leads, the Stale Content Detector flags it with a recommendation.

Common fixes:
- **Change the CTA** from a generic link to a direct question: "What's your home worth? →"
- **Change the landing page** from `/ask` to `/value` (or vice versa) to match what the audience needs.
- **Try a different topic** from the queue — the current post may attract browsers, not buyers.
- **Check attribution** — if UTM parameters were missing, leads may be unattributed rather than absent.

---

## How to Use the Weekly Publishing Plan

The Weekly Publishing Plan suggests one post per day, Monday–Friday, with a platform, topic, and goal.

| Day | Platform | Goal |
|---|---|---|
| Monday | Facebook | Reach homeowners thinking about selling |
| Tuesday | Instagram | Visual hook for first-time buyers and relocators |
| Wednesday | LinkedIn | Investor and professional audience |
| Thursday | Threads | Conversational market insight |
| Friday | X / Twitter | Short viral take to drive link clicks |

The plan is derived from content opportunities matched to each platform's audience affinity. It updates automatically when new question patterns arrive.

---

## Platform Coverage Strategy

| Platform | Best content category | Best UTM content tag |
|---|---|---|
| Facebook | home_value, selling, cash_offer | `facebook_post` |
| Instagram | buying, relocation, home_value | `instagram_bio` or `instagram_story` |
| LinkedIn | investing, market_timing, financing | `linkedin_post` |
| Threads | market_timing, buying, general | `threads_post` |
| X / Twitter | market_timing, cash_offer, general | `x_post` |
| Email | home_value, selling, financing | `email_signature` |

---

## Verification Commands

```bash
# Confirm AMM funnel is live before posting
pnpm run amm:verify:funnel

# Check social preview status (40/42 expected until host WAF fix)
pnpm run amm:verify:social-preview || true

# Full validation
pnpm typecheck && pnpm test && pnpm build
```

---

## Files

| File | Purpose |
|---|---|
| `src/lib/admin/distribution-command.ts` | Pure read-only module — derives all distribution intelligence from TrafficCommandData |
| `src/app/(admin)/admin/distribution/page.tsx` | SSR admin page — 8 sections |
| `tests/admin/distribution-command.test.ts` | Unit tests (no DB, no network) |

---

*Ask Magic Mike · Our Town Properties, Inc. · Wilson, NC*
