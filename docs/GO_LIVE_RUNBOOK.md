# Go-Live Runbook

## Approval gates

Before each external action, state the exact URL/system, action, rollback, and
expected impact. Required approvals are separate for: secure env entry, database
migration, production deploy, first internal QA email, consumer acknowledgment,
WordPress publish, DNS/domain changes, and marketing publication.

## Current baseline

- Canonical data is Neon PostgreSQL. Supabase is compatibility-only and is not a
  release prerequisite.
- The public funnel, canonical capture, protected Lead Center, email provider,
  hidden audit copy, WordPress Form 3 bridge, and test suppression have already
  completed controlled Production acceptance.
- Production remains on commit
  `1c9c4eedae4de3d993def32dc6d646c1be2908ca` and Vercel deployment
  `dpl_BCrmEB67TZDbJ9ihyLvsQkP5deD6` until another exact deployment gate is
  granted.

## Phase 9 release sequence

1. Merge and Production-deploy PR `#170` only after the exact Phase 9.1 gate.
   Verify `/admin/distribution`, RBAC denial, private/no-store behavior, Production
   health, route manifest, and rollback checkpoint. Do not publish any draft.
2. Refresh PR `#173` onto the resulting Production commit, rerun its release and
   visual gates, then request the separate Phase 9.4 `/plan` deployment approval.
3. Refresh PR `#172` only after the earlier Phase 9 merges. Keep Database Revival
   read-only; enrollment and communication remain separately prohibited.
4. Run SMTP connection-only verification only after its named gate. A successful
   connection does not authorize an email.
5. Run one controlled internal QA email only after its named send gate; verify the
   provider message ID, Mike delivery, hidden BCC, canonical notification record,
   retry state, suppression, and KPI exclusion.
6. Prepare channel-specific owned-demand publication packets. Publication requires
   a separate approval naming the account, final copy, visual, tracked URL, and
   delete/rollback procedure.

## Exact next approval gate

Proposed action: merge PR `#170` into `main` and allow the canonical
`eyes-up-industries/ask-magic-mike` Vercel project to deploy it to Production.

- Affected surface: protected `/admin/distribution` plus its admin navigation and
  route-manifest entry.
- Expected impact: authorized operators can inspect six tracked, human-reviewed
  owned-demand drafts and observed owned-source signals. There is no public post,
  message, provider action, spend, database write, or WordPress mutation.
- Rollback: revert the PR `#170` merge commit or promote the immediately preceding
  Ready Production deployment `dpl_BCrmEB67TZDbJ9ihyLvsQkP5deD6`.
- Required approval:
  `APPROVE PHASE 9.1 OWNED DEMAND COMMAND MERGE AND PRODUCTION DEPLOYMENT`.

## Stop conditions

Stop if the canonical Neon environment is ambiguous or unhealthy, authorization
is bypassed, a provider returns unknown state, a lead is not durable, a public page
serves wrong-brand content, a proposed action exceeds its named approval gate, or
any required owner takeover is shown. Do not guess credentials, recipients, DNS,
publication identity, or consent.
