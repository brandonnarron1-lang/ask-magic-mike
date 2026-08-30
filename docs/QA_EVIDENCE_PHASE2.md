# QA Evidence - Phase 2

Final local and point-in-time production verification completed on 2026-08-14:

- Baseline production smoke: 19 pass, 0 fail, 2 protected/write skips.
- Funnel verification: 15 of 15 pass.
- Health verification: 2 of 2 pass; protected detail skipped.
- Isolation: pass.
- Social preview: 40 of 42; two known hosting-layer Facebook crawler failures.
  Later authenticated 2026-08-28 evidence identified the exact Apache
  `authz_core` rule; see `FACEBOOK_CRAWLER_403_ROOT_CAUSE.md`.
- New public monitor: 9 of 9 pass.
- Full Vitest suite: 150 files and 2,551 tests pass.
- Chromium Playwright suite: 13 of 13 pass; lead submissions are intercepted and DB-mutation-free.
- Strict TypeScript and ESLint: pass.
- Next.js 15.5.21 production build: pass; 41 static pages generated.
- Route manifest: 58 active routes and 15 acknowledged root/src duplicates; pass.
- Release safety: 14 of 14 checks pass.
- Production dependency audit: no known vulnerabilities.
- Gitleaks: changed/untracked Phase 2 files pass; 322-commit Git history passes. A whole-directory scan reported only ignored `.next` build artifacts and three pre-existing documented/test fixtures outside this change set.
- Node 24.18.0 release gate: pass (isolation, safety, all tests, typecheck, lint, build, and route manifest).
- Ten XLSX files reopen successfully, contain no broken formula tokens, and pass rendered visual inspection.
- Six PDFs reopen successfully, contain extractable text, and pass rendered visual inspection; Mike's guide includes the supplied lead-alert visual as an explicitly marked example.

No new lead, email, Web Push, SMS, consumer message, or form activation was created for this evidence cycle.
