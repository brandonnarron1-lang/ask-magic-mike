# Phase 9 lead-intent default truth QA evidence

Captured: 2026-08-29 EDT

Production mutation: none

## Candidate identity

- Original PR #224 head: `01658f164752de88faefbcf27fcbe98921e6870d`.
- Preserved remote rescue branch:
  `rescue/amm-pr224-pre-pr223-exact-seal-20260829-043332`.
- Earlier exact sealed parent PR #223 head:
  `18be077b1b6b8a595af2bb5dbd4a94d736dad65c`.
- Earlier reconciliation merge: `0a8764d`.
- Previously sealed PR #224 head:
  `5c75b8f919442c05b607eb666c5595023057d94d`.
- Fresh remote rescue branch:
  `rescue/amm-pr224-pre-pr223-accessibility-seal-20260829-1210`.
- Accessibility-refreshed exact parent PR #223 head:
  `1d893f4c23ca53a1b852a1953b953b40e6f997f3`.
- Accessibility reconciliation merge: `614a67a`.
- Final exact candidate identity, GitHub runs, Vercel deployment, artifact
  digests, and runtime evidence are bound in PR #224 after commit.

## Truth matrix

| Consumer evidence | Browser payload | Durable timeline | Score | Qualification effect |
| --- | --- | --- | --- | --- |
| No optional seller answers | condition/timeline omitted | `null` | timeline +0 | cannot earn A urgency |
| No optional buyer answers | timeline/financing/preapproval omitted | `null` | timeline +0 | no invented financing fact |
| `Not sure yet` / `Unknown` / unrecognized timeline | exact text accepted | `null` | timeline +0 | no manufactured horizon |
| `Just planning` | exact answer retained | 24 months | timeline +0 | planning, not urgency |
| Checked preapproval affirmation | `preapproval: true` | `true` | existing +10 | explicit evidence only |

## Local reconciliation acceptance

Exact Node `24.18.0`, pnpm `10.30.3`:

- focused form/API/scoring matrix: 4 files / 48 tests passed;
- strict TypeScript and targeted changed-surface ESLint passed;
- reconciled full suite before the final added planning-horizon regression:
  263 files / 3,310 tests passed;
- strict TypeScript, ESLint, Ask/Nelly isolation, release safety 14/14,
  optimized Next.js 15.5.21 build, 59 generated pages, and 95/17 route proof
  passed;
- final exact-head release gate is required again after commit and is the
  authoritative count.

## Browser acceptance contract

The existing Black Diamond visual system remains canonical. Desktop and mobile
optimized-production-build acceptance passes 3 / 3 intercepted scenarios and
proves:

- Seller and Buyer optional controls begin blank and remain keyboard-usable;
- no client console or page errors;
- no horizontal page overflow;
- untouched payloads omit optional intent evidence;
- the browser suite stays mutation-free against Vercel Preview.

Gitignored local visual evidence:

- desktop Buyer and Seller, 1440 x 1000;
- mobile Buyer and Seller, 390 x 844.

The mobile captures were scrolled to the optional controls before capture so
the blank prompts and unchecked preapproval affirmation are directly visible.
Per-image local hashes are deliberately not treated as release authority
because font/render timing can vary across equivalent browser runs. The exact
hosted artifact digest is bound in PR #224 and is the immutable visual proof.

## Security and privacy review contract

- public input remains normalized by the canonical `/api/leads` route;
- server-side validation, origin controls, durable rate limiting, idempotency,
  consent capture, and Preview mutation refusal remain unchanged;
- no optional answer is inferred from presentation state;
- no consumer PII is added to URLs, analytics parameters, screenshots, or
  release evidence;
- no secret, provider token, or private database field is exposed.

## Authority and rollback

This candidate has no authority to mutate Production, Neon, WordPress, DNS,
messaging providers, public campaigns, or NellySelly. Rollback is code-only:
revert the PR #224 application commit. Existing lead rows are not rewritten.
