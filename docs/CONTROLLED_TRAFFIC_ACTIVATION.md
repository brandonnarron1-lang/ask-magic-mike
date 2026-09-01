# Controlled Traffic Activation

<!-- amm-current-operations-v1 -->

Updated 2026-09-01. This runbook expands owned demand only after the canonical
lead path is healthy. Release identity comes from
`config/current-release-authority.json`; durable lead data is in Neon; staff
access uses Better Auth plus server-side RBAC. Action authority comes from
`OWNER_APPROVAL_QUEUE.md`; stop conditions come from `KNOWN_BLOCKERS.md`.

The canonical public site already accepts ordinary direct and organic visits.
This document governs deliberate placement or campaign expansion. It does not
turn a public visitor into a test lead, and it does not authorize a merge,
deployment, WordPress edit, message, publication, database mutation, DNS change,
provider purchase, or paid campaign.

## Activation principles

- Durable storage must succeed before a success state or notification attempt.
- A genuine public submission is a live prospect. Never fabricate one.
- Controlled QA uses `is_test=true` and `INTERNAL QA — DO NOT CONTACT`, and is
  excluded from production KPIs.
- Expand one attributable placement at a time. Preserve first touch, last
  touch, source URL, referrer, placement, UTMs, click IDs, consent, and session
  identity.
- Do not place contact data or other PII in analytics events or URLs.
- A launch application gate and an external publication gate are different
  approvals.

## Required evidence before expansion

| Evidence | Requirement |
| --- | --- |
| Application identity | Accepted Production and rollback deployment match the release-authority register |
| Release health | Launch doctor, authority report, smoke, funnel, route, and isolation checks pass |
| Data plane | Canonical Neon readiness is healthy; no competing lead database is treated as authoritative |
| Access boundary | Anonymous private routes deny access; Better Auth/RBAC grants only permitted records |
| Notification boundary | Lead storage is independent of delivery; failures remain visible and retryable |
| Attribution | Placement contract and tagged target URL are reviewed before publication |
| Approval | Exact, unconsumed gate names the system, placement/action, and rollback |

If any identity, environment, authorization, or proof differs from the recorded
authority, stop before creating traffic.

## Stage 0 — continuous public readiness

Stage 0 is read-only and may run at any time:

1. verify `https://www.askmagicmike.com` and the intended offer routes return
   expected non-5xx responses;
2. verify canonical metadata names the Production hostname;
3. verify health/readiness without exposing values;
4. verify anonymous Lead Center and protected admin endpoints deny access;
5. inspect recent errors and notification-failure counts; and
6. confirm the current authority report ends in
   `GO_CONTROLLED_TRAFFIC_READY`.

Natural direct and organic traffic may continue while these checks pass. A
material failure triggers the pause procedure below.

## Stage 1 — application release acceptance

Use this stage only when a new application release has its own exact approval.

1. execute only the approved PR/tree deployment sequence;
2. prove the canonical alias resolves to that exact Ready deployment;
3. run public smoke, funnel, health, isolation, and anonymous-auth checks;
4. inspect release-correlated errors; and
5. record the acceptance and immediate rollback artifact.

Do not add a WordPress placement, submit a QA lead, send a message, or publish a
campaign as part of an application-only gate.

## Stage 2 — one WordPress placement

This stage requires both the separately approved Connector 1.1.0 plugin upgrade
and an exact publication gate for one visible placement. Before editing:

1. create a fresh WordPress backup and placement manifest;
2. confirm the approved form/page/CTA ID and current destination;
3. confirm signed forwarding, retry visibility, local audit-copy behavior, and
   duplicate-email prevention;
4. define a stable `placement_id` and tagged canonical target URL; and
5. record the one-step rollback.

After publication, inspect the page anonymously on mobile and desktop, follow
the CTA without submitting a fabricated lead, verify the canonical destination
and attribution parameters, and record the visible result. Do not enable a
site-wide widget during this stage.

Recommended order after separate approvals:

1. homepage Ask Magic Mike placement;
2. home-value placement;
3. We Buy Houses/seller placement;
4. Mike agent page;
5. selected listing, rental, and open-house placements.

Advance one placement at a time only after the previous placement remains
healthy.

## Stage 3 — one owned-distribution placement

Each Google Business Profile post, social post, email/newsletter item, or QR
placement is a separate external publication/send action unless one exact gate
explicitly lists a bounded set.

For an approved placement:

- use the reviewed offer and compliant copy;
- use the canonical hostname and stable UTM convention;
- record channel, account/page, URL, publication time, and rollback/removal
  method without storing credentials;
- verify the public destination and analytics event names; and
- observe genuine-lead, duplicate, notification, and SLA behavior before adding
  another placement.

No paid traffic is included.

## Stage 4 — measured expansion

Expand only after a meaningful observation window shows:

- the public route and submission API remain healthy;
- every lead has one canonical durable record;
- consent and attribution are present;
- dedupe and idempotency prevent duplicate records and alerts;
- assignment, score explanation, and SLA are visible;
- notification delivery or failure/retry state is visible;
- test records remain excluded from live KPIs; and
- operators can respond within the approved SLA.

Use demand and operational evidence, not synthetic volume, to decide whether to
add the next placement.

## Monitoring schedule

| Checkpoint | Inspect | Pause when |
| --- | --- | --- |
| Immediately | Public route, canonical URL, placement destination | Wrong route, hostname, content, or attribution |
| 15 minutes | Vercel errors and 5xx responses | New release/placement-correlated failures |
| 1 hour | Lead creation, duplicate rate, queue/failure state, SLA | Missing, duplicated, unassigned, or invisible failure state |
| First genuine lead | Source/consent, score/route, Lead Center record, notification ledger | Any critical field or durable step is missing |
| 24 hours | Source totals, qualified leads, notification failures, response outcomes | KPI contamination or unresolved operational regression |

Record exact timestamps and immutable evidence in `OWNER_ACTION_PROOF_PACK.md`.
Do not label queued notification state as delivered.

## Channels not activated by this runbook

- paid search, paid social, retargeting, or lead-vendor purchases;
- carrier SMS or automated consumer texting;
- bulk or nurture email;
- unreviewed social/GBP publication;
- global WordPress injection;
- DNS, domain, mailbox, or sender-authentication changes;
- MLS/IDX data expansion;
- live-data deletion, merge, or import; and
- any NellySelly system, domain, project, database, or credential.

Each requires its own approved scope and applicable compliance review.

## Pause and rollback

Pause deliberate traffic expansion when any of these occurs:

- a public lead route returns 5xx or reports success without durable storage;
- private data is visible without authorization;
- the canonical database or project identity is uncertain;
- leads are missing, duplicated, misrouted, or absent from the Lead Center;
- notification failures are hidden or retry state is not observable;
- attribution or consent evidence is missing;
- test traffic enters live KPIs; or
- the release/placement differs from the approved evidence.

Then:

1. stop only the affected newly activated placement or channel;
2. restore its recorded prior state or application rollback artifact;
3. preserve lead, audit, notification, and error records;
4. re-run route, health, auth, data, and notification checks; and
5. update `KNOWN_BLOCKERS.md` and the proof pack before resuming.

Do not delete lead records, purge caches, change DNS, or send incident messaging
unless separately authorized.

## Activation receipt

```text
Operator: ____________________
Timestamp: ____________________
Stage and exact placement: ____________________
Approval phrase/status: ____________________
Release/deployment identity: ____________________
Target URL and placement_id: ____________________
Preflight evidence: ____________________
Post-publication evidence: ____________________
Monitoring result: PASS / PAUSE / ROLLBACK
Rollback action/result: ____________________
```

`GO_NO_GO_COMMAND_CENTER.md` is the current operational decision surface.
