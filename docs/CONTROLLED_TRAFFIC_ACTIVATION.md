# Controlled Traffic Activation — Ask Magic Mike

**Current operating runbook**

**Updated:** 2026-08-21

**Production baseline:** PR #181, merge commit `5335697edf31eed0b8a38cd0295a4f5e7d501a3e`

**Canonical public host:** `https://www.askmagicmike.com`

**Canonical data store:** Neon PostgreSQL project `bitter-star-20214385`, Production branch `br-round-base-auh6h2wd`

**Staff access:** Better Auth/RBAC Lead Center at `/admin`

This runbook governs controlled public QA and zero-spend owned traffic. It
supersedes the LC-7 Supabase instructions retained elsewhere as history. It
does not authorize DNS changes, a deployment, a WordPress publication, an
external message, a database mutation, or a marketing publication by itself.

## 1. Truth standard

Never fabricate a live prospect.

- A **QA TEST LEAD** contains both `INTERNAL QA` and `DO NOT CONTACT` in the
  submitted name or message. Canonical normalization sets `is_test=true`, and
  the record remains suppressed and excluded from production KPIs.
- A **LIVE PROSPECT** is created only by an unrelated consumer using a public
  form. Never relabel a synthetic record as live.
- Do not delete a QA record as part of acceptance. Retain its audit trail and
  suppress it. Deletion or production-data cleanup requires a separate,
  explicit data-change approval and a verified backup.
- A stored or queued notification is not delivery proof. Delivery proof must
  include the provider status and message identifier.

## 2. Current verified baseline

As of 2026-08-21:

- `www.askmagicmike.com` serves Ask Magic Mike; apex redirects permanently to
  `www`; no Ask Magic Mike hostname serves NellySelly content.
- `/sell`, `/buy`, `/home-value`, `/value`, `/plan`, and the public health
  endpoints respond successfully.
- Anonymous `/admin`, `/admin/leads`, and `/admin/growth` access is denied or
  redirected to staff login.
- Production uses canonical Neon, not Supabase. The PR #180 outcome ledger and
  PR #181 first-human-response milestone migrations are installed and verified.
- Six existing records are suppressed QA leads. There are no recorded live
  leads, live outcomes, live response milestones, active experiments, or
  recorded paid spend.
- Internal email notification infrastructure reports ready. Carrier SMS and
  consumer auto-send remain separately gated.

## 3. Read-only preflight

Run from the canonical repository. These commands do not submit a lead or send
a message:

```bash
pnpm run amm:launch:doctor
pnpm run amm:launch:authority
pnpm run amm:public:cta-check
pnpm run amm:verify:funnel
pnpm run amm:smoke:prod
```

Expected code result:

- zero launch-doctor failures;
- zero launch-authority code/doc failures (local secret checks may remain
  `SKIP_OWNER` because secrets are deliberately absent from the shell);
- `PUBLIC_CTA_CHECK: PASS`;
- funnel 15/15;
- production smoke with only intentional protected/write skips.

Then verify, without exposing values:

1. Production liveness and readiness return HTTP 200.
2. Readiness identifies Neon and the Production notification mode.
3. Canonical host and apex redirect are correct.
4. Anonymous Lead Center routes remain closed.
5. The authenticated Lead Center shows the latest system health and no
   unexplained notification failures.

Stop if any check fails. Do not compensate by disabling authentication,
weakening deployment protection, or pointing Production to Preview data.

## 4. Existing owned placements

The following Our Town Properties surfaces were observed already connected to
the canonical Ask Magic Mike system and should be verified before adding new
placements:

| Our Town surface | Existing destination or integration |
|---|---|
| Homepage Ask Magic Mike CTA | `/value` with `ourtownproperties`, `homepage_cta`, and `website_widget` attribution |
| Ask Mike page | Versioned Ask Magic Mike embed loader |
| Ask Magic Mike page | Versioned Ask Magic Mike embed loader |
| Home-value page | Gravity Form 3 plus source-tagged `/value` CTA |
| We Buy Homes page | Source-tagged `/value` seller CTA |
| Mike agent page | Source-tagged internal `/ask-mike/` handoff |

Do not create parallel forms, databases, notification engines, or generic
site-wide injection. Legacy pages without an approved mapping remain held until
their exact form ID, consent fields, notification behavior, and rollback are
audited.

## 5. Controlled public QA gate

Before the first new Production QA submission or internal test email, obtain
this exact approval:

```text
APPROVE CONTROLLED PUBLIC QA LEAD AND INTERNAL TEST EMAIL
```

After approval:

1. Open the canonical public form with explicit QA UTMs.
2. Submit through the rendered public form—not the database or an internal API.
3. Use `INTERNAL QA — DO NOT CONTACT` in both the name and message.
4. Use only the approved operator-owned contact destination.
5. Confirm exactly one canonical lead/master record and `is_test=true`.
6. Confirm suppression, consent text/version, source URL, placement, first and
   last touch, UTMs, click IDs, idempotency key, score explanation, assignment,
   and audit events.
7. Confirm the record appears in the authenticated Lead Center and is excluded
   from live KPIs.
8. Confirm exactly one internal alert, hidden audit BCC, provider message ID,
   and delivered status. Record protected recipient evidence without displaying
   the BCC value.
9. Replay the same idempotency key and confirm no duplicate lead or alert.
10. Exercise one controlled retryable notification failure without contacting
    a consumer; confirm bounded retry and visible failure/recovery history.

Consumer acknowledgment remains a separate send gate. Do not enable or send it
during internal alert acceptance.

## 6. WordPress publication gate

Any new or changed live page, Gravity Form mapping, widget, menu, or CTA requires
an exact-page proposal with rollback, then explicit approval in this form:

```text
APPROVE WORDPRESS CTA PUBLICATION: <exact pages and placements>
```

Before publication:

- back up the affected page/plugin configuration and relevant database state;
- map only approved Gravity Form IDs and fields;
- preserve existing URL, title, schema, content, and internal links;
- store the WordPress entry before forwarding when supported;
- sign forwarding requests and prove retry/reconciliation;
- ensure Gravity Forms and the canonical outbox cannot both send duplicate
  alerts;
- test one page/placement at a time on mobile and desktop;
- preserve the live public office number `252-243-7700` unless the owner gives
  a separate explicit approval for a public-number change. Internal routing
  destinations are not permission to publish a different number.

## 7. Zero-spend traffic activation

Once controlled QA is fully delivery-verified, existing public placements can
receive genuine traffic immediately. Any new GBP, social, or email publication
requires the exact asset/link list and this approval:

```text
APPROVE OWNED TRAFFIC PUBLICATION: <exact assets and destinations>
```

Use stable source tags. At minimum record `utm_source`, `utm_medium`,
`utm_campaign`, `utm_content`, placement ID, source page, first/last touch, and
available click IDs. Do not place lead PII in analytics parameters or URLs.

No paid advertising, bulk SMS, cold outreach, purchased leads, or consumer
auto-send is authorized by this runbook.

## 8. First-24-hour operations

For the first live submissions:

- check queue depth, notification failures, duplicate rate, and API errors at
  least hourly during staffed hours;
- respond according to the Lead Center SLA, then record the first human
  response using the protected operator action;
- inspect source/placement attribution and consent before contact;
- keep test and suppressed rows excluded from every live report;
- reconcile WordPress entries to canonical lead IDs where applicable;
- review next day: live lead count, qualified count, source mix, first-response
  P50/P75/P90 with sample size, stage movement, notification delivery, and
  attributable outcomes—not vanity traffic alone.

## 9. Stop and rollback

Pause new traffic and use `docs/ROLLBACK_PLAN.md` if any of these occurs:

- durable storage fails or the success page appears before storage;
- anonymous access reaches protected Lead Center data;
- Ask Magic Mike and NellySelly identity or data boundaries cross;
- a test lead appears in live KPIs;
- duplicate submissions create duplicate alerts;
- notification failures are lost or invisible;
- the public host, canonical tags, or WordPress pages regress;
- secrets or private recipient values appear in logs, source, screenshots, or
  analytics.

Rollback the smallest affected layer. Preserve lead/audit records and evidence;
do not delete production data to make a dashboard look clean.

## 10. Current human-only acceptance item

The remaining non-mutating acceptance item is an authenticated visual check of
`/admin/growth` after the operator signs in. Authentication must be completed by
the user; it must not be bypassed or replaced with a shared secret.
