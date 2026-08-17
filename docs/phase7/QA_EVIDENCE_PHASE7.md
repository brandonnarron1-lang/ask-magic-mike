# QA evidence — Phase 7

Evidence is appended only from executed commands and deployed checks.

## Current-release Production Copilot acceptance

- The first authenticated attempt failed closed because the deployed query still referenced payload-era columns (`funnel_type`, `lead_source_surface`, and related names). The UI reported that no lead data or communication state changed; Production logs identified the exact canonical-schema mismatch.
- PR 166 aligned the synchronous Copilot endpoint, asynchronous Neon intelligence loader, and communication-permission repository to the canonical lead columns and added a Production-schema regression test. The full release gate passed 175 test files / 2,647 tests, typecheck, lint, optimized build, 72-route manifest, 14/14 release-safety controls, and Ask Magic Mike/NellySelly isolation. PR 166 merged as `275f06e5857aceab2c79d499a3d29766c2c59c19`.
- Deployment `dpl_7uQC5a9xudCNAN1HEAiBWdBZ7iC9` is Ready and canonical. The existing encrypted OpenAI key was reused unchanged. Production-only `AI_TIMEOUT_MS=20000` was added after the default eight-second timeout produced a transparent deterministic fallback; no retry, model, cap, key, or automatic-action setting changed.
- Authenticated Lead Center acceptance on suppressed test lead `59bba7cf-fe27-42c3-adb6-27b27727e5c7` returned a strict provider-backed advisory: `openai_responses`, `gpt-5.6-luna`, 835 input tokens, 964 output tokens, estimated cost `$0.006619`, and 7,624 ms latency. The result explicitly said not to call, email, or text and routed the item only to QA/operations review.
- Read-only Neon Production verification returned one intelligence row and two usage rows (the earlier fail-closed attempt and the final success). The latest row has no fallback reason. The lead remains test-only, communication-suppressed, assigned, score 83, with unchanged assignee and null contact/follow-up timestamps.
- Final public checks passed: smoke 19/19 with two intentional skips, funnel 15/15, and monitor 6/6 with one intentional skip. No error-level Vercel logs exist from the final deployment timestamp onward. No outbound communication or lead-state mutation occurred.
- Final redacted repository scan covered 376 commits and found no secret leak.

## Provider-lifecycle hardening addendum

- The signed Resend route now preserves `sent_at` for accepted delivery events and records the latest normalized provider event/time in safe notification metadata.
- `email.delivered` records an explicit delivery-confirmed marker; later open/click events cannot regress it. Bounce, complaint, and failed events retain terminal-failure handling and suppression behavior.
- The protected Notification Center now displays the latest provider event and provider timestamp without exposing raw webhook payloads.
- Focused webhook verification: 6 tests passed for invalid signatures, delivery metadata, delayed delivery, duplicate replay, complaint suppression, and terminal bounce handling.
- Full release gate on 2026-08-16: 172 test files / 2,624 tests passed; typecheck, lint, optimized Next.js build, 70-route manifest, 14-control release-safety scan, and Ask Magic Mike/NellySelly isolation all passed.
- PR 161 merged at `8f7697de5a7bf3384fb657fd5d0bbc31115dd6ad`; Production deployment `dpl_9xMNXTJP2iNdyGm3MnA42aQWTgPG` became Ready with both canonical aliases.
- Post-release checks: smoke 19 passed / 2 intentional skips; funnel 15/15; monitor 9/9; lead-pipe health passed; isolation passed; Vercel error and warning queries returned no logs.
- No database migration, lead mutation, email, BCC, SMS, push notification, or consumer acknowledgment was created by this hardening pass.
- Production event ingestion was enabled after the Resend signing secret was created through the approved provider interface and stored as a Sensitive Production-only Vercel variable. Deployment `dpl_5g43rkAatsVi3FHyarZf7Km1jZfG` rejected an invalid signature, accepted one correctly signed no-PII synthetic event, and returned `duplicate=true` for exact replay. Neon Production contains exactly one matching event row with `signature_verified=true`; the event was ignored because it matched no notification, and no outbound message or lead was created.

## Funnel-accessibility polish addendum

- Matched Production/local visual comparison: `output/phase7/screenshots/current-audit/08-before-after-comparison.jpg`.
- The same in-app-browser tab and 984×964 viewport were used for the empty-address before/after state.
- Production before: browser-native validation bubble; the app DOM had no explanatory alert text.
- Local after: visible `Required` marker, persistent `role="alert"`, and the address field exposed `aria-invalid="true"`.
- Consent-step evidence: `output/phase7/screenshots/current-audit/09-local-phone-consent-matched.jpg`; synthetic values only and no lead submitted.
- Targeted component verification: 3 files / 10 tests passed before the full gate.
- Full release gate: 172 test files / 2,621 tests passed; typecheck, lint, optimized Next.js build, 70-route manifest, 14-control release-safety scan, and Ask Magic Mike/NellySelly isolation all passed.
- Production dependency audit: `pnpm audit --prod --audit-level high` — no known vulnerabilities.
- No real or QA lead, email, BCC, SMS, push notification, consumer acknowledgment, or database mutation was created by this polish audit.
- PR 158 Preview was Ready and browser-verified at the exact empty-address state; `output/phase7/screenshots/current-audit/10-preview-inline-error.jpg` records the released artifact before merge.
- PR 158 merged at `fb6312d60c287477fc030d13804bde9f7c8884b2`; Production deployment `dpl_3TCT4xrVCdh55xMzCoCC1qzhJrbV` became Ready with `www.askmagicmike.com` and `askmagicmike.com` aliases on Node 24.x.
- Post-release Production checks: smoke 19 passed / 2 intentional skips; funnel 15/15; monitor 9/9; lead-pipe health passed; isolation passed; Vercel error and warning queries returned no logs.
- Production DOM verification confirmed the persistent alert and visible required marker; `output/phase7/screenshots/current-audit/11-production-inline-error-released.jpg` records the released state. No lead was submitted.

## Local implementation slice

- `pnpm typecheck`: pass on 2026-08-16.
- Focused Phase 7 suite: 19 tests passed across permission service, sequence state machine, template governance, migration safety, QA route, and signed Resend webhook.
- Full Vitest: 171 files and 2,620 tests passed.
- `pnpm lint`: pass.
- `pnpm build`: pass; 70 active routes in the committed release candidate.
- Route-manifest verification: 70 active routes; all intentional root/`src` duplicates acknowledged.
- Release-safety scan: 14 passed, 0 failed.
- NellySelly isolation check: pass; Ask Magic Mike project remains `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`.
- Production dependency audit: no known vulnerabilities.
- Existing local runtime emits a Node engine warning because the workstation uses Node 26 while Vercel/package engine is Node 24; typecheck/tests still passed.

## Deployed and database evidence

- PR 156 Preview deployment `dpl_GXf3kT2543T565Me7bUowo1WYGL7`: Ready on commit `5e0fb32c4031f92234307fb98eeb329fed3dff5d`.
- Preview public routes `/`, `/home-value`, `/buy`, `/ask`, and `/widget/v1`: HTTP 200; `/api/health/live` and `/api/health/ready`: HTTP 200.
- Protected Preview Lead Center and message-review routes: HTTP 401 without an authenticated Lead Center session, as required.
- Preview migration `20260816143000`: exactly one ledger record; all three Phase 7 tables present.
- Production migration `20260816143000`: committed in one transaction through the authenticated Neon Production SQL Editor; exactly one ledger record; all three Phase 7 tables present; zero rows added; live leads remained zero; unsuppressed test leads remained zero.
- Existing Vercel Sensitive `OPENAI_API_KEY`: confirmed present for Production by name/scope only. Its value was never displayed, downloaded, copied, or logged.
- Production provider acceptance reused that key from an unaliased Production-environment deployment. The Responses API returned a schema-valid advisory result using `gpt-5.6-luna` in 7,698 ms (491 input tokens, 796 output tokens, estimated cost $0.005267). The synthetic record remained `is_test=true`, suppressed, and non-contactable; no automatic action ran.
- PR 156 merged to `main` at `4b4caefcd2aea2944a06df71a8cf3e3e569b969d`. Canonical Production deployment `dpl_31FNiQF1TcRw7cHZkmb8eFnRFmKc` became Ready and retained the established Ask Magic Mike aliases.
- Post-release Production checks: smoke 19 passed with 2 intentional read-only skips; funnel 15/15; monitor 9/9; lead-pipe health passed; liveness/readiness passed; NellySelly isolation passed; no released-route runtime error cluster was observed.
- One Brandon-only QA email was accepted by Resend. Subject: `[TEST — BRANDON QA] Phase 7 messaging release-candidate review`; provider message ID: `871e5b96-a10b-492a-bb23-9898824f0cd3`. The API confirmed `duplicate=false`, no Mike delivery, no consumer delivery, and no BCC.
- Read-only Resend dashboard inspection confirmed `sent` and `delivered` at 10:50 AM. Read-only inspection of the already-authenticated authorized Gmail account confirmed the message in `brandonnarron1@gmail.com` Inbox with the expected sender, subject prefix, QA banner, HTML body, and review link. Evidence is stored under `output/phase7/screenshots/email-acceptance/`.
- The Gmail connector remains attached to `dabnelly23@gmail.com`; the recipient proof came from the authenticated browser account at Gmail slot `u/0`. No mailbox write was performed.
- Resend webhook ingestion is enabled and signed-event acceptance passed. The synthetic acceptance event is not represented as a provider-delivered email.

## Remaining release boundaries

Brandon recipient-inbox receipt, desktop rendering, and signed Resend webhook ingestion are verified. A real mobile mail-client capture, reply-path round trip, and dark-mode client capture remain optional conformance checks and were not falsely inferred from the desktop browser. Carrier SMS, consumer messaging, sequence scheduling, AI automatic actions, and Mike activation remain disabled.
