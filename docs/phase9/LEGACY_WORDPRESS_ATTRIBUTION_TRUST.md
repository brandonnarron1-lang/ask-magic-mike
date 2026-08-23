# Phase 9 legacy WordPress attribution trust

Date: 2026-08-22

Candidate branch: `codex/phase9-legacy-wordpress-attribution-trust-20260822`

Release order: after the exact PR #195 conversion-identity release, with a
fresh released-main refresh and exact-head verification.

## Decision

Reuse the existing Neon Growth view and Owned Demand Command. Do not rewrite
stored attribution, create a second analytics table, add another WordPress
form, or describe historical links as exact campaign evidence.

The public Our Town audit fetched 42 of 42 sitemap pages and found three live
AskMagicMike.com links and two live embeds using the pre-owned-demand tuple:

- source `ourtownproperties`;
- campaign `website_widget`;
- one audited legacy medium;
- no `utm_content`; and
- an exact Our Town referrer page.

Those links remain useful traffic paths, but they cannot satisfy the new exact
`amm_owned_demand_2026` placement contract. Ignoring them hides real evidence;
silently relabeling them inflates a KPI. This candidate therefore adds a
narrow, read-only compatibility classification and reports it separately.

## Exact compatibility map

Every condition in a row must match. Unknown pages, hosts, protocols, ports,
campaigns, mediums, sources, or already-tagged records fail closed.

| Exact HTTPS Our Town referrer path | Recorded legacy medium | Compatibility placement |
| --- | --- | --- |
| `/` | `homepage_cta` | `wordpress_homepage_ask_mike` |
| `/how-much-is-your-home-worth/` | `home_value_page` | `wordpress_home_value_page` |
| `/we-buy-homes/` | `seller_page_cta` | `wordpress_we_buy_homes` |
| `/ask-magic-mike/` | `referral` | `wordpress_ask_magic_mike_embed` |
| `/ask-mike/` | `referral` | `wordpress_ask_magic_mike_embed` |

Accepted source aliases are limited to the historical Our Town values already
recognized by the canonical channel. The recorded campaign must be exactly
`website_widget`, and `utm_content` must be absent.

## KPI boundary

- Raw `source_attribution` rows are not changed.
- Full referrer values are used only in the protected server read model to
  validate the exact owned host and path; they are not returned to the UI.
- Exact owned-demand counts continue to require the canonical source, medium,
  campaign, and content tuple recorded on the latest eligible touch.
- Compatibility counts carry the explicit
  `legacy_wordpress_compatibility` basis.
- Compatibility evidence is shown separately in Distribution Command and is
  excluded from exact channel totals, activation lifecycle states, and the
  exact owned-demand KPI.
- Test and communication-suppressed leads remain excluded by the existing SQL
  boundary before either count is built.

## Operational meaning

A compatibility count proves only that an eligible lead has the exact audited
legacy tuple and exact Our Town referrer path. It does not prove publication,
campaign identity, consumer consent, qualification, appointment, signed
agreement, close, or revenue.

The repair remains the same: after a page-specific backup and exact WordPress
publication approval, replace one named link with the canonical tracked URL
already generated in `/admin/distribution`. Preserve Form 3 as the only proven
canonical Gravity Forms forward.

The separate public audit also continues to report:

- two Our Town pages blocked for the Facebook crawler;
- three untagged direct links;
- two incompletely tagged embeds;
- overlapping indexable intent pages; and
- multiple capture systems on five pages.

This application candidate does not change any of those public WordPress
surfaces or weaken the host firewall.

## Database, provider, and consumer impact

- Database migration: none.
- Database write: none.
- Lead or analytics write: none.
- Email, SMS, Push, or consumer acknowledgment: none.
- WordPress page, plugin, form, notification, or redirect change: none.
- Publication, DNS, spend, provider, or NellySelly action: none.

## Verification

Completed locally on the stacked candidate:

- focused compatibility, exact-KPI, and fail-closed checks: 6 files / 64 tests;
- full Node 24 suite: 215 files / 2,954 tests;
- strict typecheck, ESLint, and Next.js 15.5.21 optimized build;
- route manifest: 82 active / 17 acknowledged root/`src` duplicates;
- release safety: 14/14;
- release doctor: 43 pass / 0 fail / 0 skip;
- Ask Magic Mike launch doctor: 25 pass / 0 fail / 17 expected local-only
  Production-environment skips;
- public CTA audit: 24/24;
- Production dependency audit, candidate-range gitleaks, `git diff --check`,
  and no-migration scan; and
- local Production-mode visual QA at 1440 × 1000 and 390 × 844, with no
  horizontal overflow, no clipped mobile elements, and 0 console errors or
  warnings.

The visual run intentionally omitted canonical Neon and therefore proved the
truthful unavailable state: exact owned-source and legacy compatibility cards
render separately, both show `—`, and neither infers zero or a compatibility
count without measurement.

Still required before release:

1. exact-head GitHub CI;
2. canonical Vercel Preview and protected Preview verification;
3. read-only Production health comparison; and
4. exact released-main refresh after PR #195.

## Rollback

This is application-only. Repoint the canonical aliases to the recorded prior
Vercel Production deployment or revert the candidate merge. Neon and WordPress
require no rollback because neither is mutated.

## Release authority

This document and a green Preview are evidence, not Production authority. The
future application-only gate is:

`APPROVE PHASE 9 LEGACY WORDPRESS ATTRIBUTION TRUST MERGE AND PRODUCTION DEPLOYMENT`

That phrase must not be accepted before PR #195 is released and this candidate
is refreshed and re-proven on exact `main`. It does not authorize a WordPress
edit, crawler/firewall exception, lead submission, message, publication,
migration, spend, DNS change, provider action, deletion, or NellySelly action.
