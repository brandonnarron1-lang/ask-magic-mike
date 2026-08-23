# Phase 9 conversion identity polish QA evidence

Captured: 2026-08-22 15:17 EDT

Production mutation: none

## Released-main integration proof — 2026-08-22 20:02 EDT

- Released base: PR #194 merge
  `5a3c5c7f2463ea399c21b616ff249f6c67e156b6`, including PR #196 verifier
  hardening.
- Prior stacked head preserved at
  `rescue/amm-pr195-pre-released-pr194-refresh-20260822-1959`; integration merge
  `401e9e3ce57e9c466d132ef091c221ecf5e54d4e`.
- Application code merged cleanly. The sole automatic conflict was
  `docs/QA_EVIDENCE.md`; resolution retains conversion-identity evidence,
  released privacy evidence, and historical PR #185 evidence in chronological
  context.
- The earlier detached rehearsal correctly predicted that conflict and exposed
  two browser-contract gaps now retained here: the footer is a page-level
  `contentinfo` sibling of `<main>`, and homepage E2E intercepts `/api/events`.
- Exact local Node 24.18.0 release preflight: system isolation, 43/43 doctor,
  14/14 safety, **215 test files / 2,950 tests**, strict typecheck, ESLint,
  optimized Next.js 15.5.21 build, and **82 active routes** — PASS.
- Local Chromium acceptance: homepage plus DB-intercepted widget matrix,
  **8/8 tests** — PASS, including one primary `main` landmark, one footer
  landmark, consumer-only footer paths, no broken images, and no console error.
- Production dependency audit reports no known vulnerability. Refreshed commit
  gitleaks and diff-integrity scans pass. The released-main candidate contains
  no SQL or database migration.
- No Production/Preview database write, lead submission, email/BCC, SMS, Push,
  consumer acknowledgment, WordPress edit, publication, DNS change, spend,
  deletion, or NellySelly action occurred.

## Current Production audit

The Codex in-app browser captured the live public experience with internal-QA
UTMs and stopped before submission:

1. Seller entry — healthy visual hierarchy; address-first path works.
2. Seller email — functional, but the live funnel has no name field.
3. Seller phone/consent — functional and labeled; final action would submit, so
   the audit stopped.
4. Buyer entry — healthy and already includes a name field.
5. Ask Mike entry — healthy advisor surface; no AI/provider request was sent.

Evidence:

- `output/phase9/production-conversion-audit-20260822/01-seller-entry.jpg`
- `output/phase9/production-conversion-audit-20260822/02-seller-email.jpg`
- `output/phase9/production-conversion-audit-20260822/03-seller-contact.jpg`
- `output/phase9/production-conversion-audit-20260822/04-buyer-entry.jpg`
- `output/phase9/production-conversion-audit-20260822/05-ask-entry.jpg`

## Local candidate visual acceptance

6. Contact step — name and email remain inside the existing card and four-step
   progress model; footer contains consumer paths only.
7. Name validation — visible error, visible focus, and no layout break.

Evidence:

- `output/phase9/production-conversion-audit-20260822/06-local-contact-fixed.jpg`
- `output/phase9/production-conversion-audit-20260822/07-local-name-validation.jpg`

DOM-level browser proof confirmed:

- active element label: `Your name`;
- `aria-invalid="true"`;
- `aria-describedby="home-value-form-error"`;
- footer links: `/home-value`, `/sell`, `/buy`, `/ask`, `/plan`, `/contact`,
  `/privacy`, `/terms`, and `/accessibility`;
- no Widget Preview, OurTown Integration, or Social Preview footer link.

## Automated proof

- Focused: 4 files / 11 tests — PASS.
- Full release gate: system isolation PASS; release safety 14/14; 214 test
  files / 2,930 tests; strict typecheck; ESLint; optimized Next.js 15.5.21
  build; 82 active routes / 17 acknowledged duplicates — PASS.
- Python screenshot helper compilation — PASS.
- Production dependency audit — no known vulnerability.
- Candidate text scan: 42.12 KB, no leak.
- Broad 306.42 MB working-directory scan findings were fully reconciled: 11
  were generated `.next` files and three were existing reviewed documentation
  or security-test fixtures already fingerprinted in `.gitleaksignore`. None is
  a changed candidate source or a newly exposed credential.
- `git diff --check` — PASS.
- Candidate migration scan — empty.

The original local audit used Node 26.5.1. The released-main refresh has now
passed locally on exact Node 24.18.0; independent GitHub Node 24 CI and a
canonical protected Vercel Preview remain required after the refreshed head is
pushed.

## Evidence limits

The in-app browser viewport provided desktop capture. DOM inspection and tests
cover labels, focus ownership, error association, footer landmarks, and payload
shape; they do not by themselves prove full WCAG compliance. No physical
device, external provider, live lead, notification delivery, or Production
database behavior was exercised in this candidate audit.
