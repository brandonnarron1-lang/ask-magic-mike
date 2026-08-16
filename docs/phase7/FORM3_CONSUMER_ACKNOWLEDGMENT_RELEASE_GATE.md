# FORM 3 HOME VALUE CONSUMER ACKNOWLEDGMENT EMAIL PILOT

Status: disabled and not approved.

Activation requires all of the following: Form 3 remains canonical; consent language/version is approved; permission row maps only to transactional acknowledgment; sender identity is aligned; Resend webhook is verified; version-pinned HTML/plain text is accepted; unsubscribe/suppression semantics are reviewed; idempotency and retry pass; test and suppressed records are excluded; Brandon acceptance is complete; rollback flag is tested.

Proposed flag change after approval: enable only `CONSUMER_ACKNOWLEDGMENT_ENABLED` for Form 3. Keep nurture, SMS, scheduler, and AI automatic action disabled.

Rollback: set the flag false. Lead storage and internal alerts continue independently.

