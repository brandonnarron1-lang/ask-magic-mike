# QA Evidence — Phase 5

Evidence window: 2026-08-15, America/New_York. No genuine lead, carrier SMS,
consumer acknowledgment, internal email, or Web Push message was created during
this verification.

## Release checks

| Check | Result | Evidence |
| --- | --- | --- |
| ESLint | PASS | `pnpm lint` |
| TypeScript | PASS | `pnpm typecheck` |
| Unit/integration | PASS | 159 files, 2,579 tests |
| Chromium E2E | PASS | 13 tests; lead writes intercepted or mocked |
| Production build | PASS | Next.js 15.5.21; 42 static pages generated |
| Route manifest | PASS | 61 active routes; 15 acknowledged root/src duplicates |
| Release safety | PASS | 14 checks |
| System isolation | PASS | canonical Vercel project; no deployable NellySelly identifier |
| Dependency audit | PASS | no known production vulnerabilities |
| Git-history secret scan | PASS | 349 commits, 10.61 MB, zero findings |

The local shell used Node 26.5.1 while `package.json` requires Node 24.x, so pnpm
reported an engine warning. The checks passed; the production runtime remains
configured for Node 24.x. This warning is recorded, not represented as a pass.

## Queue and reporting assertions

- Explicit test evidence is required before a record is treated as QA.
- Test and communication-suppressed records are excluded from Active, Working,
  Qualified, stalled, routing-ready, SLA, appointment, task, and executive
  reporting paths.
- Closed/test/spam history remains visible with the TEST badge and persisted
  creation timestamp.
- The first-live monitor fails unhealthy when unsuppressed QA or QA without
  explicit evidence exists.
- Targeted Phase 5 tests passed before the full run; the final full run includes
  `admin-lead-view`, `neon-reporting-exclusions`, `first-live-lead-monitor`,
  `normalize-payload`, `launch-readiness-doctor`, public response-time copy, and
  private Lead Center response headers.

## Live read-only checks

| Check | Result |
| --- | --- |
| Production monitor | PASS — 9/9 |
| Lead-pipe route health | PASS — 9/9 |
| Public synthetic monitor | PASS — 6, SKIP — 1 protected dependency probe |
| Production smoke | PASS — 19, SKIP — 2 protected/write checks |
| Conversion funnel | PASS — 15/15 |
| Liveness/readiness | PASS — 2/2; protected dependency detail intentionally skipped without a local secret |
| First-live cron | PASS — recent production GETs return HTTP 200 every two minutes |
| SLA cron | PASS — recent production GETs return HTTP 200 hourly |
| Production errors | PASS — zero error-level records in the reviewed six-hour window |
| Production warnings | PASS — zero warning-level records in the reviewed six-hour window |
| PostgreSQL TLS warning search | PASS — zero matches |
| Meta preview | KNOWN EXTERNAL HOLD — 40/42; Facebook HTTP 403 on two exact Our Town paths |

## Artifact QA

- Fourteen QR placements decode to their tagged URL and return HTTP 200.
- Thirty-seven generated PDFs pass `qpdf --check`.
- Sixteen workbooks were rendered sheet by sheet and visually inspected.
- 372 workbook formulas were inspected; rendered PDFs contain no `#REF!`,
  `#DIV/0!`, `#VALUE!`, `#NAME?`, or `#N/A` error token.
- Both editable decks have zero shapes outside their slide canvases and every
  slide has a `[Sources]` speaker-note block.
- All 21 presentation slides and all generated document pages were rendered
  through LibreOffice and visually inspected. The bundled artifact-tool slide
  importer was not used as acceptance evidence because it rejected a valid
  python-pptx/Open XML construct and produced unreliable overflow results; the
  failure is preserved as a tooling limitation, not called a pass.
- Deliverable PDF text contains no secret-variable value, hidden BCC address,
  credential, session, Push endpoint, or genuine lead PII.

## Commands

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm routes:verify
pnpm release:safety
pnpm amm:verify:isolation
pnpm audit --prod --audit-level high
gitleaks git --redact --no-banner
pnpm amm:smoke:prod
pnpm amm:verify:funnel
pnpm amm:verify:health
pnpm monitor-production
pnpm amm:health:lead-pipe
TARGET_URL=https://www.askmagicmike.com pnpm monitor:synthetic
pnpm amm:verify:social-preview
```

Intentional skips are listed above and are not counted as passes.
