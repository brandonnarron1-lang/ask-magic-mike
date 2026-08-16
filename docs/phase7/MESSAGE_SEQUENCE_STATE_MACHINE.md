# Message sequence state machine

Sequence states: draft, approval required, test, scheduled, active, paused, completed, cancelled, blocked, and failed. Step states cover pending, permission blocked, approval required, scheduled, claimed, sent, delivered, failed, bounced, complained, replied, cancelled, skipped, opted out, and blocked.

The Lead Center can create a version-pinned draft and apply explicit transitions. The scheduler gate blocks approval, test activation, and activation when disabled. Test execution requires both `is_test=true` and `communication_suppressed=true`. Production consumer sequences remain disabled.

Stop conditions include reply, recorded contact, appointment, terminal stage, invalid contact, opt-out, legal/BIC hold, manual pause, duplicate consolidation, test, and suppression. Each sequence and step has an idempotency key; transitions use compare-and-update and write an audit event.

Operational timezone is `America/New_York`. Quiet hours, frequency caps, and provider sends remain release-gated; no carrier or consumer delivery is enabled by this state machine.

## Mock scheduler acceptance — 2026-08-16

`/api/admin/sequences/process` now materializes and processes durable test steps behind `MESSAGE_SEQUENCE_SCHEDULER_ENABLED`. It requires cron bearer authentication and can claim only records where the sequence is in test state and the lead is simultaneously `is_test=true` and `communication_suppressed=true`. The worker uses `FOR UPDATE SKIP LOCKED`, records a purpose-specific QA decision, writes a hash-only mock delivery event, and never calls an external provider.

Claimed steps abandoned for more than five minutes can be safely reclaimed. Attempts are capped at three; retryable render failures return to the schedule after five minutes and become terminal after the cap. Production consumer sequences remain disabled.
