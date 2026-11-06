# Lead Notification Operating Guide

## Prepared mobile request/response candidate — November5, not activated

Use `config/release-authority-policy.json`, `pnpm release:authority:resolve` and
the focused private handoff to distinguish this candidate from accepted PR322.
The implementation branch preserves its accepted tree and the e77693fb
maintenance lineage. No Production migration, send, runtime flag or campaign
change is implied by this section.

| Request | Atomic persistence / owner | Mike / Brandon | Customer | Protected operator destination |
| --- | --- | --- | --- | --- |
| Home Value, all widget Home Value placements | `capture_public_lead_v6` → unchanged v4/v5/v3/v2/v1 capture/assignment; one owner | Existing separate frozen `lead_alert_email_v6` intents, never BCC duplicates | Separate inquiry receipt only with explicit new purpose + current email evidence + cutoff/gates | `/admin/leads/{id}` → Contact readiness |
| Buying Help / buyer area or listing; widget / standalone | Same boundary; supplied area/address/unit and unknown optional answers retained | Same two per-operator intents | Same request-specific receipt, never property subscription | Same detail / current ownership |
| Selling Options / seller / cash-review request; widget / standalone | Same boundary; cash-review remains an intent, not an offer | Same two per-operator intents | Same receipt; no price/closing promise | Same detail + seller request context |
| Ask a Question follow-up capture | Same boundary only after supplied contact + existing consent validation; anonymous conversation is not a lead | Two v6 intents, question-labeled; legacy dispatch is NOT called too | Same explicit receipt choice, no acknowledgment of anonymous chat | Same detail + factual question |
| Optional conversation after saved capture | `request_public_appointment_v2`: serializes inquiry, appointment, preferences, task decision, audit and request-specific outbox together | Separate `appointment_request` per operator, not a replay of the original inquiry alert | Separate appointment-request receipt, same inquiry-specific acknowledgment purpose; not a booking | Detail `#appointment-review`, Today, notification exceptions |
| Signed legacy WordPress forms / other retained capture families | Existing canonical bridge and assignment/capture; no form-copy assumption | Existing reviewed family; do not silently migrate recipients/templates | New receipt checkbox is NOT attributed to these forms | Existing protected detail; current source evidence |
| Visitor Call / Text Mike | Native `tel:+12522454337` / number-only `sms:+12522454337`; no capture prerequisite | No invented lead alert | No automated text or delivery claim | Not a consumer interaction/outcome record |

Request preferences are optional `email`/`phone`/none, local calendar day, and
morning/afternoon/evening/none in America/New_York. They never grant permission or
confirm availability. The public capability is bounded to24hours from inquiry
creation; a closed/suppressed record or expired/mismatched reference is refused.
Any existing appointment (including completed/canceled) is returned before task
creation. Completed/canceled confirmation tasks are not recreated. A new inquiry
has its own identity; no matching by property address. No outcome fields clear.

The new checkbox is separate, unchecked, optional and first-party only. Its exact
copy/version are in `requestReceiptContract.ts`; SQL stores a purpose row in the
capture transaction for that inquiry only. It never promotes existing
`amm_contact_v2` manual-read permission to automation. Dispatch also requires
retained canonical email evidence and current suppression/opt-out checks. Events
and inquiries must be on/after the new activation cutoff; there is no history job.

The receipt-availability correction exposes only `request_receipts_available` in
the existing no-store public health GET. It is advisory, not permission or proof
of delivery: the categorical intake mode must be live and all existing worker,
receipt, customer-email, cutoff, sender/provider and Reply-To gates must be ready.
Public forms hide the optional checkbox when false, missing, stale or unknown,
and explain that a saved request is confirmed on the page. Manual contact consent
and intake availability remain independent. Retained renter/open-house families
do not advertise the new purpose. No new runtime flag or provider call is added.
Recheck availability on app return; preserve authoritative outbox/dispatch checks.
This correction needs its own exact-source disposition; it is not live merely
because the earlier PR323 source received conditional approval.

`request_response_v1` owns its immutable private body/destination, business-event
key and claim token in the existing outbox. The existing cron invokes its bounded
worker only with `REQUEST_RESPONSE_WORKER_ENABLED`; customer delivery additionally
requires `REQUEST_RECEIPTS_ENABLED`, its truthful cutoff, verified monitored
`REQUEST_RECEIPTS_REPLY_TO` and existing `CUSTOMER_EMAIL_ENABLED`. Legacy consumer
acknowledgment remains OFF. Generic dispatch/retry cannot process this template.
Use `/admin/notifications` for a protected one-record due retry, not a new event.

Only known nonacceptance (429/425) receives a bounded retry; processing/ambiguous
results remain UNKNOWN. Signed callback correlation checks the fixed destination
and recorded attempt, reconciles early callbacks, and never lets a later HTTP
completion overwrite provider evidence. Staff mailbox failures do not suppress
the prospect. Provider acceptance, delivery to recipient server, personal receipt
and human response remain separate. Never reset a processing row to resend.

The separate push intent bridges the v6 early return only for active authorized
subscriptions with the existing push flag. It rechecks the subscription/role at
claim; no endpoint/key enters notification metadata. Enrollment and physical
receipt remain separate NOT RUN evidence. Automated carrier SMS stays OFF.

Focused regression: `LC_ALL=C LANG=C AMM_QA_POSTGRES_TEST=1
AMM_QA_NATIVE_POSTGRES_TEST=1 pnpm exec vitest run
tests/persistence/public-conversation-postgres.test.ts
tests/persistence/launch-inquiry-postgres.test.ts --no-file-parallelism`.
The existing owned harness runs real local PostgreSQL17, not Production18;
provider transport is mocked. Keep opt-in skips separate from this proof.

Migration preflight must inspect actual Neon roles rather than assume legacy
`anon`/`authenticated` roles exist. The request-response migration always revokes
PUBLIC and conditionally revokes any existing legacy browser roles, without
creating them or changing owner defaults. The required hosted conversation stage
also runs `public-response-role-grants-postgres.test.ts` for absent roles and
inherited browser-role grants. Changed migration bytes require a new exact-source
disposition; historical connected acceptance remains evidence only for its source.

Scheduled digest SQL fixtures inject explicit eligible business instants; adding
24 hours to the real clock does not make a before-8am Eastern invocation due.
The November6,2026 regression covers the instant before the due boundary, one
concurrent claim at the boundary, and held UNKNOWN without automatic replay.
Keep real harness/timeout timers, existing DST tests and Production schedule
unchanged. Preserve failed CI evidence; dependency-install delay and an assertion
failure are different causes. A job-budget adjustment must retain all mandatory
stages and test-level bounds and be sealed as changed source, not a waived gate.
The required gate has35minutes, its acceptance-receipt wait is capped at40minutes,
and the receipt job at45minutes. Acceptance still requires completed successful CI;
timeout/failure remains a failed gate, never permission to publish a receipt.

Remote Places remains OFF: the existing Production-only adapter needs verified
same-account SKU entitlement/key restrictions, a global hard admission bound and
content-use approval, not a free label or budget alert. Current official
[session pricing](https://developers.google.com/maps/documentation/places/web-service/session-pricing)
does not make every session free. The narrow
[selected end-user-address exception](https://developers.google.com/maps/documentation/places/web-service/policies#autocomplete_for_end_user_addresses)
is transaction-specific and does not cover suggestion lists or other content.
No provider search/activation or new billing is authorized by this candidate.

Rollback: independently disable the new receipt flag/worker (and keep address
predictions OFF), retain intake and existing v6 staff alerts. Use compatible
application rollback; retain additive schema, consent, tasks, outcomes and all
delivery evidence. Never run destructive down SQL or restore deleted QA venues.

## Current use and historical scope

The V1 sections below describe assignment-notification lineage, not the current
normal v6 public-intake delivery contract. Resolve current Production with
`pnpm release:authority:resolve`; use protected Acquisition operations for current
per-operator envelope evidence. Keep existing Mike/Brandon recipients, frozen v6
snapshots, cutover, retries and callbacks intact. Do not reenact an old activation,
migration or retry procedure merely to verify operation.

Provider acceptance, recipient-server delivery and the operator's own mailbox
receipt are separate. Normal QA stays suppressed/KPI-excluded; a separately
approved one-copy v4 review operation is not a resend of the original and does
not prove a fresh v6 transaction. Never use first-live/retry/process endpoints or
“Record observed proof” as read-only health checks. The current operational
continuation authorizes no new Production submissions, queues, sends or activation.

## What V1 Does

### Public direct contact is not staff notification delivery

The owner's November1 mobile-contact instruction supplies Mike's public direct
line `(252) 245-4337` (`tel:+12522454337`, number-only `sms:+12522454337`).
`src/lib/site-config.ts` separates it from the brokerage office `252-243-7700`.
`PublicMikeContact` is shared by public headers, the widget and confirmations;
it is not installed in the root layout, staff login or device-install utilities.
Call/Text intent events have no phone, message body or inquiry details. They
are not captured inquiries, sent messages, connected calls or conversions.
Text receipt and physical app-return behavior require separate device evidence.

The existing v6 internal-email path and recipient/provider configuration are
unchanged. The v6 branch returns no SMS/push envelopes; legacy V1 SMS flags are
not a v6 activation path. Carrier SMS remains held: current recipient/sender
authorization, provider requirements and a genuine zero-new-spend entitlement
are not established. No verified cost quote or activation is implied here.
Brandon's protected `/admin/notifications/phone` page is the existing Web Push
entry. Enrollment, provider acceptance and physical receipt are separate; a
desktop-ready button does not prove an iPhone is enrolled. Do not require Mike
to enroll or test to operate the email/Lead-Center workflow.

- Creates an assignment notification event after successful AdminOps assignment and audit.
- Prevents duplicate events with a unique idempotency key.
- Sends only when explicitly enabled and configured.
- Tracks pending, processing, sent, skipped, retry scheduled, and permanent failure states.
- Lets an AdminOps operator retry one eligible failure at a time.

## What V1 Does Not Do

- It does not send customer email or SMS.
- It does not configure production cron.
- It does not activate Twilio, Resend, DNS, or paid messaging services.
- It does not roll back a successful assignment because of notification failure.

## AdminOps Workflow

1. Assign a lead in `/admin/allocation`.
2. Review the assignment result banner.
3. Open `/admin/notifications`.
4. Confirm the notification row status, channel, provider, attempt count, and safe error summary.
5. For eligible failures, check the confirmation box and retry one row.
6. If failure persists after maximum attempts, leave the row as permanently failed and investigate provider configuration.

## Provider Configuration Names

- `LEAD_NOTIFICATION_MODE`
- `NOTIFICATION_PROVIDER_MODE`
- `AGENT_NOTIFICATIONS_ENABLED`
- `AGENT_SMS_NOTIFICATIONS_ENABLED`
- `CUSTOMER_EMAIL_ENABLED`
- `CUSTOMER_SMS_ENABLED`
- `AGENT_NOTIFICATION_FROM_EMAIL`
- `AGENT_NOTIFICATION_SANDBOX_EMAIL`
- `AGENT_NOTIFICATION_SANDBOX_ALLOWED_DOMAINS`
- `LEAD_NOTIFICATION_PRODUCTION_ENABLED`
- `CONSOLE_NOTIFICATION_BEHAVIOR`
- `RESEND_API_KEY`
- `FROM_EMAIL`

Do not place credential values in documentation, screenshots, logs, or tickets.

## Safe Modes

- Local tests: `LEAD_NOTIFICATION_MODE=console`, `AGENT_NOTIFICATIONS_ENABLED=true`
- Provider sandbox tests: `LEAD_NOTIFICATION_MODE=sandbox`, `AGENT_NOTIFICATIONS_ENABLED=true`, configured sandbox recipient, and customer/SMS gates disabled
- Production disabled default: `LEAD_NOTIFICATION_MODE=disabled`, `AGENT_NOTIFICATIONS_ENABLED=false`
- Production email activation requires owner approval, provider prerequisites, and `LEAD_NOTIFICATION_PRODUCTION_ENABLED=true`.

## Retry Policy

- Maximum attempts: 3.
- Retry only retryable provider failures.
- Do not retry disabled-mode skips, missing recipient skips, invalid recipient failures, inactive agents, or changed assignments.
- Retry uses the same notification row and idempotency key.

## Customer Messaging State

Customer follow-up is staged only. Keep:

- `CUSTOMER_EMAIL_ENABLED=false`
- `CUSTOMER_SMS_ENABLED=false`

Before activating customer follow-up, complete consent, opt-out, DNC, template review, provider sandbox verification, and owner approval.

## Production Migration Steps

1. Review `supabase/migrations/20260710221617_lead_notifications_outbox.sql`.
2. Apply to a non-production database first.
3. Run the notification service and AdminOps tests against the migrated database.
4. Schedule production migration separately.
5. Do not enable delivery until the migration, provider config, and owner approval are complete.

## Safe Failure Handling

- Notification warning after assignment means assignment succeeded but notification work needs attention.
- Check `/admin/notifications` before retrying.
- Do not reassign merely to resend a notification.
- Do not create a new lead to test notification retry.
