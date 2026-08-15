# Phase 6 Message QA Evidence

Evidence date: 2026-08-15 America/New_York

## Acceptance case

- Purpose: synthetic internal email rendering acceptance only.
- Recipient: `brandonnarron1@gmail.com`, the owner-approved QA inbox.
- Subject: `[TEST — BRANDON QA] Phase 6 message acceptance`.
- Test labeling: visible subject prefix and `INTERNAL QA — DO NOT CONTACT` banner/body.
- Lead record: none created; no genuine or fabricated prospect was used.
- BCC: none.
- Mike delivery: not requested.
- Consumer delivery: not requested.
- Carrier SMS: not attempted.

## Provider and inbox proof

- Provider: Resend.
- Provider message ID: `fb4fdd9d-d421-482d-b062-5c2bbf6bce1c`.
- API acceptance: pass.
- Gmail inbox search: exactly one matching message.
- Inbox timestamp: 3:56 PM America/New_York.
- From shown by Gmail: Ask Magic Mike `<leads@notify.askmagicmike.com>`.
- To shown by Gmail: `brandonnarron1@gmail.com`.
- Mailed-by: `send.notify.askmagicmike.com`.
- Signed-by: `notify.askmagicmike.com`.
- Transport: standard TLS shown by Gmail.
- CTA href: `https://www.askmagicmike.com/`, verified by DOM inspection.

## Rendering evidence

- Desktop Gmail render: `output/phase6/screenshots/email/brandon-qa-inbox-desktop.png`.
- Narrow Gmail-web viewport: `output/phase6/screenshots/email/brandon-qa-inbox-mobile-390.png`; retained as browser-shell evidence, not claimed as a native mobile Gmail-app test.
- Desktop message-review viewport: `output/phase6/screenshots/after/desktop-1280-message-previews-viewport.png`.
- Mobile message-review viewport: `output/phase6/screenshots/after/mobile-390-message-previews-viewport.png`.
- Measured layout: 1,152px desktop content canvas; 335px mobile column; body scroll width equals client width.
- A full-page screenshot with a nested `srcDoc` iframe produced an invalid stitched image. It was quarantined and is not part of acceptance evidence. Normal viewport captures and computed layout geometry are authoritative.

## Not claimed

- Reply was not sent. Sending a reply would be a separate external message action.
- Native Gmail mobile-app rendering was not available.
- Resend provider acceptance plus inbox presence does not prove engagement.
- No consumer-message permission or legal/BIC approval is inferred from this QA.

## Isolation result

The endpoint returns `mike_delivery_requested: false` and `consumer_delivery_requested: false`; its tests enforce the exact Brandon allowlist, clear test subject, no BCC, fail-closed feature flags, and idempotency. Consumer automation and carrier SMS remain disabled in Production.
