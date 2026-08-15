# Phase 3 Pre-change Production Snapshot

Captured: 2026-08-14, approximately 6:38 PM America/New_York

This snapshot is read-only and precedes Phase 3 schema, RBAC, form, DNS, and
notification changes.

## Canonical deployment

- Repository: `brandonnarron1-lang/ask-magic-mike`
- Production branch: `main`
- Production Git commit: `27b9e5422bee8078afe7cd54231c291458f6aacb`
- Vercel team: `eyes-up-industries`
- Vercel project: `ask-magic-mike`
- Vercel project ID: `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`
- Production deployment: `dpl_DTLUBvTFL8jwQtzaFrsHmRdUWmWu`
- Deployment URL: `ask-magic-mike-93gi8hedq-eyes-up-industries.vercel.app`
- Deployment state: Ready
- Production aliases: `www.askmagicmike.com`, `askmagicmike.com`, and the
  expected Vercel aliases
- Vercel error logs in the inspected one-hour window: none returned

## Public and operational readiness

- Production smoke: 19 pass, 2 authenticated/write checks skipped, 0 fail
- Liveness/readiness: 2 pass, protected dependency detail skipped locally
- Live funnel: 15 pass, 0 fail
- Point-in-time production monitor: 9 pass, 0 fail
- Synthetic monitor: 6 pass, 1 authenticated check skipped, 0 fail
- Ask Magic Mike / NellySelly isolation check: pass
- Anonymous Lead Center access: HTTP 401
- Production authentication mode: shared `ADMIN_SECRET` boundary remains
  active; per-user RBAC is not enabled
- `LEAD_CENTER_RBAC_ENABLED`: not configured in Vercel and defaults to false

## Canonical Neon state

- Project: `bitter-star-20214385`
- Production branch: `br-round-base-auh6h2wd` (`production`)
- Database: `neondb`
- Core lead/notification/rate-limit/Web Push schema: present
- `request_idempotency_key` lead column: present
- Notification channel support: present
- RBAC user/session tables: absent
- Supabase migration ledger table: absent; this Neon database was provisioned
  by direct migration execution, so feature-presence checks are the reliable
  production-state evidence

## Production counts

| Metric | Count |
| --- | ---: |
| Test leads | 6 |
| Live leads | 0 |
| Unsuppressed test leads | 0 |
| Notification queue (`queued` or `retrying`) | 0 |
| Failed notifications | 0 |
| Unassigned live leads | 0 |
| Active Web Push subscriptions | 0 |
| Primary-recipient Web Push subscriptions | 0 |
| Copy-recipient Web Push subscriptions | 0 |

## WordPress / Gravity Forms

- Canonical bridge version: 1.1.0
- Bridge signing secret: configured; value not displayed or copied
- Bridge allowlist: Form 3 only
- Form 3 / Entry 1549: forwarded in one attempt to one canonical lead
- Form 3 native duplicate Admin Notification: Inactive
- Form 7 / Entry 1550: `shadow_not_allowlisted`, attempt 0, no canonical ID
- Forms 1 through 7 are active as Gravity Forms forms; this does not mean they
  are active in the canonical bridge
- Current entry counts observed: Form 1 = 1337, Form 2 = 27, Form 3 = 10,
  Form 4 = 4, Form 5 = 0, Form 6 = 18, Form 7 = 153
- Form 7 has no Consent field; its entry 1550 disposition is recorded in
  `FORM7_ENTRY_1550_DISPOSITION.md`

## Scheduled operations and alerts

- SLA cron is configured in `vercel.json` at `0 * * * *` for
  `/api/admin/sla/sweep`
- `CRON_SECRET` exists in the production Vercel environment
- No Vercel error log was returned for the inspected interval
- End-to-end cron execution history was not exposed by the read-only local
  check and remains a monitoring verification item
- Internal email notification environment variables are present in Production;
  secret values and private BCC are not displayed
- Carrier SMS remains disabled by product policy
- Web Push runtime schema is present, but no staff device is enrolled

## Social crawler and domain state

- AskMagicMike.com Facebook/Twitter/LinkedIn/Slack/Discord crawler checks pass
- OurTownProperties.com browser baseline and non-Facebook crawler checks pass
- Facebook crawler receives HTTP 403 on `/ask-mike/` and Mike's agent profile
- No broad WAF change has been made
- `hub.ourtownproperties.com` is not yet provisioned

## Pre-change blockers

1. Form 7 entry 1550 requires brokerage/BIC review because consent is unclear.
2. Remaining production reporting/mutation paths must be reconciled to Neon
   before RBAC can be enabled.
3. RBAC must pass an isolated Neon Preview + Vercel Preview acceptance suite.
4. Production staff identities and roles are not yet sufficiently verified for
   provisioning.
5. Web Push has zero enrolled devices.
6. The narrow Facebook crawler allow rule remains outstanding.
7. An editable Phase 3 executive PPTX remains to be generated and verified.

