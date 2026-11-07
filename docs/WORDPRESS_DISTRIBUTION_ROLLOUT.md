# WordPress distribution rollout

Status: `PREPARED`

Our Town Properties remains the brokerage, SEO, listings, agents, rentals,
FlexMLS/IDX, and local-trust authority. WordPress is a source-tagged bridge into
the canonical Ask Magic Mike backend; it is not a second CRM or notification
system.

## Current live state

- Our Town homepage, Home Value, Ask Mike, and Mike agent surfaces return HTTP
  200.
- `/ask-mike/` loads the canonical Ask Magic Mike embed loader.
- Prior authenticated evidence records the signed canonical bridge for Gravity
  Form 3, with its duplicate native email disabled.
- Home Value contains a tagged Ask Magic Mike destination.
- The homepage Ask Magic Mike CTA exists in HTML but is suppressed by live CSS;
  it must not be reported as visible.
- The verified public brokerage telephone number remains `252-243-7700`.

## Ordered rollout

1. Accept PR #248 as an application-only release.
2. Back up WordPress files/database and capture plugin/page hashes.
3. Separately approve connector 1.1.0 installation; verify the install ZIP hash
   and retain the 1.0.0 rollback ZIP.
4. Verify settings, shortcodes, public version marker, CSP, layout,
   accessibility, and performance without publishing a new placement.
5. Publish Home Value first with its exact placement UTM contract.
6. Measure and reconcile before publishing We Buy Homes.
7. Resolve the homepage CSS suppression before any homepage publication.
8. Port and verify rental, Mike profile, selected listing, and open-house
   placement readiness in Batch D; publish each bounded group separately.

Form 7 remains a separate decision because its Draft package can create a
parallel bridge if installed without consolidation. No plugin, page, form,
notification, menu, cache, or Apache rule was changed in this work.

## Rollback

- Restore the connector 1.0.0 ZIP or the pre-change plugin snapshot.
- Restore the exact pre-change page revision for a failed placement.
- Re-enable a native Gravity Forms notification only if canonical forwarding is
  first disabled and the rollback plan explicitly requires it.
- Re-run source-attribution and duplicate-delivery checks.
