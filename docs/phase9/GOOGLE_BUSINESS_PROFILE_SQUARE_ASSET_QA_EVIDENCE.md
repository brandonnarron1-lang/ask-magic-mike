# Google Business Profile square asset QA evidence

Date: 2026-08-29

Status: local acceptance passed on the exact candidate tree; exact-commit CI,
immutable Preview, and protected hosted verification pending

## Source and scope

- Exact sealed parent: `64d46bed00b0bee863ea6c327219ef145d853be2`
  (PR #231).
- Feature branch:
  `codex/phase9-google-business-profile-square-assets-20260829`.
- Pre-change rescue branch:
  `rescue/amm-pre-gbp-square-20260829-0918`.
- Canonical repository:
  `https://github.com/brandonnarron1-lang/ask-magic-mike`.
- Scope: one protected 720x720 renderer format, exact Google Business Profile
  mapping, exact-format fallback download, trust-boundary tests, documentation,
  and no external-system mutation.

## Commands and results

All project verification used exact Node `24.18.0` and pnpm `10.30.3`.

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS; lockfile unchanged |
| Focused Vitest: owned-demand assets + native handoff | PASS; 2 files / 23 tests |
| `pnpm run typecheck` | PASS |
| `git diff --check` | PASS |
| `git diff --binary \| gitleaks stdin --redact --no-banner` | PASS; 28.68 KB scanned, zero leaks |
| `pnpm audit --prod --audit-level=moderate` | PASS; no known Production dependency vulnerabilities |
| `pnpm run release:gate` | PASS; isolation, 14/14 release safety, 268 files / 3,354 tests, strict TypeScript, full ESLint, optimized Next.js build, and route proof |
| Next.js production build | PASS; 59 static pages generated |
| Route manifest | PASS; 95 active routes / 17 acknowledged root–`src` duplicates |
| `pnpm run release:doctor` | Expected pre-Preview state: 42 pass / 1 fail; only missing Preview QA report |
| `pnpm run release:report` | Expected `NO-GO`; sole blocker is `preview_qa_report_missing` |
| `pnpm run launch:authority` | `LOCAL_READY`; protected Preview QA remains required |

Expected synthetic test stderr about deliberately absent persistence and
in-memory rate-limit fixtures remained inside passing negative-path tests. It
does not describe canonical Production, whose durable limiter was separately
accepted in PR #209.

## Functional contracts

Automated coverage proves:

- all four exact Google Business Profile placements render valid PNG bytes at
  720x720;
- each final file is between Google's documented 10 KB and 5 MB bounds;
- the Google native handoff resolves `format=square` and a `-square.png`
  filename;
- Facebook, Instagram, LinkedIn, WordPress, email-signature, and QR channels
  cannot resolve the square format through the server asset contract;
- the protected route continues to require `report:view` and returns private,
  no-store, noindex, `nosniff`, same-origin, CSP-sandboxed attachments;
- the client accepts only the exact same-origin asset route and rejects added
  query parameters before fetch;
- content type, PNG signature, non-empty size, and five-megabyte maximum are
  validated before creating a browser `File`;
- native sharing remains two explicit gestures and cannot record publication
  proof or call a platform provider; and
- every QR/shortlink still resolves through a fixed allowlisted code to the
  exact canonical UTM destination.

## Security review

The TypeScript/React/Next.js security pass found no new Critical, High, Medium,
or Low finding in the touched boundary.

- No `dangerouslySetInnerHTML`, direct HTML sink, eval/dynamic code, client
  secret read, database call, SQL, filesystem path, subprocess, CORS expansion,
  arbitrary outbound URL, or provider endpoint was introduced.
- Route parameters and `format` are untrusted at ingress but resolve only
  through the canonical channel, placement, and format allowlists.
- The image source remains a repository-owned path selected by canonical
  definitions and joined to the configured canonical origin; callers cannot
  supply a source or destination URL.
- The browser fetch is exact-path, same-origin, credential-scoped, no-store,
  and read-only.

## Visual evidence

Local artifacts are intentionally outside the repository:

```text
/Users/brandonnarron/.codex/artifacts/amm-gbp-square-assets-20260829/
```

Final square outputs:

| Placement | Bytes | SHA-256 |
|---|---:|---|
| Buyer match | 712,621 | `46a08dd055e080638b9b65bc62377c9f6c9e650b55e07e98eaef7701906b5274` |
| General question | 956,300 | `6af3de7d08c9c4e91e4b457d3aab56bd1af62905edff399f05dc0356dc02029b` |
| Renter plan | 461,679 | `965896d4a5a2cc1350a1229ac0957d52ca0d70b93c7db2f7976b97da5538d9ff` |
| Seller review | 959,375 | `5c42ee9c94b4193cec17662da20542bbe71f9fde7b4f570642c917c3b5942850` |

Reviewed comparison artifacts:

- `seller-reference-vs-square-v3.png` places the retained 4:5 reference and
  final 1:1 adaptation in the same 720-pixel-high comparison canvas.
- `google-business-profile-square-matrix-v3.png` places all four final 720x720
  outputs in one original-density matrix.

The first render was not accepted. It exposed buyer copy/portrait collision and
over-cropped the transparent renter portrait. The corrected render reuses the
existing dark story information card, contains the renter portrait, preserves
header/QR/legal spacing, and keeps all four offer claims unchanged. The final
matrix has no clipped brand text, headline, body, QR card, broker boundary, or
Equal Housing identification.

No AI-generated or AI-edited portrait ships. Existing approved source images
were reused because preserving identity is safer and more accurate than
generating a new likeness.

## Mutation and authority proof

No test submitted a lead, wrote canonical or Preview Neon, sent email/SMS/Push,
called Google or another provider, opened a native share target, recorded
publication proof, changed Vercel environment/configuration, deployed
Production, edited WordPress/DNS, spent, deleted data, or interacted with
NellySelly.

This document is evidence, not release or publication authority. Exact-commit
Node 24 CI, immutable Vercel Preview identity, authenticated protected-route
verification, clean runtime logs, and a separately explicit merge/Production
gate remain required. Any native Google Business Profile publication remains a
different external-action approval.
