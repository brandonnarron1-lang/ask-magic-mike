# Emergency Rollback - One Page

- One form: remove only its bridge allowlist ID; restore its prior native
  notification; preserve all entries and evidence.
- Global bridge: set `AMM_CANONICAL_BRIDGE_ENABLED=false`; Gravity Forms remains
  durable fallback storage.
- RBAC: turn the feature flag off, revoke affected sessions, retain fail-closed
  Basic Auth break-glass access, and do not drop RBAC tables.
- Vercel: promote the recorded prior Ready deployment; do not force-push or
  delete deployments.
- Neon: prefer a reviewed forward fix; never delete canonical lead, consent,
  attribution, audit, or notification history.
- Web Push: disable the channel flag or revoke only affected devices; keep email
  and outbox evidence.
- Hub subdomain: remove only the `hub` CNAME and Vercel domain attachment.
- Crawler rule: remove only the path/method/rule-ID exception; keep ModSecurity
  enabled.

After every rollback, run public smoke, readiness, funnel, anonymous-admin,
bridge, queue, test-suppression, NellySelly isolation, and legacy-Vercel isolation
checks. Record incident owner, timestamp, correlation IDs, impact, and recovery.
