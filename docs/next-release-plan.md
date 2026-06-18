# Next Release Plan — Ask Magic Mike Launch Operations Readiness

Generated from code + live inspection on 2026-06-18.

---

## 1. Verified Production State

| Item | Status |
|------|--------|
| `www.askmagicmike.com` | HTTP 200, Vercel-served ✅ |
| `askmagicmike.com` apex | HTTP 308 → www redirect ✅ |
| `ask-magic-mike.vercel.app` | HTTP 200 (fallback alias) ✅ |
| PR #11 backend attribution | MERGED ✅ |
| PR #12 Mike Lead Command Center | MERGED ✅ |
| PR #13 brand/domain integration | MERGED ✅ |
| PR #10 | CLOSED (superseded) ✅ |
| main head | `cbf47c9` ✅ |

---

## 2. Confirmed Product Gaps (from code + live inspection)

### E — `og:url` missing from live HTML

`curl -sL https://www.askmagicmike.com | grep og:url` returns nothing.

Root cause: `src/app/layout.tsx` defines `openGraph` metadata without an explicit `url` field.
Next.js App Router does NOT auto-inject `og:url` from `metadataBase` — it must be explicit.
`<link rel="canonical">` and `metadataBase` are present, but `<meta property="og:url">` is absent.

Impact: Social crawlers (Facebook, Slack, LinkedIn, iMessage) cannot confirm the canonical URL
when rendering link previews. This means AMM links shared by Mike or clients may resolve
to the Vercel alias URL instead of www.askmagicmike.com in previews.

### B — Admin funnel metrics exist in code but not the UI

`src/lib/admin/dashboard-metrics.ts` (`loadDashboardMetrics()`) and
`src/app/api/admin/dashboard/route.ts` already implement:
- `newToday`, `hot`, `unassigned`, `overdueSla`, `contacted`
- `bySource` (UTM/source breakdown)
- `recentLeads` with grade, status, type

The admin dashboard UI (`src/app/(admin)/admin/page.tsx`) only shows 4 tiles
(total, urgent, hot, SLA breached) using the simpler `getLeadsForAdmin()`.
The richer `loadDashboardMetrics()` is available but not wired to the UI.

Impact: Mike can't see where leads are coming from (UTM/source breakdown) or
conversion funnel status (contacted, appointments, seller vs buyer split)
without raw DB access.

### A — No write-path production smoke script

`scripts/synthetic-monitor.mjs` is GET-only by design — it explicitly forbids POST.
There is no script that verifies `POST /api/session/create` (the critical write path),
cleans up after itself, and can be run safely against production to confirm a rotation
or deploy is healthy.

Impact: After service-role key rotations or major deploys, confirming the write path
works requires manual curl or waiting for real user traffic.

### G — Stale production gate doc

`docs/PRODUCTION_LAUNCH_GATE.md` references `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_ANON_KEY`
which do not match the actual env var names in use (`NEXT_PUBLIC_SITE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`). This will mislead anyone using the gate checklist
for a new environment setup.

---

## 3. Candidate Releases Ranked

| # | Theme | Impact | Risk | Chosen |
|---|-------|--------|------|--------|
| 1 | E — og:url fix + compliance test | High (SEO/social sharing) | Very low (1-line metadata change) | ✅ |
| 2 | B — Admin funnel metrics in UI | High (launch ops visibility) | Low (read-only admin UI, existing data) | ✅ |
| 3 | A — Production smoke write-path script | High (ops safety confidence) | Low (isolated script, no production writes by default) | ✅ |
| 4 | G — Stale launch gate doc fix | Medium (onboarding clarity) | Very low (doc only) | ✅ |
| 5 | F — Conversion polish | Medium | Medium (hero/copy changes) | ❌ next PR |
| 6 | D — Market intelligence content | Medium | High (MLS compliance complexity) | ❌ future |

---

## 4. Chosen Release Scope

**"Launch Operations Readiness"**

Exactly four focused changes that require no migration, no env changes, no key rotation,
no Supabase dashboard changes, and no GitHub ruleset changes.

---

## 5. Files Expected to Change

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Add `url: SITE_URL` to `openGraph` config |
| `src/app/(admin)/admin/page.tsx` | Wire `loadDashboardMetrics()` to add source breakdown + funnel tiles |
| `scripts/prod-smoke.mjs` | New: production smoke script (write-path verification, cleanup, secret-safe) |
| `tests/compliance/value-copy.test.ts` | Add `og:url` compliance test |
| `tests/scripts/prod-smoke.test.ts` | New: unit tests for smoke lib functions |
| `docs/PRODUCTION_LAUNCH_GATE.md` | Fix stale env var names |

---

## 6. Files Explicitly Out of Scope

- `.env.local` — not touched
- `supabase/migrations/**` — no migrations
- `src/app/api/**` — no backend changes
- `src/lib/engines/**` — no engine changes
- `src/lib/leads/**` — no lead logic changes
- `.github/**` — no workflow changes
- `package.json` / `pnpm-lock.yaml` — no dependency changes
- All `src/components/campaign/**` — no campaign components
- `public/ask-magic-mike/v8/**` — not touched

---

## 7. Test Plan

- `npm run typecheck` — must be clean
- `npm test` — all 413+ existing tests must pass; new tests added
- `npm run lint` — clean
- `npm run build` — clean
- Compliance test: `og:url` explicitly present in `layout.tsx`
- Smoke test: lib functions cover URL validation, session response parsing, cleanup logic
- Preview deploy: CI green, no console errors, admin page loads with source breakdown

---

## 8. Rollback Plan

All changes are code-only. No data mutations, no infrastructure changes.

- Revert: `git revert <merge-commit>` on main
- Admin page: reverting removes the new metric tiles; existing lead list is unchanged
- layout.tsx: reverting removes `og:url`; no functional regression
- Smoke script: deleting the file removes the script; no production impact

---

## 9. Secret/Data Safety Plan

- `prod-smoke.mjs` defaults to no write (session-create POST is opt-in via `--write` flag)
- Never prints env var values — only `true/false` presence flags
- Any test sessions created are marked `amm_smoke_do_not_contact` and cleaned up
- Admin metric tiles are read-only aggregates — no PII displayed beyond existing lead table
- No secrets stored in any new file

---

## 10. Why This Is the Next Best Step

Ask Magic Mike is now live and indexed, but:
- Links shared by Mike don't render a correct og:url in iMessage/Slack/Facebook previews
- Mike can't see where leads are coming from without raw DB access
- After each deploy/rotation, there's no safe way to verify the write path without manual curl

This release fixes all three with zero risk to production data, zero env changes, and
zero infrastructure changes. It's the diff between "deployed" and "operationally visible."
