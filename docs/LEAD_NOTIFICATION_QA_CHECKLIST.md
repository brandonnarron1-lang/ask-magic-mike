# Lead Notification QA Checklist

## Local/Sandbox Setup

- [ ] Use local or sandbox data only.
- [ ] Set `LEAD_NOTIFICATION_MODE=console`.
- [ ] Set `AGENT_NOTIFICATIONS_ENABLED=true`.
- [ ] Keep `CUSTOMER_EMAIL_ENABLED=false`.
- [ ] Keep `CUSTOMER_SMS_ENABLED=false`.
- [ ] Do not use production lead contact data as a test destination.

## Assignment Event

- [ ] Assignment updates exactly one lead.
- [ ] Assignment audit is written before notification creation.
- [ ] Notification row includes lead ID, agent ID, audit ID or assignment timestamp, channel, type, template version, and idempotency key.
- [ ] Repeating the same assignment does not generate a duplicate send.
- [ ] Reassignment does not notify the previous agent.

## Delivery State

- [ ] Disabled mode records `skipped`.
- [ ] Console mode records safe provider metadata only.
- [ ] Success records `sent` and `sent_at`.
- [ ] Retryable failure records `retry_scheduled`, `attempt_count`, and `next_attempt_at`.
- [ ] Permanent failure records `permanently_failed`.
- [ ] Missing recipient records a safe skip/failure.
- [ ] Inactive agent blocks notification.

## AdminOps

- [ ] `/admin/notifications` requires admin access.
- [ ] Notification summary shows status, channel, provider, attempts, timestamps, and safe errors.
- [ ] Retry requires one notification ID and explicit confirmation.
- [ ] No bulk retry is present in v1.
- [ ] Recipient contact values are not displayed.

## Customer Messaging

- [ ] Customer email is disabled.
- [ ] Customer SMS is disabled.
- [ ] No customer follow-up template sends during QA.
- [ ] Consent and opt-out requirements are documented before activation.

## Regression Tests

- [ ] `pnpm exec vitest run tests/adminops/lead-notification-service.test.ts`
- [ ] `pnpm exec vitest run tests/adminops/admin-agent-allocation-actions.test.ts`
- [ ] `pnpm exec vitest run tests/adminops/admin-notification-guards.test.ts`
- [ ] `pnpm run lint`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run build`
- [ ] `pnpm run test`

## Controlled Production Test Procedure

Only after production migration and explicit owner approval:

1. Confirm delivery mode and provider configuration without printing secrets.
2. Use a clearly labeled synthetic QA lead.
3. Assign exactly one QA lead to an authorized test recipient.
4. Confirm exactly one notification row and one provider send.
5. Perform at most one manual retry if the first attempt is definitively failed.
6. Confirm no real consumer was contacted.
