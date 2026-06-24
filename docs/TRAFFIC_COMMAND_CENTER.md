# Traffic Command Center — Operator Guide

Ask Magic Mike · Our Town Properties · Wilson, NC

---

## Purpose

The Traffic Command Center (`/admin/traffic`) is a read-only, real-time admin page that shows:

- Where sessions and leads are coming from
- What questions people are actually asking
- Which content topics have the highest conversion intent
- Ready-to-copy social posts (per platform)
- Local market segment heatmap
- Weekly executive summary
- **Launch readiness status** — which links are safe to post right now
- **UTM Copy Bank** — pre-built tracked URLs for every posting platform
- **Do Not Post list** — which links must not be posted on Facebook until the host WAF is fixed

No data is written from this page. No messages are sent. No leads are created.

---

## Daily Operator Workflow

1. **Open `/admin/traffic`** — check the Launch Readiness panel first.
2. **Copy a UTM link** from the UTM Copy Bank for today's platform.
3. **Paste the link into the native platform editor** (Facebook, Instagram, LinkedIn, etc.).
4. After posts go live, return in 24h to see new attribution rows in the Source Attribution Rollup.
5. Use the Question Intelligence section to identify what topics real visitors are asking about.
6. Pick a Content Opportunity from section 5 that matches the top question category.
7. Use the Viral Post Builder (section 6) to get a ready-to-copy post draft.
8. Review the Weekly Executive Report (section 8) each Monday morning.

---

## Launch Readiness Panel

The Launch Readiness panel appears at the top of the Traffic Command Center and is always visible. It shows:

| Field | Meaning |
|---|---|
| **AMM Links — Safe ✓** | `askmagicmike.com` links are safe to post on all platforms including Facebook |
| **OTP Facebook Links — Blocked ⚠** | `ourtownproperties.com` links must NOT be posted on Facebook until the host WAF is fixed |
| **Post Here First** | `askmagicmike.com` — use this domain for all social posts right now |
| **Social Preview Score** | `40/42` — AMM 3/3 pass, OTP 2 Facebook blocks pending |

The **Launch Checklist** shows the exact step-by-step status. Steps marked `✓` are done. Steps marked `!` are blocked by an external action (Regency/host WAF).

The **Next Action** callout tells you exactly what to do right now without reading anything else.

---

## UTM Copy Bank

The UTM Copy Bank generates canonical campaign links for 8 posting surfaces:

| Platform | UTM Source | Medium | Content |
|---|---|---|---|
| Facebook Organic | `facebook` | `social_organic` | `facebook_post` |
| Instagram Bio | `instagram` | `social_organic` | `instagram_bio` |
| Instagram Story | `instagram` | `social_organic` | `instagram_story` |
| LinkedIn Post | `linkedin` | `social_organic` | `linkedin_post` |
| X / Twitter | `x` | `social_organic` | `x_post` |
| Threads | `threads` | `social_organic` | `threads_post` |
| Email Signature | `email` | `owned_media` | `email_signature` |
| QR Flyer / Print | `qr` | `owned_media` | `qr_flyer` |

All links use `utm_campaign=amm_launch` and only point to approved `askmagicmike.com` URLs.

**How to use:**
1. Find the row for your target platform.
2. Copy the full URL from the "Tracked URL" column (`select-all` on the monospace field).
3. Paste it into the native platform editor.
4. The UTM Copy Bank never posts for you.

---

## Which Links Are Safe Right Now

### Safe to post everywhere (including Facebook):
- `https://www.askmagicmike.com/`
- `https://www.askmagicmike.com/ask`
- `https://www.askmagicmike.com/value`
- All UTM-tagged versions of the above (from the Copy Bank)

### NOT safe to post on Facebook:
- `https://www.ourtownproperties.com/ask-mike/`
- `https://www.ourtownproperties.com/agents/mike-eatmon/`

Facebook's crawler (`facebookexternalhit/1.1`) receives HTTP 403 on `ourtownproperties.com` due to a host-level WAF rule at Liquid Web / Regency. The preview card will appear blank.

---

## Do Not Post Yet — Facebook Blocked

The **Do Not Post Yet** panel lists the exact URLs that must not be posted on Facebook.

If you post these URLs on Facebook right now:
- The link preview will show no image, no title, and no description.
- Facebook may down-rank the post.
- Users who click will still reach the page — the block only affects the preview scraper.

**Resolution:** Contact Regency / Liquid Web support and request that `facebookexternalhit/1.1` be whitelisted for `ourtownproperties.com`. This is a host-side action — no code change in this repo can fix it.

After confirmation, run:
```
pnpm run amm:verify:social-preview
```
Expected result: `42/42`. Once confirmed, update `OTP_FACEBOOK_SAFE = true` in `src/lib/admin/traffic-launch-readiness.ts`.

---

## How to Interpret Zero Traffic

If the Traffic Command Center shows zero sessions and zero leads:

1. **The system is not broken.** Zero means no real visitors have arrived yet.
2. **Post AMM links** using the UTM Copy Bank. Traffic only appears after real visitors click real links.
3. **Return in 24h.** After your first post goes live, sessions will start appearing in the Source Attribution Rollup.
4. **Do not create fake leads** to make charts look alive. Synthetic data contaminates the Lead Source Reconciliation panel in Revenue Command Center and makes source attribution meaningless.

The empty-state guidance panel on `/admin/traffic` provides the same three steps inline.

---

## How to Avoid Contaminating Analytics

- Never submit test questions through the AMM funnel from your own device without a clearly synthetic email (e.g., `qa+amm-your-name@example.com`).
- Never use `utm_source=test` or blank UTM parameters — it creates unattributed lead noise.
- Never post non-UTM links if you want to track which platform drove traffic.
- If you must test the funnel, use the existing synthetic marker pattern. Synthetic leads are automatically excluded from the Lead Source Reconciliation real-lead count.

---

## What to Do When Regency Fixes facebookexternalhit

1. Regency / Liquid Web whitelists `facebookexternalhit/1.1` for `ourtownproperties.com`.
2. Run: `pnpm run amm:verify:social-preview` — expect 42/42.
3. In `src/lib/admin/traffic-launch-readiness.ts`, set `OTP_FACEBOOK_SAFE = true`.
4. Commit with message: `fix(admin): mark OTP Facebook previews clear after host WAF fix`.
5. The Launch Readiness panel will update automatically on next deploy.
6. You can now post `ourtownproperties.com/ask-mike/` and `/agents/mike-eatmon/` links directly on Facebook.

---

## Verification Commands

```bash
# Confirm funnel is alive (run before posting)
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
| `src/lib/admin/traffic-launch-readiness.ts` | Launch gate state — AMM vs OTP safety flags |
| `src/lib/admin/utm-link-builder.ts` | UTM URL generator — all 8 platforms |
| `src/lib/admin/traffic-command.ts` | Data loader — queries Supabase, composes all modules |
| `src/lib/admin/source-attribution-rollup.ts` | Platform normalization and rollup |
| `src/lib/admin/question-intelligence.ts` | Question categorization and intent scoring |
| `src/lib/admin/content-opportunity.ts` | 25 evergreen content templates |
| `src/lib/admin/viral-post-builder.ts` | Per-platform post generation |
| `src/lib/admin/market-heatmap.ts` | Segment × platform breakdown |
| `src/lib/admin/weekly-executive-report.ts` | Weekly summary and export text |
| `src/app/(admin)/admin/traffic/page.tsx` | SSR admin page |

---

*Ask Magic Mike · Our Town Properties, Inc. · Wilson, NC*
