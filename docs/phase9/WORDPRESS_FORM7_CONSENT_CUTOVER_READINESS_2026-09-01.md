# WordPress Form 7 Consent Cutover Readiness — 2026-09-01

Status: **HOLD — SAFE CANDIDATE PREPARED; NO PRODUCTION CHANGE**

## Executive decision

Do not enable Gravity Form 7 in the canonical bridge yet. Reuse the existing
Canonical Lead Bridge and upgrade it in place; do not create another plugin,
lead table, notification engine, or Constant Contact feed.

The authenticated read-only audit proves Form 7 is a sitewide contact surface,
not yet a consent-safe property-alert source. It currently has required name,
email, and message fields; optional phone; CAPTCHA; an enabled honeypot that
aborts spam; one active native Admin Notification; no conditional notification
logic; no Consent field; indefinite entry retention; raw WordPress IP storage;
disabled WordPress export/erase integration; and no Constant Contact feed.

The sanitized machine-readable snapshot is
`docs/phase9/form7-live-snapshot-2026-09-01.json`. It contains no entry data,
recipient address, phone number, secret, nonce, or customer PII.

## What this candidate closes

1. Canonical Bridge 1.3.0 requires an exact per-channel consent contract before
   Form 7 can forward, even if an operator accidentally adds `7` to the form
   allowlist.
2. The contract pins the audited Gravity Forms Consent field ID, public
   visibility, required state, language version, and SHA-256 of normalized
   displayed copy.
3. A missing field, wrong type, hidden/admin-only field, required-state drift,
   copy drift, or absent required check records `consent_contract_blocked` and
   performs no network forward.
4. Signed WordPress submissions may preserve exact source-specific consent
   evidence in Neon. Unsigned public requests cannot spoof consent language;
   they continue to use the server-owned Ask Magic Mike copy.
5. Missing or malformed signed bridge evidence denies email, call, and SMS and
   stores the explicit unverified-language marker. A broad legacy `consent=true`
   flag cannot silently grant all channels.
6. A signed request is accepted only when its entry header,
   `gf:{form}:{entry}` idempotency key, and `gravity_forms_{form}` consent source
   identify the same submission. Mismatch is rejected before persistence or
   notification work.
7. The executable Form 7 readiness gate identifies the exact remaining live
   gaps and returns `GO` only for a consent-safe, privacy-bounded, single-alert
   canonical state.

Gravity Forms documents that its Consent field records checkbox state and the
title/description presented at submission, resets a stale checked state when
the copy changes, and exposes field ID, type, required state, checkbox label,
and description in the form object. Bridge 1.3.0 uses those native properties
and adds a release-owned text hash; it does not invent a parallel consent UI.

Official implementation references:

- <https://docs.gravityforms.com/consent/>
- <https://docs.gravityforms.com/gf_field_consent/>
- <https://docs.gravityforms.com/form-object/>

## Current executable HOLD reasons

- Brokerage/BIC approval of exact versioned Form 7 email-alert copy is not
  recorded.
- No Gravity Forms Consent field exists.
- The legacy Admin Notification remains active.
- WordPress entries are retained indefinitely.
- Raw WordPress IP storage remains enabled.
- WordPress personal-data export/erase integration is disabled.
- Form 7 remains outside the canonical bridge allowlist.
- Live Canonical Bridge 1.1.0 predates the 1.3 consent-contract runtime.

Run:

```bash
pnpm run amm:wordpress:form7-readiness -- --allow-hold
```

The gate intentionally exits non-zero on `HOLD` unless `--allow-hold` is used.
It prints only structural evidence and never recipient values or entry PII.

## Controlled cutover order

1. Merge and release the existing stacked application work in order, beginning
   with PR 248 only after its exact approval.
2. Install Canonical Bridge 1.3.0 with Form 3 unchanged and Form 7 still absent
   from the allowlist. Verify the checksum and health marker.
3. Back up the WordPress database, Form 7 export, current notification, current
   privacy settings, and plugin package.
4. Record owner/BIC approval for exact unselected property-alert email consent,
   frequency/unsubscribe disclosure, language version, and whether the checkbox
   is required. Do not infer SMS or call permission from email consent.
5. Add only the approved native Gravity Forms Consent field and record its actual
   assigned ID. No legacy entry is changed.
6. Compute the normalized-copy SHA-256 locally and configure the non-secret
   Form 7 consent contract. Keep Form 7 out of the bridge allowlist.
7. Apply the approved bounded audit-copy retention/IP/privacy-tool settings and
   create a fresh sanitized snapshot. The gate may still report HOLD for the
   active legacy alert and absent allowlist; that is expected.
8. Open a controlled QA window with one unmistakable test record. Verify local
   Gravity storage, signed forwarding, one Neon test lead, exact consent/source,
   internal delivery, hidden BCC, idempotency, and KPI exclusion.
9. With exact action-time approval, disable only Form 7's proven duplicate
   native Admin Notification, add Form 7 to the bridge allowlist, refresh the
   snapshot, and require `GO` before public acceptance.
10. Preserve entry 1550 as genuine, consent-restricted WordPress-only history.
    Never import, subscribe, suppress, delete, or reclassify it as QA.

## Rollback

- Remove only Form 7 from `AMM_CANONICAL_BRIDGE_FORM_IDS`.
- Restore only its backed-up native notification if it had been disabled.
- Leave Form 3 and its accepted bridge path unchanged.
- Restore the Form 7 definition/privacy settings from the exact backup only if
  required; preserve every historical entry and the protected-entry ledger.
- Keep the canonical Neon record and delivery/audit evidence; do not delete to
  hide a failed cutover.

## Production mutations in this slice

None. No WordPress save, notification toggle, form submission, email/SMS send,
database write, deployment, merge, cache purge, DNS change, or lead mutation
occurred.
