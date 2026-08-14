# Attribution Acceptance Report

Form 3 entry 1549 preserved:

- source: `internal_qa_wordpress_bridge`
- medium: `qa`
- campaign: `bridge_v1_1_0_acceptance`
- content: `gravity_form_3`
- placement: `gravity_form_home_value`
- full source URL
- first and last touch landing page
- form and entry context

The internal alert reproduced the stored source URL, first touch, last touch,
UTMs, placement, submission time, lead ID, and correlation ID. No raw lead data
was sent to GA4 or another advertising audience during QA.

The QA run exposed a bridge/API compatibility gap: the bridge sends click IDs in
a nested object while the API originally read top-level attribution fields. The
normalizer now accepts both shapes and prefers canonical top-level values when
both exist. The historical QA-only `gclid` remains absent from its original lead;
future WordPress submissions preserve approved click IDs without a migration.
