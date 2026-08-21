# Phase 9 owned-demand asset studio — QA evidence

Recorded 2026-08-21 in America/New_York.

## Scope and provenance

- Branch: `codex/phase9-owned-demand-asset-studio-20260821`
- Stack base: Draft PR #185 head
  `be99a1838c1c36ffc474bc97c11ef2a88e53107c`
- Draft PR: #186
- Runtime hardening head:
  `bce07766ae40d8035ddac8be853dfed89248f427`
- Production baseline remained PR #181 / deployment
  `dpl_HVoqg1t4j2SJWPFMEEzpiHGQ6hmM`
- Canonical app/database/provider configuration was not mutated.

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
6. The first real Preview authorization check failed closed with
   `409 rbac_not_enabled`, but the generic authorization response inherited a
   cacheable default. The asset route now applies its private/no-store/noindex
   policy to every authorization failure before returning it.

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

## Exact runtime-head Preview proof

- GitHub Node 24 run `32520888862`, job `96892603764`: PASS in 3m5s.
- Canonical Vercel deployment:
  `dpl_6i4VqGrQUFaWdgoKznLYGwkgPvtq` / Ready.
- URL:
  `https://ask-magic-mike-4pf7a9l92-eyes-up-industries.vercel.app`.
- `/`, `/api/health/live`, and `/api/health/ready`: HTTP 200.
- Liveness identifies only `ask-magic-mike`, Preview, canonical Neon, disabled
  notification mode, and disabled email sending.
- Readiness confirms database, capture function, lead/notification tables, RBAC
  schema, Push subscription table, and phone setup are ready.
- `/go/fb-seller`: HTTP 307, no-store/noindex, exact destination
  `https://www.askmagicmike.com/home-value?utm_source=facebook&utm_medium=social_organic&utm_campaign=amm_owned_demand_2026&utm_content=facebook_local_question_seller_review`.
- That full canonical destination returns HTTP 200.
- `/go/not-approved`: HTTP 404 with no-store/noindex.
- `/robots.txt` disallows `/go/` while retaining the canonical sitemap.
- Anonymous `/admin/distribution`: HTTP 401 with Basic challenge, no-store,
  SAMEORIGIN, and noindex.
- Preview RBAC mutation mode is intentionally disabled. Anonymous asset export
  therefore fails closed with HTTP 409 `rbac_not_enabled` and now carries
  `private, no-store`, no-referrer, `nosniff`, and noindex headers.
- Render identity counts: Ask Magic Mike 24, Our Town Properties 34, NellySelly
  0.
- No Preview lead/event/database write, message, provider call, or publication
  was attempted.

The later documentation-only head must retain the required GitHub and Vercel
checks. Its mutable identifiers belong in PR #186 metadata rather than a
self-referential evidence commit.

The first protected-Preview probe ran before this worktree had canonical Vercel
link metadata. It created empty helper project
`amm-phase9-owned-demand-assets-20260821`
(`prj_v8534MJYV5xUCp3pYqxWsmZJPifK`) and targeted that project's bypass token,
so the resulting SSO redirects are not candidate evidence. Read-only inspection
confirms the helper has zero deployments and no domain. The worktree was
relinked to the canonical project before repeating verification. The helper was
not silently deleted.

No Production deployment, database migration/write, lead submission, email,
SMS, Push, WordPress change, DNS change, external publication, print
distribution, spend, or NellySelly mutation occurred.
