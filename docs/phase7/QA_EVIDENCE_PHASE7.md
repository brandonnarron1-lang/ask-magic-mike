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
- Production Phase 7 AI flags were prepared with advisory intelligence and persistence enabled while async workers and automatic actions remain disabled.
- Resend webhook remains disabled pending a securely configured signing secret and signed-event acceptance.

## Pending before final release claim

Merge, Ready Production deployment, deployed OpenAI provider/fallback acceptance, Brandon-only QA inbox acceptance, Production smoke/monitoring, and final visual/package artifacts. Signed Resend webhook acceptance remains a separate disabled gate until its provider signing secret is available.
