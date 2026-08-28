# Phase 9 Public Owned-Referral Handoff

Decision date: 2026-08-28

Canonical repository: `brandonnarron1-lang/ask-magic-mike`

Release position: stacked after Draft PR #227; it cannot bypass PR #209 or any
earlier reviewed application candidate.

## Decision

Replace the internal-facing social-asset promotion at the bottom of the active
public homepage with one consumer-facing referral handoff. Reuse the existing
Black Diamond visual system, approved Mike/Our Town identity, canonical public
`/ask` route, first/last-touch attribution, privacy boundary, and social card.
Do not create another publisher, campaign center, lead store, referral database,
or external messaging provider.

This closes a specific gap found in the reuse-first audit:

- the protected Distribution Command already prepares operator copy, media,
  tracked links, native-platform handoff, and publication proof;
- the public homepage still exposed an internal `Social ad support` section and
  linked consumers to the operational social-preview page; and
- no public action let a visitor share a generic Ask Magic Mike path with
  someone else without first becoming a lead.

## Public behavior

The homepage now offers two explicit, user-controlled actions:

1. `Share Ask Magic Mike` invokes the browser's native share chooser only from
   the button click and only when `navigator.share` is available.
2. `Copy referral link` copies the same fixed URL when Clipboard is available.
   If Clipboard is denied or unsupported, the visible read-only URL is focused
   and selected for manual copy.

The packet is deterministic:

- destination: `https://www.askmagicmike.com/ask`;
- source: `consumer_share`;
- medium: `referral`;
- campaign: `amm_owned_demand_2026`; and
- content: `homepage_referral_share`.

It includes generic title/body copy only. It never reads or serializes a form
answer, saved review plan, session identifier, lead identifier, contact detail,
current URL, click ID, browser history, or free text.

## Measurement contract

Two privacy-minimized browser events reuse the canonical analytics endpoint:

- `referral_share_handoff` means the browser accepted the packet and opened or
  handed it to the operating-system share flow. It does **not** prove that a
  person received, opened, or acted on the link.
- `referral_link_copied` means Clipboard accepted the fixed URL. It does **not**
  prove publication, delivery, traffic, or a referral relationship.

The only allowed properties are `surface=homepage` and
`share_method=native|clipboard`. Cancelled, failed, or manual-selection states
do not write a success event. Recipient traffic becomes measurable only if the
shared UTM URL is opened; a genuine lead remains canonical only after normal
durable lead submission.

## Standards basis

The implementation follows the W3C Web Share Recommendation and current MDN
platform guidance:

- `navigator.share` is secure-context and transient-activation gated;
- the call occurs directly in the explicit button handler;
- capability absence degrades to copy/manual selection; and
- success copy is limited to `Share options opened` because promise-resolution
  timing differs by operating system and does not prove delivery.

Primary references:

- https://www.w3.org/TR/web-share/
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share

## Security and compliance boundaries

- The URL is generated from constants and a closed surface registry, never from
  query-string, storage, form, lead, or message input.
- No HTML injection, dynamic navigation, popup, third-party script, credential,
  secret, PII, provider call, email, SMS, Push, or database mutation is added.
- The copy makes no appraisal, value, inventory, appointment, response-time,
  financing, eligibility, closing, or outcome promise.
- The user chooses the person and native target. The application does not
  select recipients, send on the user's behalf, or claim a completed referral.
- Ask Magic Mike and NellySelly code, data, domains, environments, databases,
  and deployments remain isolated.

## Rollback

Application rollback is one component substitution in
`app/components/black-diamond/BlackDiamondShell.tsx`: restore the prior
`SocialAdSupportSection` import/render or redeploy the sealed PR #227
predecessor. No schema or data rollback is required.

## Non-goals and release boundary

This candidate does not authorize or perform:

- a Production merge or deployment;
- a WordPress, DNS, cPanel, Vercel Production, Neon Production, or provider
  change;
- a social/GBP/email/QR publication;
- a lead submission or synthetic prospect;
- an email, SMS, Push, consumer acknowledgment, or external message; or
- a NellySelly action.

Production remains behind the exact PR #209 durability gate and the ordered
application train. This tail candidate receives no independent leapfrog gate.
