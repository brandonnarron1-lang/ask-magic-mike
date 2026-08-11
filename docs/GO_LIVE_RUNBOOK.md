# Go-Live Runbook

## Approval gates

Before each external action, state the exact URL/system, action, rollback, and
expected impact. Required approvals are separate for: secure env entry, database
migration, production deploy, first internal QA email, consumer acknowledgment,
WordPress publish, DNS/domain changes, and marketing publication.

## Sequence

1. Review the local diff and rescue branch.
2. Apply the additive migration to the approved non-production database.
3. Configure Vercel production envs through the secure interface; keep email disabled
   until sender/BCC/recipient verification.
4. Deploy the reviewed commit to a protected preview and run route/API/widget/admin
   checks.
5. Obtain production deployment approval; deploy and verify `/`, `/ask`, `/sell`,
   `/value`, `/buy`, `/rent`, `/open-house/<property-or-id>`, `/widget/v1`,
   `/robots.txt`, `/sitemap.xml`, `/privacy`, `/terms`, `/accessibility`, and
   `/contact`.
6. Obtain first QA-email approval; submit one public QA lead, verify storage,
   attribution, dashboard, Mike delivery, hidden BCC, provider ID, and no duplicate.
7. Mark the QA record test/suppressed and exclude it from KPI reports.
8. Obtain separate WordPress approval; publish one reversible source-tagged CTA or
   widget placement and monitor before adding more.

## Exact next approval gate

The next action is a protected preview deployment of the reviewed rescue-branch
candidate after the owner confirms the target Supabase project and enters no
secrets in chat. Proposed action: deploy the candidate to an existing Vercel preview
only; affected system is the `ask-magic-mike` Vercel project; rollback is delete-free
preview abandonment and redeploy of the recorded production deployment; expected
impact is route/API verification only, with no public alias or email send. Production
deployment, live migration, secure env entry, first QA email, and WordPress changes
remain separate approvals.

## Stop conditions

Stop if Supabase schema/credentials are ambiguous, email sender alignment is not
verified, authorization is bypassed, a provider returns unknown state, a lead is not
durable, a public page serves wrong-brand content, or any required owner takeover is
shown. Do not guess credentials or DNS.
