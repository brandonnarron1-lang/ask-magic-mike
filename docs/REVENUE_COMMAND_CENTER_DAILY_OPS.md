# Lead Center — Daily Operating Guide

Updated 2026-08-21. The former `/admin/revenue` Supabase/Basic-auth guide is
retired. Current operators use canonical Neon data and per-user Better Auth/RBAC
under `https://www.askmagicmike.com/admin`.

## Access

1. Open `https://www.askmagicmike.com/lead-center-login`.
2. Sign in with your own approved Lead Center account.
3. Never share a session, use another person's identity, or request
   `ADMIN_SECRET` for routine access.
4. Agents see only assigned leads unless an administrator explicitly grants a
   broader role. Administrators still operate under audited permissions.

## Five-minute morning review

1. **Action queue — `/admin/action-queue`**
   - Review overdue follow-ups, appointment requests, stalled leads, and retry
     items.
   - Work priority P1/P2 first.
   - Administrators must confirm first-response coverage is complete. `Held`
     means immutable response evidence is unavailable; any uncovered count is
     an immediate operational escalation, not an empty-queue success.
   - Assigned-only agents do not see brokerage-wide coverage totals; work only
     the assigned items visible in their authenticated queue.
   - Open the lead detail before contacting anyone; verify it is not test,
     suppressed, duplicate-only, or consent-restricted.
2. **Lead inbox — `/admin/leads?filter=active`**
   - Review new, unassigned, hot, and SLA-due leads.
   - Confirm assignee, stage, routing reason, next action, and notification
     status.
3. **Notifications — `/admin/notifications`**
   - Investigate failed or retry-scheduled internal alerts.
   - A queued provider state is not proof of delivery. Use the provider message
     ID and delivery history.
4. **Reporting — `/admin/reporting`**
   - Review 7-, 30-, and 90-day source, status, assignment, and conversion views.
   - Test and suppressed records remain excluded from production KPIs.
5. **Growth — `/admin/growth`**
   - Review source economics, outcome evidence, first-response sample size, and
     data-quality flags.
   - Treat empty or small samples as collecting evidence, not as a failed funnel
     or a statistical conclusion.

## Current demand truth

Do not operate from a fixed lead count in this document. Read the current
Action Queue, Lead inbox, and Growth aggregate at the start of every shift;
those protected runtime views are authoritative and may change after any
genuine submission or response. Never fabricate a prospect, rename a QA
record, or contact `INTERNAL QA — DO NOT CONTACT` data.

## Working a genuine lead

1. Verify contactability, communication preference, consent, suppression,
   duplicate/master status, source, and assigned owner.
2. Follow the displayed SLA and use the lead's stated channel preference.
3. Record the actual first human response once. Do not infer it from a mutable
   status timestamp.
4. Add a concise note and next task; update stage only when the real-world event
   occurred.
5. Record an appointment, qualified state, closed outcome, or actual brokerage
   revenue only with evidence. Never enter estimated sale value as brokerage
   revenue.

Every assignment, stage, response, outcome, revenue, export, note, and task action
must remain attributable to the signed-in operator.

## Owned-demand workflow

- `/admin/distribution` prepares approved copy and tracked links. Copy controls
  are local-only and do not publish.
- The only requestable application release phrase is maintained in
  `OWNER_APPROVAL_QUEUE.md`. Newer stacked Drafts and historical PR phrases do
  not create release authority.
- A channel is not live until an authorized human publishes/configures/distributes
  it in the native platform and records valid evidence.
- Social/GBP publication, email campaigns, QR distribution, WordPress changes,
  spend, and consumer messages each retain their own approval.

## Staff alerts

- Internal authenticated email and protected audit BCC have controlled delivery
  evidence.
- Web Push is the free-first phone alert and requires per-device human enrollment.
- Carrier SMS/MMS is disabled until an approved registered sender/provider exists.
  Do not use an unregistered, carrier-bypass, or personal-device automation.

## WordPress and source checks

- Our Town Properties remains the brokerage/SEO authority.
- Signed bridge 1.1.0 forwards only approved Home Value Form 3.
- Gravity Forms retains the local entry; duplicate native Form 3 email is inactive.
- Forms 1, 2, and 4–7 remain outside the bridge allowlist pending approved
  field/consent contracts.
- Selected Our Town URLs are blocked for FacebookExternalHit by the proven
  server-global Apache `authz_core` rule. Use AskMagicMike.com campaign links
  until the host applies and verifies the bounded per-vhost/account override.

## Escalate immediately

- A genuine contactable lead is unassigned or beyond SLA.
- Durable capture fails, readiness is non-200, or the public form shows a
  correlation ID.
- An internal alert exhausts retries or lacks a provider message ID after send.
- An authenticated agent can see another agent's lead.
- Anonymous access reaches private Lead Center data.
- An Ask Magic Mike hostname serves NellySelly identity or points at another
  project.
- A test/suppressed lead appears in production KPIs.
- A planned publication cannot be tied to exact approved copy, URL, identity,
  visual, and removal owner.

## Do not do

- Do not delete QA/audit evidence to make dashboards look cleaner.
- Do not contact preserved Form 7 entry 1550 until Mike/BIC records a purpose and
  consent decision.
- Do not paste credentials, private recipient addresses, connection strings, or
  tokens into tickets, chat, screenshots, URLs, or reports.
- Do not rerun a completed Production migration because an old approval phrase
  is repeated.
- Do not replay a historical PR phrase or merge a stacked Draft out of order;
  refresh and re-prove the exact head after its approved parent reaches
  Production.

The exact active gates and resolved releases are maintained in
`OWNER_APPROVAL_QUEUE.md`; that file overrides historical prompts.
