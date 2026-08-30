# Google Business Profile square asset QA evidence

Date: 2026-08-29

Status: exact-parent refreshed candidate. The original feature head passed
local acceptance, exact-commit CI, immutable Preview, protected mutation-free
hosted QA, and runtime-log review. The refreshed branch adds identity binding
and must repeat exact-head external proof; those self-referential results belong
in PR #232 rather than another commit.

## Source and scope

- Exact sealed parent: `16a633fc5d77ed7c911e9a276f6a1f561ad63fda`
  (PR #231).
- Feature branch:
  `codex/phase9-google-business-profile-square-assets-20260829`.
- Draft PR: [#232](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/232),
  stacked on the exact sealed PR #231 head rather than `main`.
- Prior branch head preserved at:
  `rescue/amm-pr232-pre-pr231-parent-refresh-20260829-153626`.
- Exact-parent reconciliation commit:
  `8e5cfa7de6d2efd11572d261f7fc19f0e4eafd72` (normal two-parent
  merge; no rebase, reset, force push, or history deletion).
- Original feature proof head:
  `d0e058da82c852e609d92d737d88aa5d5b6dbf48`; the final refreshed
  hardening head is recorded immutably in the PR seal after exact-head reruns.
- Original pre-feature rescue branch remains:
  `rescue/amm-pre-gbp-square-20260829-0918`.
- Canonical repository:
  `https://github.com/brandonnarron1-lang/ask-magic-mike`.
- Scope: one protected 720x720 renderer format, exact Google Business Profile
  mapping, exact-format fallback download, cross-field publication-identity
  binding, trust-boundary tests, documentation, and no external-system mutation.

## Commands and results

All project verification used exact Node `24.18.0` and pnpm `10.30.3`.

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS; lockfile unchanged |
| Focused Vitest: owned-demand assets + native handoff | PASS; 2 files / 24 tests on refreshed candidate |
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

## Original feature-head CI and hosted Preview

The original feature head was verified without database writes or external
publication. These results prove the renderer change but do not substitute for
the refreshed exact-head reruns recorded in the final PR seal:

| Evidence | Result |
|---|---|
| GitHub Release Gate | Run [`33255361223`](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33255361223) passed on exact head `d0e058da82c852e609d92d737d88aa5d5b6dbf48` |
| Immutable Vercel Preview | Deployment `dpl_BJjuZsmDVeU9kVHnnrm9ZQm6eJkN` is `READY` at `https://ask-magic-mike-45rjfm7c1-eyes-up-industries.vercel.app` |
| Deployed identity | Protected health reported commit `d0e058da82c852e609d92d737d88aa5d5b6dbf48`, the exact feature branch, Node Production mode, and Vercel Preview mode |
| Protected hosted QA | Dispatch run [`33255500962`](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33255500962) checked out the exact commit and passed 18 read-only checks / 6 intentional mutation skips / 0 failures |
| Browser QA | 4 expected / 0 skipped / 0 unexpected / 0 flaky cases |
| Release authority | Release candidate `GO`; launch authority `PREVIEW_READY`; `release:assert` passed |

The protected QA used the repository-held Vercel bypass secret in header mode;
the value was masked and never printed or copied. `SAFE_DB_WRITE=false` and
`FORCE_DB_WRITE=false`. The health contract independently reported
`safe_for_preview_mutation=false`, live email/SMS disabled, provider delivery
disabled, and `allow_preview_db_mutation=false`. All six lead/database mutation
checks therefore skipped by contract.

The hosted run passed public funnels, Preview analytics isolation, three
WordPress UTM variants, secret-leak inspection, health, protected admin shell,
lead inbox, read-only SLA boundaries, private phone-install failure handling,
listing search, and private-listing-field exclusion. The exact 720x720 renderer
and protected asset response remain covered by the focused server tests and
original-pixel render evidence below; the hosted Preview has no reusable human
Lead Center session, so the evidence does not overclaim a session-authenticated
download.

## Runtime log review

The exact immutable deployment log window contained zero `error` records. Its
only 5xx response was the expected `GET /api/admin/sla/sweep` HTTP 503 safety
refusal exercised by hosted QA while Preview writes were disabled. It was an
`info`-level serverless request, not an exception.

## Vercel worktree-link cleanup

During a manual read-only `vercel curl` attempt, the CLI treated the unlinked
worktree as a new project and created the empty project
`amm-gbp-square-assets-20260829` plus a protection-bypass token scoped to that
empty project. The token could not bypass the canonical deployment, and both
requests remained Vercel SSO 302 responses.

Before cleanup, the project was resolved exactly as
`prj_EzSvIbokQKEPpNyXmeM6eGLg4qHq`, created at 09:41:36 EDT, with no Production
URL and no deployments. It was removed immediately, including its unused
project-scoped token, and the local worktree was relinked to the established
canonical project `ask-magic-mike` (`prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`). A
fresh project listing confirmed the temporary project absent. No canonical
domain, environment value, deployment, protection setting, or repository link
was changed.

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
- channel, placement, channel-native format, canonical filename, proof return
  path, UTM source, and UTM medium must describe one exact handoff identity;
- cross-channel, cross-placement, wrong-format, wrong-filename, wrong-proof,
  and wrong-attribution combinations fail before fetch or native sharing;
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
- The client independently fails closed unless asset channel, placement,
  format, filename, proof target, UTM source, and UTM medium remain correlated;
  a valid field copied from a different placement or channel is not enough.
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

The exact refreshed candidate regenerated all four files with those same byte
counts and SHA-256 values. Individual byte comparison and the combined
reference/candidate 2x2 matrix both reported zero changed pixels.

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
publication proof, changed canonical Vercel environment/configuration,
deployed Production, edited WordPress/DNS, spent, deleted business data, or
interacted with NellySelly. The temporary empty Vercel project creation and
immediate removal are disclosed above rather than hidden.

This document is evidence, not release or publication authority. The final
documentation-seal commit is valid only after exact-head Node 24 CI, immutable
Vercel Preview identity, protected hosted QA, and runtime-log review pass and
are recorded on PR #232. A content-only follow-up commit must not invalidate
that proof. A separately explicit merge/Production gate remains required after
the earlier ordered release train. Any native Google Business Profile
publication remains a different external-action approval.
