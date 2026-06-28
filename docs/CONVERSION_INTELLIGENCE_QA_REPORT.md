# Conversion Intelligence + QA Control Tower — Sprint Report
# Ask Magic Mike · Our Town Properties · Wilson, NC
# Completed: 2026-06-16

---

## Mission

Advance from "launched and tracked" to "operator-controlled revenue intelligence." Specific goals:

1. Eliminate three divergent synthetic lead detection implementations
2. Ensure QA/test leads cannot corrupt SLA sweep or follow-up queues
3. Surface synthetic leads visually in the admin lead list
4. Write tests proving isolation holds
5. Produce the first 72-hour launch command doc

---

## What Was Done

### Phase 1 — Shared Synthetic Detection Module

**Created:** `src/lib/leads/synthetic-detection.ts`

Single source of truth for synthetic/QA email detection. Combines all markers from the three
prior implementations that had drifted apart:

- Generic QA patterns: `@example.com`, `@test.com`, `+qa`, `+test`, `+synthetic`, `test@`, `synthetic@`
- AMM-specific operational markers: `qa+amm-`, `amm-wordpress-smoke`, `amm-wordpress-attribution-smoke`, `amm_wordpress`, `do_not_contact`
- Case-insensitive matching throughout

All callers now import from this module. To add a new test marker: edit one file, all callers pick it up.

---

### Phase 2 — Call-Site Consolidation

**Updated:** `src/lib/admin/revenue-command.ts`
- Removed 12-line local `SYNTHETIC_MARKERS` const + `isSyntheticEmail` function
- Added `import { isSyntheticEmail } from "@/lib/leads/synthetic-detection"`
- Re-exports `isSyntheticEmail` for backward compatibility with existing tests

**Updated:** `src/lib/admin/next-best-action.ts`
- Removed local `SYNTHETIC_EMAIL_MARKERS` array + `isSyntheticLead` function
- Added import from shared module
- Kept backward-compatible `isSyntheticLead` alias for existing tests

**Updated:** `src/lib/admin/traffic-command.ts`
- Removed local `SYNTHETIC_MARKERS` const + `isSyntheticEmail` function
- Added import from shared module
- No behavioral change: synthetic7d metric still counts synthetic leads for QA visibility

---

### Phase 3 — SLA Sweep Synthetic Exclusion

**Updated:** `src/lib/engines/sla-sweep.ts`

Before this sprint: `createSupabaseSlaSweepRepo.fetchOpenLeadStates()` selected `id, created_at, lead_grade, last_contacted_at, status` — no email field. Synthetic/QA leads were included in every sweep, generating false SLA breach alerts.

After: `email` added to the Supabase select. Rows are filtered via `isSyntheticEmail()` before being mapped to `LeadSlaState`. QA leads never reach `SlaSweepEngine.sweep()`.

No changes to `LeadSlaState` interface — filtering at the repo layer is the right boundary.

**Verified:** `createAdminClient` already casts through `any` for schema flexibility; adding `email` to the select requires no migration.

---

### Phase 4 — Admin Lead List Synthetic Badge

**Updated:** `src/app/(admin)/admin/leads/page.tsx`
- Added `import { isSyntheticEmail } from "@/lib/leads/synthetic-detection"`
- QA leads now show a purple **QA** chip next to the name in the lead list
- Style: `bg-purple-500/[0.12] border-purple-400/40 text-purple-300` — visually distinct from all existing grade/temp chips
- Zero impact on layout for real leads (chip only renders when `isSyntheticEmail(l.email)` is true)

---

### Phase 5 — Tests

**Created:** `tests/leads/synthetic-detection.test.ts` — 16 tests
- Null/undefined/empty: safe returns false
- All 13 SYNTHETIC_EMAIL_MARKERS individually verified
- Case-insensitivity across markers
- Meta-test: every marker in the exported array is detectable

**Extended:** `tests/engines/sla-sweep.test.ts` — +1 test (4 total)
- New: "does not sweep synthetic/QA leads when repo applies synthetic filter"
- Creates a fakeRepo that mirrors the Supabase impl's filter
- Verifies `report.scanned = 1` (only real lead), `qa-lead` absent from breaches, `real-lead` present

**All 20 tests passing. TypeScript clean.**

---

### Phase 6 — Documentation

**Created:** `docs/FIRST_72_HOUR_COMMAND_PLAN.md`
- Pre-launch checklist (PRs, env, lead test, cron)
- Hour-by-hour sequence: Hours 0–2 (prod smoke), 2–8 (WordPress), 8–24 (social + email), 24–48 (nurture), 48–72 (velocity assessment)
- Daily admin routine (10–15 min/day)
- Stop conditions
- Success/failure metrics at Hour 72
- Green/yellow/red traffic ramp table

---

## Synthetic Isolation Summary

| Caller | Before | After |
|--------|--------|-------|
| `revenue-command.ts` | Local 6-marker impl | Shared module (13 markers) |
| `next-best-action.ts` | Local 7-marker impl | Shared module (13 markers) |
| `traffic-command.ts` | Local 6-marker impl | Shared module (13 markers) |
| SLA sweep | No exclusion | Filtered at repo layer |
| Admin lead list | No badge | Purple QA chip |

---

## What Was NOT Changed

- No schema changes
- No Supabase migrations
- No env var changes
- No marketing posts sent
- No outbound email/SMS
- No production data altered
- No secrets in any commit

---

## Pending Owner Actions

These require Brandon or Mike to execute manually (cannot be automated):

1. **Merge this PR** — `conversion-intelligence-qa-control-tower`
2. **Merge PRs #69, #70, #71** (prior sprints, all blocked on 1-approval ruleset)
   ```
   gh pr review 69 --approve && gh pr merge 69 --squash
   gh pr review 70 --approve && gh pr merge 70 --squash
   gh pr review 71 --approve && gh pr merge 71 --squash
   ```
3. **Execute the 72-hour launch plan** per `docs/FIRST_72_HOUR_COMMAND_PLAN.md`
4. **Install WordPress CTAs** per `docs/wordpress-cta-snippets.md`
5. **Verify Vercel Pro** is active (required for cron to run SLA sweep)

---

## Next Sprint Candidates

- Organic content pipeline from top questions (`/admin/traffic` → Question Intelligence)
- Attribution backfill for pre-launch leads
- Lead scoring review (calibrate A+/A thresholds against first real cohort)
- Facebook/Instagram paid ad UTM flow (when ready to spend)
