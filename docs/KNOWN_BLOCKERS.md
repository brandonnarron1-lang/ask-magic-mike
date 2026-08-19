# Known Operating Constraints

Updated 2026-08-19. The public funnel is live; these items constrain expansion
or specific channels but do not invalidate canonical Neon capture and internal
email delivery.

## Human/BIC decisions

- Form 7 entry 1550 has unclear purpose/consent and remains preserved without
  contact, marketing enrollment, or canonical forwarding pending Mike/BIC review.
- Forms 1, 6, and 7 require approved, unselected requested-response consent and
  separately optional marketing consent before their allowlists expand.
- Seller-options, coastal, guaranteed-value, cash-offer, response-time, and other
  material claims require brokerage/BIC approval before publication.
- The public brokerage phone remains `252-243-7700`; historical/internal numbers
  must not be propagated into public copy without owner confirmation.

## Operator activation

- Better Auth/RBAC is the active Lead Center boundary. Mike's provisioned account
  remains dormant until Mike chooses a password and completes assigned-lead-only
  acceptance.
- Web Push infrastructure is ready, but each primary/copy device owner must grant
  browser notification permission and complete a controlled `[TEST]` receipt.
- `hub.ourtownproperties.com` is staged only as a redirect design. DNS/domain
  attachment remains a separate approval; canonical `/admin` remains available.

## Channel constraints

- Consumer acknowledgment, nurture, sequence scheduling, and automatic sending
  remain purpose/permission/template/approval gated.
- Carrier SMS/MMS remains deferred until an approved registered sender and paid
  provider exist. Web Push and authenticated email are the free-first internal
  paths.
- CRM is intentionally the null adapter until the owner approves an existing CRM
  account and secure credentials. Canonical Neon remains the lead source of truth.

## External platform constraint

The Our Town hosting WAF blocks FacebookExternalHit on selected WordPress public
URLs. Apply only the documented rule-ID/path/method exception after the hosting
operator identifies the exact managed rule. Do not weaken global bot protection.
AskMagicMike.com links remain the approved Facebook fallback.

## Release sequencing

Production-ready or staged work remains isolated behind release-specific gates:

- PR #170 — owned-demand command;
- PR #177 — commercial-email compliance renderer;
- PR #173 — device-private review planner; and
- PR #172 — database revival command, refreshed only after its preceding release
  sequence and then revalidated against current `main`.

Old PRs #119, #120, #121, and #92 are archive-after-review candidates, not a
parallel release plan.
