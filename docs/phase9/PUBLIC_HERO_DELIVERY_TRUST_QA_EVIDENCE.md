# Phase 9 public hero delivery trust QA evidence

Date: 2026-08-23

Candidate branch: `codex/phase9-public-hero-fast-track-20260823`

Production mutation: none

## Fast-track composition and live source evidence

The candidate now includes refreshed PR #203 head
`6da82fe6d9a87f0ced6da5f4cdae04defea5e4ae` through clean ordered merge
`010e18fcf610997948fcf694361c4b6b2423884f`; rescue branch
`rescue/amm-pr204-pre-pr203-refresh-20260823-173028` preserves the prior sealed
head. It reuses only PR #201
implementation commit `1ca7ff00eacbc7da6d9b861431109c3d009c6861`.
The original PR #201 and its older stack remain unchanged.

Before implementation, Playwright CLI opened canonical Production from
`about:blank`, intercepted application and third-party analytics writes, and
measured the homepage at both target viewports:

- 390 × 844 selected the 1,080 × 1,920 mobile WebP, one 289,876-byte response,
  `loading=auto`, and `fetchPriority=auto`;
- 1440 × 900 selected the 2,880 × 1,620 desktop WebP, one 503,788-byte response,
  `loading=auto`, and `fetchPriority=auto`; and
- both rendered the released identity and CTAs with zero browser
  warnings/errors. No lead, durable event, provider message, or third-party
  analytics write was permitted.

## Source and asset evidence

The retained source files were inspected before implementation:

| Artwork | Intrinsic size | Source bytes |
| --- | ---: | ---: |
| Mobile hero WebP | 1080 × 1920 | 289,876 |
| Desktop hero WebP | 2880 × 1620 | 503,788 |

The implementation continues to reference those exact approved files. It adds
no generated likeness, visual replacement, public copy, route, form, provider,
or analytics vocabulary.

## Current fast-track local acceptance

PR #201's historical results informed reuse but do not authorize this branch.
The current fast-track composition was freshly verified with Node `v24.18.0`,
pnpm `10.30.3`, and Next.js `15.5.21`.

| Check | Result |
| --- | --- |
| Focused hero + adjacent funnel/attribution tests | PASS · 4 files / 15 tests |
| Full Vitest suite | PASS · 221 files / 2,994 tests |
| Strict TypeScript | PASS |
| ESLint | PASS |
| Optimized Production build | PASS · 52 static pages |
| Route manifest | PASS · 82 active / 17 acknowledged duplicates |
| Ask Magic Mike / NellySelly isolation | PASS |
| Release safety | PASS · 14/14 |
| Production dependency audit | PASS · no known vulnerabilities |
| Migration delta | PASS · empty |
| Staged secret scan | PASS · no leaks found |
| `git diff --check` | PASS |

After the application commit, the clean-tree release doctor passed 43/43. No
migration was added. No database, email, SMS, Push, WordPress, social, Google
Business Profile, DNS, provider, spend, or Production action occurred.

## Current fast-track cold-browser responsive proof

Playwright CLI opened a built local Production server from `about:blank` at
each viewport so a prior viewport could not warm or contaminate the image
resource list.

### Mobile · 390 × 844

- exactly one hero artwork resource loaded;
- selected source: mobile artwork through `/_next/image`, width 640, quality 75;
- decoded response body: 56,792 bytes;
- reduction from the retained full mobile source: 80.4%;
- `loading="eager"` and `fetchPriority="high"` are present;
- correct H1, logo, Mike portrait, primary and secondary CTA remain visible;
- no horizontal overflow was observed.

### Desktop · 1440 × 900

- exactly one hero artwork resource loaded;
- selected source: desktop artwork through `/_next/image`, width 1920, quality 75;
- decoded response body: 108,706 bytes;
- reduction from the retained full desktop source: 78.4%;
- `loading="eager"` and `fetchPriority="high"` are present;
- correct H1 and Black Diamond composition remain visible;
- no horizontal overflow was observed.

The current fast-track run intercepted `/api/leads`, `/api/events`,
`/api/experiments/event`, `/api/widget/events`, and third-party analytics before
navigation. It produced zero browser warnings/errors and no lead, durable event,
provider message, or third-party analytics write.

These local transfer measurements are deterministic acceptance evidence, not a
claim about real-user LCP. The stacked field-experience candidate remains the
canonical way to collect privacy-safe Production LCP/INP/CLS evidence after its
separate release gate and sufficient genuine traffic.

## Superseded pre-refresh application-head remote acceptance

Application head: `e1024cd1234dc5b200ed953705127f9efa4bb8fd`

| Proof | Exact evidence |
| --- | --- |
| GitHub Node 24 CI | run `32662812090` · job `97251432771` · PASS |
| CI artifact | `9499214457` · `sha256:d0fe367719098b9bafe210299cdea209d6c07e77544d22810448d70bc6549dae` |
| Vercel Preview | `dpl_CVWc7vVZ2Ju8qv7KanpYshn4uKKS` · READY · immutable `https://ask-magic-mike-fjlaoqny6-eyes-up-industries.vercel.app` |
| GitHub deployment identity | exact ref and SHA `e1024cd1234dc5b200ed953705127f9efa4bb8fd` |
| Protected no-write QA | run `32662942232` · job `97251747115` · PASS |
| Protected artifact | `9499255540` · `sha256:2571e0a4c82caff5521435012f01820cc4c09fa696eb21a872bb593926215dec` |

Protected acceptance returned 17 pass / 6 intentional mutation skips / 0 fail,
Widget 2/2, release safety 14/14, release doctor 43/43, release candidate GO,
and `PREVIEW_READY`. Health identified the exact application commit and Preview
runtime/database identity; `safe_for_preview_mutation=false`, live email/SMS
disabled, and provider delivery disabled. No write test ran.

Authenticated read-only inspection of the deployed markup confirmed the mobile
and desktop `srcSet`, intrinsic dimensions, `sizes="100vw"`, eager loading, and
high fetch priority. With browser image negotiation, the immutable Preview
served a 56,744-byte mobile WebP at width 640 and a 108,706-byte desktop WebP at
width 1920. Runtime logs contained 0 fatal, 0 error, and 0 warning entries.

The refreshed Draft head must pass fresh exact-head CI, a matching immutable
Preview, and protected no-write acceptance recorded in PR #204. Those results
supersede this pre-refresh evidence for branch identity but do not create
Production authority.

## Rollback proof

The change is application-only and additive. Reverting its implementation
commit restores the prior static `<picture>` markup. The same source files stay
in place, and no data or infrastructure rollback is needed.
