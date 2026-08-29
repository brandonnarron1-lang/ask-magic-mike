# Phase 9 WordPress homepage visibility truth

Date: 2026-08-29

Mode: read-only public precondition hardening

External mutation: none

## Outcome

The homepage Ask Magic Mike anchor exists, but it is not a live owned-demand
placement. Public CSS suppresses its enclosing `.amm-cta` component with
`display:none !important`. Replacing only that hidden anchor's destination
would preserve a hidden element and would not activate demand.

This candidate repairs the existing WordPress readiness manifest so that
structural link presence cannot be mistaken for visible-placement readiness.
It does not create another funnel, form, lead store, publisher, dashboard,
analytics system, or WordPress bridge.

## Fresh public evidence

Read-only public inspection at `2026-08-29T23:04:23.127Z` returned:

- source page `https://www.ourtownproperties.com/`;
- published WordPress page ID `149`, matching the reviewed target;
- modification time `2026-06-01T20:53:21`;
- one exact Ask Magic Mike href and zero rejected lookalikes;
- one exact legacy/rollback href;
- two known hidden CSS selectors affecting one exact target container;
- `targetVisibility=hidden_by_known_css`;
- `status=hidden_target`;
- `publicationBlocked=true` and `publicationAuthorized=false`;
- precondition SHA-256
  `60614f9ce7f7e7fe165a6c3cf0d142a6669faf497fee4f94386aff34827d0638`;
- no raw HTML retained and no mutation performed.

Browser inspection independently confirmed that the single
`askmagicmike.com` anchor has accessible text `Start With Your Address` but is
not visible. The live source contains an `amm-visual-containment` style that
suppresses `.amm-cta` and `.amm-cta--dark`. The public brokerage homepage,
current `252-243-7700` number, navigation, and SEO surface remain unchanged.

The home-value and We Buy Homes manifests remain separate. Fresh structural
inspection classified them as `visible_candidate` and `legacy_match_ready`;
that does not authorize either page or make them substitutes for a homepage
decision.

## Implementation

The existing manifest now records:

- schema version `amm.wordpress_activation_change_set.v2`;
- `targetVisibility` as `visible_candidate`, `hidden_by_known_css`, or
  `unknown`;
- `hiddenTargetOccurrences`;
- `hiddenCssSelectorOccurrences`;
- the visibility facts inside its deterministic precondition hash; and
- a dedicated `hidden_target` fail-closed status.

The detector joins two public structural facts before blocking:

1. the exact allowlisted Ask Magic Mike href is nested in a known Ask Magic
   Mike CTA container; and
2. public CSS applies an exact `display:none !important` rule to that container
   class.

A matching rule without a matching container does not create a false block,
and a container class without the hiding rule remains only a
`visible_candidate`; the manifest does not claim browser-computed visibility.

## Decision and publication boundary

The former homepage href-only packet is superseded while
`status=hidden_target`. Its historical phrase must not be used to publish an
invisible link:

`APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION`

Before any new WordPress gate is requestable:

1. select one visible existing homepage placement or prepare a reviewed
   restoration of this exact component;
2. preserve the live page, phone number, SEO content, forms, theme, plugins,
   and menu;
3. verify desktop/mobile layout, keyboard behavior, and brokerage/BIC copy;
4. create and verify a recoverable page-149 revision or backup;
5. regenerate the manifest and require `targetVisibility=visible_candidate`;
6. issue a new exact placement-specific WordPress publication gate with one
   proposed change and one rollback; and
7. after approval, verify the visible public CTA and analytics without
   submitting a lead.

This application candidate has its own later release phrase:

`APPROVE PHASE 9 WORDPRESS CTA VISIBILITY TRUTH MERGE AND PRODUCTION DEPLOYMENT`

That phrase can authorize only this application-code merge and exact-commit
Vercel Production deployment after the ordered PR queue reaches this candidate.
It cannot authorize WordPress publication, a cache purge, database write, lead
submission, message, provider action, DNS change, spend, deletion, or
NellySelly action.

## Current official guidance

- WordPress revisions preserve prior saved or published versions and support a
  recoverable page rollback:
  <https://wordpress.org/documentation/article/revisions/>.
- GA4 manual traffic-source reporting uses URL UTM parameters, including
  `utm_content` for manual ad/content identity:
  <https://support.google.com/analytics/answer/11242870?hl=en_U>.
- Google recommends linking consistently to canonical destinations and using
  permanent server redirects only when a duplicate URL is actually being
  deprecated:
  <https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls>.

These sources support rollback, attribution, and canonical discipline; they do
not turn hidden markup into a visible placement or authorize a publication.

## Rollback and isolation

Application rollback is redeployment of the exact predecessor commit. No
database rollback exists because this candidate adds no migration or data
write. No WordPress rollback exists yet because no WordPress state changed.

NellySelly is outside every hostname, project, database, route, environment
variable, and action in this candidate. No NellySelly resource was read or
modified.
