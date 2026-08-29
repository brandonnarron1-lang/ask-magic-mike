# Home-value completion integrity QA evidence

Date: 2026-08-28

Candidate: Draft PR #215 on
`codex/phase9-home-value-completion-integrity-20260824`

Parent: exact sealed Draft PR #214 head
`81a2c7544318d630437ed3e86cbea029c5c9b57d`

Pre-refresh recovery branch:
`rescue/amm-pr215-pre-pr214-exact-seal-20260828-224229`

The earlier `rescue/amm-pr215-pre-pr214-seal-sync-20260824-1329` ref remains
historical. The exact-parent refresh conflicted only in additive changelog,
QA-evidence, and release-authority records. No funnel, API, lead-lifecycle,
notification, provider, or analytics application file required manual conflict
resolution.
The exact application/parent-refresh head is
`eff8fc04449fab4fd34cd0fb69735e6787d0b382`. The evidence-only commit that
records its results must repeat exact-head CI and protected Preview proof before
the later release gate.

## Data-quality evidence

`docs/phase9/analysis/home_value_completion_integrity.sql` is the exact
read-only bounded aggregate query reviewed against canonical Neon Production.
It excludes registered QA/test UTM markers and returns only stage, event name,
event count, and observation bounds. It contains no lead identity or contact
data.

`docs/phase9/analysis/home_value_completion_integrity.ipynb` executed
top-to-bottom with `nbconvert` and reproduced 1 funnel start, 1 address
submission, 1 contact submission, and 0 durable lead-created events. Its input
contract and aggregate-only output checks passed. The result is an observed
storage gap of one event, not a unique-person conversion rate.

The companion MCP report passed `validate_artifact` after the session-coverage
field was represented as reader-safe text, then rendered exactly once. Its
chart, reviewed rows, recommendations, sources, questions, and caveats use the
same bounded aggregate snapshot.

## Automated local evidence

All project commands use exact Node 24.18.0.

Focused durable-write, UI, replay, privacy, and error-hygiene regression:

```bash
pnpm exec vitest run \
  tests/leadops/api-leads-route.test.ts \
  tests/public/home-value-inline-validation.test.tsx \
  tests/leadops/client-replay-analytics.test.tsx \
  tests/analytics/client-analytics-privacy.test.ts \
  tests/leadops/public-error-hygiene.test.ts
```

Result on the exact application head, including the release-authority contract:
6 files / 50 tests passed. Coverage includes malformed email, short phone,
overlong phone, email-only durable success, consent-channel accuracy, safe
durable-failure telemetry, and exact predecessor/recovery authority.

Full local release proof before documentation sealing:

- Vitest: 236 files / 3,108 tests passed;
- strict TypeScript: passed;
- full ESLint: passed;
- optimized Next.js 15.5.21 build: passed, 52 generated pages;
- route manifest: 84 active routes / 17 acknowledged root-`src` duplicates;
- release doctor: 43/43 passed;
- release safety: 14/14 passed;
- Ask Magic Mike / NellySelly deployable-source isolation: passed;
- Production dependency audit: no known vulnerabilities; and
- redacted gitleaks history scan: 646 commits / no leaks; and
- `git diff --check`: passed.

GitHub Release Gate run `33229869967` passed against exact application head
`eff8fc04449fab4fd34cd0fb69735e6787d0b382`. Artifact `9708168965` has digest
`sha256:09f00d64c6f9c9ab593529c5a67da4981ce5d350eec4700fc3d59a30620af2c2`.

## Immutable Preview and protected no-write acceptance

Vercel deployment `dpl_8qNH7Ry1gSPqdSwHrRNM3Y9LHhZR` is READY at
`https://ask-magic-mike-ao5u74sfz-eyes-up-industries.vercel.app` and records the
exact application head and PR #215 branch.

Protected GitHub run `33230015801` checked out exact target `eff8fc0` and
passed:

- 236 files / 3,108 tests, typecheck, lint, optimized build, release doctor,
  and release safety;
- 17 read-only Preview checks, six deliberate `SAFE_DB_WRITE=false` mutation
  skips, and zero failures;
- 3/3 browser checks with lead and telemetry endpoints intercepted, zero
  unexpected, flaky, or skipped tests;
- release-candidate `GO`; and
- launch authority `PREVIEW_READY`.

Artifact `9708219853` has digest
`sha256:17c4339d2c62846df1191b5a94acd107c78a130d09cac40ba40d899eadd1e6e9`.

## Current-run exact Preview visual acceptance

The in-app Browser inspected the exact immutable Preview at 1280 × 720,
390 × 844, and 320 × 700. Every width had document width equal to client width.
The empty-address path focused the address field and rendered the specific
live-region alert “Enter the full property address so Mike can review the right
home.” No contact identity was entered and no lead endpoint was called.

Accepted current-run captures are stored outside the repository at:

- `/Users/brandonnarron/.codex/artifacts/amm-pr215-visual-qa-20260829/01-home-value-desktop-1280x720.jpg`;
- `/Users/brandonnarron/.codex/artifacts/amm-pr215-visual-qa-20260829/02-home-value-mobile-390x844.jpg`;
- `/Users/brandonnarron/.codex/artifacts/amm-pr215-visual-qa-20260829/03-home-value-mobile-validation-390x844.jpg`; and
- `/Users/brandonnarron/.codex/artifacts/amm-pr215-visual-qa-20260829/04-home-value-mobile-320x700.jpg`.

The exact deployment window contained 49 info-level request records: 40 GET,
five OPTIONS, and four page-load telemetry POSTs (two `/api/events`, two
`/api/experiments/event`). It contained no `/api/leads`, notification, webhook,
message, or provider request and no warning/error/fatal record. The telemetry
POSTs are recorded as Preview visual-inspection side effects; they are not lead
or delivery proof.

The final branch head must repeat focused/full tests, typecheck, lint, optimized
build/route proof, release safety, isolation, dependency audit, redacted secret
scan, and whitespace proof after every code or evidence change.

## Required write-intercepted browser acceptance

The immutable Preview acceptance must intercept `/api/leads`, `/api/events`,
and `/api/experiments/event`; no request may reach the canonical database.

Required success path:

1. Address advances to `Step 2 of 3`.
2. Phone is labeled optional and empty.
3. Valid name/email can activate Request Valuation.
4. Exactly one intercepted `/api/leads` request contains the existing
   idempotency key and blank phone.
5. Synthetic durable success advances to `Step 3 of 3`.
6. The page and form have no horizontal overflow at 390 × 844 and desktop.

Required failure path:

1. Synthetic `/api/leads` failure remains on `Step 2 of 3`.
2. A visible recoverable error is present.
3. `lead_submit_failed` is emitted and `lead_created` is not.
4. No analytics payload contains the synthetic email, address, raw provider
   response, or canonical lead identifier.

Keyboard labels, required/optional semantics, focus recovery, and clean browser
warning/error output must also pass.

## Local optimized-browser acceptance

The exact local optimized build was served through Next.js and all browser
writes were intercepted before navigation. `/api/leads` returned fixed
synthetic success or failure; `/api/events`, `/api/analytics/event`, and
`/api/experiments/event` returned synthetic acceptance. No request reached
Neon, Resend, a notification queue, or another provider.

Accepted 390 × 844 email-only success proof:

- Address advanced to `Step 2 of 3` and focused Your name.
- Email was required; `Phone (optional)` had no `required` attribute.
- Exactly one intercepted lead request used `home_value` /
  `home_value_page`, had blank phone, and carried equal non-empty body/header
  idempotency keys.
- Selected consent produced `consent=true`, `consent_email=true`, and
  `consent_call=false` because the phone remained blank.
- The synthetic success advanced to `Step 3 of 3` and retained the broker-
  reviewed/not-an-appraisal/`Not a survey.` copy.
- Document client/scroll width was 375 / 375 at viewport width 390.
- Twelve intercepted analytics calls contained no synthetic email or address.
- Browser output contained zero warning/error entries.

Accepted failure proof at the same viewport:

- one intercepted 500 stayed on Contact and rendered a recoverable alert;
- `lead_submit_failed` was present and `lead_created` absent;
- analytics contained no synthetic email, address, or intercepted provider
  error text; and
- document client/scroll width remained 375 / 375.

The browser recorded the intentionally intercepted 500 as one failed network
resource. It is expected failure-path evidence, not an application exception;
the success and desktop sessions had zero warning/error entries.

Accepted 1280 × 720 Contact proof showed the complete combined form,
`Phone (optional)`, no required phone attribute, one canonical progress card,
and document client/scroll width 1,265 / 1,265.

Accepted local artifacts remain under the ignored directory:

- `output/playwright/phase9-home-value-completion-integrity/.playwright-cli/page-2026-08-24T13-35-22-273Z.png`;
- `output/playwright/phase9-home-value-completion-integrity/.playwright-cli/element-2026-08-24T13-38-15-960Z.png`;
- `output/playwright/phase9-home-value-completion-integrity/.playwright-cli/page-2026-08-24T13-37-36-984Z.png`; and
- `output/playwright/phase9-home-value-completion-integrity/.playwright-cli/page-2026-08-24T13-36-32-566Z.png`.

One earlier success capture was rejected after interception exposed that the
server still held the pre-fix optimized bundle and recorded call consent with
blank phone. The server was stopped, the corrected source rebuilt, and every
accepted result above came from the replacement optimized bundle.

The existing DB-mutation-free Widget/keyboard Playwright suite also passed
3/3 against this optimized server: intercepted widget success, intercepted
widget failure, and shared skip-link focus transfer.

## Safety boundary

No Production, environment, database row/migration, lead/event, notification,
email/BCC, consumer acknowledgment, SMS/MMS, Push, provider, WordPress/GTM/GA4,
DNS, publication, spend, deletion, or NellySelly action is authorized by this
candidate or its browser proof.
