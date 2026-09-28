# Consumer acknowledgment verification

Status: `VERIFIED_NOT_PRODUCTION`

Verified on 2026-09-28 in the preserved worktree
`/Users/brandonnarron/.codex/worktrees/ask-magic-mike/consumer-ack-20260928`.
The branch is based on Draft PR #274 (`cd259391bce3a149206d6a55bba4b9a3af54e749`)
and remains isolated from Production.

## Architecture

The additive `capture_public_lead_v3` function wraps the existing
`capture_public_lead_v2` transaction. It derives acknowledgment eligibility
from the canonical stored lead and creates at most one PII-minimized
`consumer_ack` outbox intent in that same transaction. The provider is not
called inside PostgreSQL. Existing v2 callers remain available as the rollback
path.

The application uses v3 for canonical capture and requests an acknowledgment
intent only when `CONSUMER_ACKNOWLEDGMENT_ENABLED=true`. Delivery remains
separately protected by the existing provider/runtime controls.

## Proved behavior

- Affirmative email consent with timestamp and exact language evidence creates
  exactly one acknowledgment intent.
- Missing email, missing consent evidence, suppression, or `is_test=true`
  creates no acknowledgment intent.
- Idempotent replay does not create a duplicate intent.
- A failed acknowledgment-intent insert rolls back the wrapped v2 effects.
- Disabled notification mode records a skipped intent and sends nothing.
- The outbox stores `email_configured`, not the consumer email address.
- Retry renders only the recorded supported template version and permanently
  fails unsupported versions.
- Execute privilege is revoked from `PUBLIC`, `anon`, and `authenticated` and
  granted only to `service_role`.

## Evidence

Focused Vitest run:

- 6 test files passed.
- 83 tests passed.
- strict TypeScript check passed.

Complete release gate:

- system-isolation verification passed;
- release safety passed 14/14 checks;
- 304 test files and 3,682 tests passed;
- strict typecheck and lint passed;
- optimized Next.js production build passed;
- route manifest passed with 102 active routes and 22 acknowledged root/src
  duplicates.

Disposable PostgreSQL contract:

- PostgreSQL 17.11.
- stored-consent eligibility passed;
- suppression and QA exclusion passed;
- replay/idempotency passed;
- disabled-mode behavior passed;
- PII minimization passed;
- atomic rollback passed.

Primary candidate hashes:

- migration: `c845eff85259bfb803563b53c657762a4141ad8a2a181ee3950747d396f1f913`
- PostgreSQL verifier: `eb23f6d317b8e3ce1b5fe8117e37fde8351e319111ecb2b92de1a3415112731f`
- static contract test: `7c06372e5e646ca20e655e55df9094e2d6dc17734a791f74f5f363c6627b358e`

No secret-pattern hit was found in the candidate diff or new files.

## Release boundaries

No Production migration, application merge, provider enablement, consumer send,
or environment change is authorized by this document.

Required future gates remain separate and ordered:

1. apply and verify the additive Production migration;
2. release the application from the exact reviewed commit;
3. explicitly enable the runtime/provider control, if approved;
4. perform one separately approved consumer-send acceptance test.

Rollback is to restore the application to v2, verify capture, and only then
drop the additive v3 function if removal is still necessary.
