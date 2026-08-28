# Phase 9 Social Preview Wide Card

Status: Draft candidate; no Production deployment or external publication.

## Reuse decision

The repository already contained the approved 2880x1620 Black Diamond desktop
hero and exact Our Town Properties logo. The social metadata instead used a
1080x1350 portrait feed asset as an Open Graph and X `summary_large_image`,
which invites unpredictable horizontal cropping. This candidate does not
replace the hero, social feed/story exports, or visual system.

The new `og-card-1200x630.jpg` is a deterministic composition of those two
existing approved assets. Mike's source photograph is cropped and overlaid but
not regenerated, retouched, or identity-edited. An AI-assisted concept was used
only to evaluate hierarchy and was rejected as a runtime asset when it changed
identity details.

## Output contract

- output: `public/brand/black-diamond/og-card-1200x630.jpg`;
- dimensions: 1200x630 (1.90:1);
- output SHA-256:
  `68dea02d8b4beb24eb864363c2c0d30adc1c98f4d5f37872a32848dad037c713`;
- source photo: `public/brand/black-diamond/hero-home-desktop.jpg`;
- source SHA-256:
  `e96c83acaa4555ce0bb4e62fda7db18cd8b6c0a2476efd1987a9f5843ec70aa4`;
- logo: `public/brand/black-diamond/our-town-logo.png`;
- logo SHA-256:
  `d6f9cf50829416c348985307e68b111f8e46665a1c603810b46b55b377c32d49`;
- exact public copy contains no valuation, offer, response-time, or availability
  claim;
- no phone number, lead data, MLS field, or synthetic prospect appears;
- root and route-specific metadata reuse `mikePlatformAssets.openGraphCard`;
- 4:5 and 9:16 campaign exports remain unchanged.

Local regeneration is explicit and reviewable:

```bash
pnpm run amm:generate:social-card
```

The generator requires ImageMagick and the named local typography sources. It
prints output dimensions, size, and SHA-256 lineage and contains no network or
provider call.

## Current crawler boundary

The 2026-08-28 live matrix remains 40/42. AskMagicMike.com returns 200 to the
browser, Facebook, X, LinkedIn, Slack, and Discord crawler profiles. The Our
Town host still blocks any user-agent containing `facebookexternalhit` before
WordPress, including public pages and images. This asset does not weaken that
firewall or change WordPress. Social publication should continue using
AskMagicMike.com links until the host operator identifies the exact managed rule
and applies the separately documented path/method/source-scoped exception.

## Rollback

Revert the metadata references and remove only the new generated card. The
existing portrait feed/story assets remain available. No database, lead,
notification, provider, WordPress, DNS, environment, or NellySelly rollback is
required.
