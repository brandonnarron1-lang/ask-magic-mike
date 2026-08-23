# Phase 9 public hero delivery trust QA evidence

Date: 2026-08-23

Candidate branch: `codex/phase9-public-hero-delivery-trust-20260823`

Production mutation: none

## Source and asset evidence

The retained source files were inspected before implementation:

| Artwork | Intrinsic size | Source bytes |
| --- | ---: | ---: |
| Mobile hero WebP | 1080 × 1920 | 289,876 |
| Desktop hero WebP | 2880 × 1620 | 503,788 |

The implementation continues to reference those exact approved files. It adds
no generated likeness, visual replacement, public copy, route, form, provider,
or analytics vocabulary.

## Local acceptance on the required runtime

Runtime: Node `v24.18.0`, pnpm `10.30.3`, Next.js `15.5.21`.

| Check | Result |
| --- | --- |
| Focused hero + public visual tests | PASS · 2 files / 9 tests |
| Full Vitest suite | PASS · 222 files / 2,993 tests |
| Strict TypeScript | PASS |
| ESLint | PASS |
| Optimized Production build | PASS · 52 static pages |
| Ask Magic Mike / NellySelly isolation | PASS |
| Release safety | PASS · 14/14 |
| `git diff --check` | PASS |

No migration was added. No database, email, SMS, Push, WordPress, social,
Google Business Profile, DNS, provider, spend, or Production action occurred.

## Cold-browser responsive proof

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

The sole local console error was an expected `403` from `/api/events`: the
built local server had no canonical Production origin/database authority, so
the analytics write failed closed. The image request, visual rendering, and
page itself remained healthy. No test record or telemetry event was created.

These local transfer measurements are deterministic acceptance evidence, not a
claim about real-user LCP. The stacked field-experience candidate remains the
canonical way to collect privacy-safe Production LCP/INP/CLS evidence after its
separate release gate and sufficient genuine traffic.

## Rollback proof

The change is application-only and additive. Reverting its implementation
commit restores the prior static `<picture>` markup. The same source files stay
in place, and no data or infrastructure rollback is needed.
