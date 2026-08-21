# Phase 9 owned-demand asset studio — QA evidence

Recorded 2026-08-21 in America/New_York.

## Scope and provenance

- Branch: `codex/phase9-owned-demand-asset-studio-20260821`
- Stack base: Draft PR #185 head
  `be99a1838c1c36ffc474bc97c11ef2a88e53107c`
- Production baseline remained PR #181 / deployment
  `dpl_HVoqg1t4j2SJWPFMEEzpiHGQ6hmM`
- Canonical app/database/provider configuration was not mutated.
- No Preview or Draft PR existed at the time of this local evidence entry; exact
  head and Preview evidence must be appended after push.

## Reuse-first and route contract

Automated coverage proves:

- six canonical channels × four placements = 24 unique definitions;
- three protected formats per placement = 72 deterministic asset URLs;
- 24 collision-free short codes resolve to the exact existing UTM destination;
- malformed channel, placement, format, code, and traversal-shaped input fail
  closed;
- the download route requires `report:view` and has no database mutation,
  provider call, or arbitrary image/destination input;
- the public redirect is an allowlisted 307, not an open redirect;
- the redirect and assets are no-store/noindex and `/go/` is robots-disallowed;
- the SVG is self-contained and has no script, event handler, or JavaScript URL;
- all four placement types render in both 4:5 and 9:16 from approved local
  imagery; and
- the route manifest contains the protected asset API and public shortlink.

## Defects found and closed during executable QA

1. Satori rejected an unsupported CSS `auto` value. The layout now uses explicit
   positioning values.
2. A full UTM URL made the composed QR too dense for reliable scanning. The
   allowlisted `/go/[code]` redirect preserves the exact UTM destination while
   reducing module density.
3. Story compliance text crossed the QR quiet area. The footer moved to its own
   dark safe band and the QR remains isolated.
4. The existing WebP buyer/renter files and then the renter PNG triggered
   `ImageResponse` decode failures. The normal UI keeps its efficient WebP
   assets; the export renderer uses retained JPEG originals and one
   mechanically derived JPEG of the same approved renter portrait.
5. The first ImageMagick conversion of the stroke-based QR SVG was blank. That
   conversion was discarded. Chromium rendered the actual SVG and the
   independent scanner decoded it successfully.

These failures are not counted as passes; each was corrected and rerun.

## Final local verification

```text
NODE_VERSION=24.18.0 ~/.nvm/nvm-exec pnpm run release:gate
Ask Magic Mike / NellySelly isolation: PASS
Release safety: 14 pass / 0 fail across 539 deployable files
Vitest: 203 files / 2,846 tests passed
Strict TypeScript: PASS
ESLint: PASS
Next.js 15.5.21 optimized Production build: PASS
Route manifest: 80 active / 17 acknowledged root-src duplicates
```

Additional checks:

```text
pnpm audit --prod --audit-level high
No known vulnerabilities found

gitleaks git --redact --no-banner
471 commits / approximately 13.26 MB / no leaks found

git diff --check
PASS
```

The broad untracked working-directory scan also traversed dependency/cache and
pre-existing ignored artifacts and reported 14 non-candidate findings without
printing secret values. It is not used as candidate evidence. The precise
staged-candidate scan covered approximately 58 KB of changed text and
reported no leak.

## QR and visual evidence

Independent OpenCV decoding after final image compression:

```text
PASS ask-magic-mike-facebook-seller-review-feed.png
  -> https://www.askmagicmike.com/go/fb-seller
PASS ask-magic-mike-facebook-seller-review-story.png
  -> https://www.askmagicmike.com/go/fb-seller
```

Chromium rendered the raw QR SVG at 900×900; independent OpenCV decoding passed:

```text
PASS ask-magic-mike-qr-print-seller-review-qr-svg.svg
  -> https://www.askmagicmike.com/go/qr-seller
```

Reviewed exemplars:

- [4:5 seller-review feed](../../output/phase9/owned-demand-assets/ask-magic-mike-facebook-seller-review-feed.png)
- [9:16 seller-review story](../../output/phase9/owned-demand-assets/ask-magic-mike-facebook-seller-review-story.png)
- [raw seller-review QR SVG](../../output/phase9/owned-demand-assets/ask-magic-mike-qr-print-seller-review-qr-svg.svg)

Observed:

- approved Mike likeness and existing identity only;
- readable headline/body hierarchy;
- intact QR quiet zone;
- no consumer PII or public private-routing number;
- explicit broker-review and no-guarantee boundaries;
- Equal Housing identification;
- story CTA and QR remain outside the guarded top/bottom interaction zones; and
- no NellySelly marker.

## Remaining Preview proof

After the candidate is committed and pushed:

1. require exact-head GitHub Node 24 release-gate success;
2. require a Ready Preview from the canonical Vercel project;
3. verify `/go/fb-seller` returns 307 to the exact full UTM destination and the
   destination returns 200;
4. verify unknown short code returns 404;
5. verify anonymous asset download and `/admin/distribution` fail closed;
6. verify public and readiness routes remain healthy and identify no NellySelly
   content; and
7. record the immutable head, run, deployment, and URL here.

No Production deployment, database migration/write, lead submission, email,
SMS, Push, WordPress change, DNS change, external publication, print
distribution, spend, or NellySelly mutation occurred.
