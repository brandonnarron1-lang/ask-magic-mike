# Phase 8 QA evidence

Date: 2026-08-18. Branch: `codex/phase8-editable-artifacts-visual-acceptance-2026-08-18`.

## Production checks

- `GET /api/health/live`: pass; canonical database configured as Neon Postgres.
- `GET /api/health/ready`: pass; database, capture function, lead/notification tables, RBAC, push, and phone setup reported ready.
- `https://askmagicmike.com`: HTTP 308 to `https://www.askmagicmike.com/`.
- `https://www.askmagicmike.com/`: HTTP 200.
- Current Vercel deployment: `dpl_2vgceZpCb4PSuoYffvwi7QAxYnrX`, Ready, Production.
- Vercel error and warning queries for the last hour returned no entries.

## Public visual acceptance

- Command: `TARGET_URL=https://www.askmagicmike.com npm run artifacts:visuals`.
- Result: 72 route/viewport checks, zero failures, zero horizontal overflow, zero unexpected console findings.
- Tested widths: 320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920 CSS pixels.
- Empty-address validation displayed the associated inline error and did not submit a lead.
- Production telemetry endpoints were locally stubbed during the automated pass so QA page views did not pollute analytics or trigger rate limits.
- A full-page screenshot mode was rejected after it altered responsive reflow during capture. Viewport-only evidence matched live computed widths and is the accepted method.

## Application release gate

Command: `pnpm run release:gate`.

- System isolation: pass.
- Release safety: 14/14.
- Tests: 175 files, 2,647 tests, all pass.
- Typecheck: pass.
- Lint: pass after removing one duplicate chart option caught by ESLint.
- Route manifest: 72 active routes, pass.
- Next.js production build: pass; 50 static pages generated, protected/dynamic routes compiled.
- Local runtime note: Node 26.5.1 produced an engine warning because the repository pins Node 24.x; no functional gate failed. Production remains configured for the supported Node 24 line.

## Artifact verification

Commands: `npm run artifacts:build` and `npm run artifacts:verify` from `tools/artifacts/`.

- Presentations: 2 pass, 40 total slides, 40 speaker-note pages, editable shapes/text/charts present.
- Workbooks: 13 pass; formulas, filters, freeze panes, validation, and cached error scans pass after LibreOffice recalculation.
- PDFs: 6 pass; searchable and structurally valid.
- Preview/montage images: 19 pass.
- Secret/PII scan: zero findings across Phase 8 output, documentation, and isolated toolchain source.
- Development-tool dependency note: two high `npm audit` findings are confined to PptxGenJS's transitive `image-size` package. The generator is isolated from Production and processes only trusted repository assets.

## Controlled non-actions

No synthetic prospect was created. No consumer email, carrier SMS, Mike activation, Form 3 acknowledgment, held WordPress form activation, database migration, DNS change, or production lead mutation occurred.

## Remaining authenticated check

Lead Center visual acceptance requires a fresh existing staff sign-in because the protected session redirected to `/lead-center-login?error=session`. No password reset is needed or authorized.

