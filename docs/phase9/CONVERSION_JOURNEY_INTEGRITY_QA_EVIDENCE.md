# Phase 9 conversion-journey integrity QA evidence

Captured: 2026-08-23 EDT

Production mutation: no form, lead, message, provider, WordPress, or schema
mutation

## Live audit

- The original PR #200 evidence inspected the released homepage, Home Value,
  seller, buyer, Ask Mike, and renter journeys and stopped before form
  submission. The current fast-track audit independently rechecked the
  canonical homepage and Buyer path at 390×844.
- Before current navigation, Playwright mocked `/api/leads`, `/api/events`,
  `/api/experiments/event`, `/api/widget/events`, Google Analytics/GTM, and
  Facebook collection. No application or third-party analytics write was
  permitted.
- Current Production reproduced the precise gap: blank Buyer submit rendered
  the either-or contact status but retained focus on the submit button. The
  Home Value intake advanced from address to the required name/email step.
- Desktop and mobile layouts retained the released Black Diamond identity,
  readable hierarchy, responsive fields, working public navigation, one main
  landmark, and no observed horizontal overflow or browser warning/error.
- The browser audit deliberately performed no lead, appointment, chat, or
  message action. Normal public page initialization and server access logs are
  outside the candidate diff and are not represented as lead proof.

## Focused contract proof

The focused Vitest matrix covers:

- immutable first-touch plus fresh tagged last-touch campaign replacement;
- untagged internal navigation with preserved acquired campaign and updated
  submission context;
- fail-open behavior when session storage is unavailable;
- normalized and privacy-registered `renter_page` identity;
- visible and programmatically associated email-or-phone requirement;
- invalid-contact focus and alert behavior;
- idempotent replay suppression; and
- exactly one `lead_created` event for a newly stored buyer response.

Current focused command:

```text
npm run test -- --run \
  tests/public/buyer-intent-contact.test.tsx \
  tests/attribution/black-diamond-attribution.test.ts \
  tests/leadops/normalize-payload.test.ts \
  tests/analytics/client-analytics-privacy.test.ts
```

Result: 4 files / 42 tests passed.

The isolated fast-track complete suite passes 220 files / 2,991 tests on Node
24.18.0.

## Local rendered acceptance

- Built candidate served from the optimized Next.js build with no Production
  secrets or canonical database configuration.
- Mobile Buyer and Renter flows were inspected at 390×844. The only intended
  visual delta is a short, restrained contact-method hint using existing
  tokens; field, consent, action, footer, and responsive composition remain
  unchanged.
- First and repeated blank Buyer submits made no lead request, focused Email,
  set `aria-invalid="true"` on both either-or contact choices, associated both
  requirement and alert IDs, rendered an assertive alert, retained one main,
  had no horizontal overflow, and produced zero browser warnings/errors.
- A mocked local Renter success request contained `funnel_type=renter`,
  `lead_type=renter`, and `lead_source_surface=renter_page`. Its attribution
  kept the earlier Buyer first touch while updating the Renter last touch.

## Candidate security review

- The changed browser path stores attribution only; it does not place session,
  authentication, database, provider, or deployment secrets in Web Storage.
- Storage and URL values remain attacker-controlled input. The canonical API
  normalizes the bounded request before parameterized Neon persistence, and
  React renders the new helper/error copy without an HTML injection sink.
- The candidate adds no dynamic code execution, untrusted navigation,
  cross-origin destination, `postMessage`, client environment value, raw SQL,
  migration, authorization bypass, or delivery-provider path.
- `gitleaks --staged --redact=100`, dependency audit, patch-integrity, and empty
  migration-delta checks pass.

## Fast-track local gate and remaining exact-head proof

The isolated branch starts from exact final PR #202 head
`26047176b78006230ce6064a5ee53f9c0561ef2a` and reuses exact PR #200
implementation commit `91e05c06a7adfceba22d35c36cb7a2105da9a36b`. Application
and test files applied without conflict; the original PR #200 remains
unchanged. Exact Node 24.18.0 local proof passes 4 focused files / 42 tests, 220
files / 2,991 tests, strict typecheck, ESLint, optimized Next.js 15.5.21 build
with 52 static pages, 82 active / 17 acknowledged duplicate routes, 14/14
release safety, system isolation, no-vulnerability Production dependency
audit, diff integrity, an empty migration delta, and a staged redacted Gitleaks
scan of approximately 28.73 KB with no leak.

Application head `a86eece1f2b18ceb064d109912c5b77314d2aca9` passed exact-head
GitHub Node 24 release run `32660966818` (job `97246974974`, artifact
`9498765744`, digest
`sha256:aad3bc9d8dfc9d12eef95aaa80848eac59e5432e2b53dd04860f33b091a9fd73`).
Vercel Preview deployment `dpl_DQUyVzLXPmvyjghqUVzPtqoDuHcq` is READY at
`https://ask-magic-mike-a0x610tpg-eyes-up-industries.vercel.app`; its build log
identifies the exact branch and application commit. Protected no-write run
`32661259833` (job `97247695421`, artifact `9498840303`, digest
`sha256:9130e7665cabdce978543e594288587f2fc59095d5999524fb7d70cf4727a034`)
passed 17 read-only checks with six intentional write skips and zero failures,
Widget 2/2, release doctor 43/43, release safety 14/14, release candidate GO,
and `PREVIEW_READY`. Runtime log queries returned zero fatal, error, or warning
entries. Health identified exact commit `a86eece...`, Preview application and
database environments, `safe_for_preview_mutation=false`, and live email/SMS
disabled.

This evidence-only documentation seal must receive its own exact-head CI and
Preview checks before the Draft PR is considered fully sealed. No PR #202 or
historical approval can authorize this later candidate.

## Safety boundary

- Candidate SQL/migration delta: none.
- No live form, lead, notification, acknowledgment, provider, WordPress,
  publication, DNS, spend, deletion, or NellySelly action.
- Test identities and responses are explicitly synthetic and do not represent
  a live prospect.
