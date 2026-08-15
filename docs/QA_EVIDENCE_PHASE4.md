# QA Evidence — Phase 4

Date: 2026-08-15 America/New_York. Branch:
`codex/phase4-operator-readiness-2026-08-15`. Pre-release commit: `96f980c`.

## Automated validation

| Check | Result | Evidence |
| --- | --- | --- |
| Strict TypeScript | PASS | `pnpm typecheck` |
| ESLint | PASS | `pnpm lint` |
| Unit/integration tests | PASS | 156 files; 2,568 tests |
| First-live monitor tests | PASS | 2 focused tests; complete and escalation states |
| Production build | PASS | Next.js 15.5.21; 61 active routes |
| Route manifest | PASS | 61 active; 15 acknowledged root/src duplicates |
| Release safety | PASS | 14 controls, 0 failures |
| Dependency audit | PASS | No known vulnerabilities at `high` threshold or above |
| Git history secret scan | PASS | Gitleaks returned 0 findings for tracked history |
| Production public monitor | PASS | 9/9 checks |
| Production funnel | PASS | 15/15 checks |
| System isolation | PASS | Canonical project verified; no deployable NellySelly identifiers |
| Social preview | PARTIAL | 40/42; Facebook 403 on two Our Town paths |
| First-live production cron | PASS | Authenticated Production invocation HTTP 200; anonymous invocation HTTP 401 |

The local shell uses Node 26.5.1 while the repository requires Node 24.x. This
produces an engine warning but no test or build failure; GitHub CI runs the
required Node 24 release gate.

## Production data evidence

- Before and after the additive index: 0 live prospects, 6 QA records, 0
  unsuppressed QA records.
- Notification queue depth: 0.
- Two historical failures are suppressed QA email alerts from 2026-08-11; live
  notification failures: 0.
- Web Push devices: 0. No Push test was sent.
- No production lead submission was made in Phase 4.
- No genuine record was suppressed, edited, or used as QA.
- No consumer message or carrier SMS was sent.

## First-live monitor acceptance

- Immediate post-capture execution is limited to `is_test=false`.
- Two-minute cron route requires bearer authentication.
- Detection requires valid timestamp/type plus canonical consent/source.
- One partial unique index prevents duplicate detection/escalation per lead.
- Missing consent/source/assignment/internal email, delivery failure, or
  duplicate suspicion creates a PII-minimized escalation event.
- Contact data, consent text, source URLs, reset data, Push endpoints, and
  provider payloads are not logged by the monitor.
- The monitor does not send a consumer message.

## WordPress and attribution

- Form 3 remains the only allowlisted form; no form configuration was changed.
- Exact duplicate Form 3 native notification remains inactive.
- Forms 1, 2, 5, 6, and 7 have an editable BIC approval source but remain held.
- Entry 1550 remains protected, WordPress-only, and not repurposed.
- Fourteen public tagged destinations return valid public pages after correcting
  the open-house destination to a route with a non-private slug.
- Fourteen QR SVGs and a ZIP were generated. Camera-device scan confirmation is
  still a physical acceptance action; route-level HTTP checks passed.

## Intentional non-passes

- Meta crawler: 40/42, not passed; exact hosting action documented.
- Web Push receipt/revocation: not run; no physical device permission.
- Mike role UI after activation: not run; Mike has not chosen a password.
- Native PPTX/XLSX/PDF artifact generation: not run because the required office
  artifact runtime is unavailable in this session. Editable Markdown/CSV source
  is provided; no PDF image was mislabeled as an editable deck.
