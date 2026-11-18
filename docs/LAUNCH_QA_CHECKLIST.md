# Launch QA checklist

Status: `PREPARED`

Use this checklist for every bounded release. Evidence belongs to the exact
head/tree being released.

- [ ] Confirm main, candidate head/tree, PR state, required checks, and merge
  base.
- [ ] Confirm migration, environment, provider, WordPress, DNS, send, and data
  mutation counts.
- [ ] Run secret scan, release doctor, 14-part safety scan, isolation check,
  tests, strict typecheck, lint, optimized build, and route manifest.
- [ ] Run migration static checks and PostgreSQL 17 replay/rollback tests when
  SQL changes.
- [ ] Verify the immutable protected Preview with writes and live sends off.
- [ ] Run desktop/mobile browser E2E and accessibility checks.
- [ ] Confirm rollback deployment/package and exact rollback trigger.
- [ ] Consume one exact approval phrase only after all evidence is current.
- [ ] Merge without changing the reviewed head; record merge commit/tree.
- [ ] Prove the Production deployment maps to that tree.
- [ ] Run read-only smoke, health, funnel, social, security-header, auth-boundary,
  and monitor checks.
- [ ] Run a controlled write/send only under its separate approval; label all
  synthetic records `is_test=true` and exclude them from KPIs.
- [ ] Roll back at the first failed boundary and record the receipt.

Current known non-candidate limitation: Facebook crawler HTTP 403 on selected
Our Town pages. Use only the bounded per-vhost GET/HEAD Apache remediation and
re-run all 42 social checks; never broadly disable WAF/security controls.
