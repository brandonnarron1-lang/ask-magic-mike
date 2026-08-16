# QA evidence — Phase 7

Evidence is appended only from executed commands and deployed checks.

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
- The connected Gmail profile is `dabnelly23@gmail.com`, not the authorized recipient inbox `brandonnarron1@gmail.com`; it therefore cannot prove recipient-inbox arrival. A read-only Resend retrieve request returned HTTP 401 because the existing key is send-scoped. Evidence is correctly classified as provider accepted, not inbox delivered.
- Resend webhook remains disabled pending a securely configured signing secret and signed-event acceptance.

## Remaining release boundaries

Recipient-inbox rendering/receipt remains an owner review at the authorized Brandon inbox. Signed Resend webhook acceptance remains a separate disabled gate until its provider signing secret is available. Carrier SMS, consumer messaging, sequence scheduling, AI automatic actions, and Mike activation remain disabled.
