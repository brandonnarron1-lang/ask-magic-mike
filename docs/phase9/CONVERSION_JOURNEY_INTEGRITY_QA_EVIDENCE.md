# Phase 9 conversion-journey integrity QA evidence

Captured: 2026-08-23 EDT

Production mutation: no form, lead, message, provider, WordPress, or schema
mutation

## Live audit

- The Codex in-app browser inspected the released homepage, Home Value,
  seller, buyer, Ask Mike, and renter journeys with unmistakable
  `internal_qa_audit` query values and stopped before form submission.
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

## Local visual acceptance

- Built candidate served from the optimized Next.js build with no Production
  secrets or canonical database configuration.
- Production and candidate renter screenshots were compared at the same mobile
  state. The only intended visual delta is a short, restrained contact-method
  hint using existing tokens; field, consent, action, footer, and responsive
  composition remain unchanged.
- A blank local submit made no API request, focused Email, set
  `aria-invalid="true"` on both either-or contact choices, associated both the
  requirement and error, rendered an alert, and retained zero horizontal
  overflow and zero browser warnings/errors.

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

## Remaining exact-head proof

The commit tree passes the complete local Node 24.18.0 release gate: system
isolation, 14/14 release safety, 221 files / 2,991 tests, strict typecheck,
ESLint, optimized Next.js 15.5.21 build with 52 static pages, and the 83 active /
17 acknowledged-duplicate route manifest. Exact-head GitHub Node 24 CI,
immutable Vercel Preview, and protected no-write Preview QA still must pass
after push. No predecessor approval can authorize this later candidate.

## Safety boundary

- Candidate SQL/migration delta: none.
- No live form, lead, notification, acknowledgment, provider, WordPress,
  publication, DNS, spend, deletion, or NellySelly action.
- Test identities and responses are explicitly synthetic and do not represent
  a live prospect.
