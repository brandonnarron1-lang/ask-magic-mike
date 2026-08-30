# Phase 9 vendor ingress contract lab

Date: 2026-08-24

Branch: `codex/phase9-vendor-ingress-contract-lab-20260824`

Stacked base: sealed Draft PR #216 exact head
`211485df28fc818ab783ed357df8486f1460d5e2`

Prior PR #217 head `d04984b4d162f13c79af261beb55a82f15a86b80`
is preserved at
`rescue/amm-pr217-pre-pr216-exact-seal-20260828-234940`. The sealed parent was
merged without force push at application head
`e616170657861c3dd83fae43b28bef9cf89506af`; product files merged automatically
and only additive release ledgers required manual reconciliation. All proof from
the former head is historical until repeated on the current exact PR head.

## Decision

Reuse the existing vendor-neutral normalizer in
`app/lib/growth/vendor-ingress.ts`. Do not create a second lead API, CRM,
database, provider router, or webhook store.

The repository already had a minimized normalization contract for portal, CRM,
and advertising payloads. Its real gap was safe operational proof: there was no
protected surface that could show which provider facts are directly available,
which events require a follow-up fetch, which authenticity contract applies,
and which claims must remain blocked until authenticated provider onboarding.

This change adds a protected synthetic contract lab at:

- `/admin/growth/vendor-ingress`
- `POST /api/admin/growth/vendor-ingress/test`

The API accepts only one allowlisted profile identifier. It does not accept a
caller-supplied lead payload.

## Provider contract findings

### Zillow Tech Connect

Zillow publicly documents that Tech Connect routes Zillow and Trulia leads into
approved marketing systems. Zillow's New Construction Leads API terms also
make the exact technical onboarding guide and permitted use contractual. The
lab therefore records the portal as `provider_onboarding_required`; it does not
invent a payload, signature, or field map.

Primary references:

- [Zillow Tech Connect setup](https://www.zillow.com/pro/how-to-set-up-zillows-tech-connect/)
- [Zillow New Construction Leads API terms](https://www.zillow.com/new-construction-advertising/leads-api-terms/)

### Follow Up Boss

Follow Up Boss webhooks deliver an event envelope with an event ID, resource
IDs, and a resource URI. The documented `FUB-Signature` is an HMAC-SHA256 over
the base64-encoded exact raw request body using the server-only X-System-Key.
The lead facts require a separately authorized resource fetch. The lab verifies
the signature algorithm with fixed synthetic material and then stops; it makes
no resource request.

Primary reference:

- [Follow Up Boss webhook guide](https://docs.followupboss.com/reference/webhooks-guide)

### Meta Lead Ads

Meta's official sample subscribes to the Page `leadgen` field. The notification
contains a `leadgen_id`, form ID, and Page ID; consumer fields require an
authorized Graph retrieval. Meta webhook authenticity uses the exact raw body
and `X-Hub-Signature-256`. The lab verifies a fixed synthetic envelope and then
stops before Graph access.

Primary reference:

- [Meta Lead Ads webhook sample](https://github.com/fbsamples/lead-ads-webhook-sample)

### Google Ads lead forms

Google posts lead data directly. Its current schema uses `lead_id` for dedupe,
`google_key` for request validation, `is_test` for test classification, and
`user_column_data` for typed fields. The adapter ignores unknown columns for
forward compatibility. It maps only allowlisted contact, geography,
attribution, and intent facts. It never infers email, SMS, or call consent.

Primary references:

- [Google Ads lead-form webhook implementation](https://developers.google.com/google-ads/webhook/docs/implementation)
- [Google Ads CRM integration practices](https://support.google.com/google-ads/answer/17051188?hl=en)

## Security and privacy boundary

Every lab run requires:

1. authenticated Lead Center RBAC;
2. `growth:manage` permission;
3. an exact same-origin browser request;
4. JSON content type;
5. a body no larger than 512 bytes; and
6. one of four fixed profile IDs.

Every result states:

- `isTest=true`;
- `INTERNAL QA — DO NOT CONTACT`;
- provider call performed: false;
- database write performed: false;
- raw payload retained: false; and
- live activation authorized: false.

Private API responses are non-cacheable, same-origin, noindex, nosniff, and
referrer-suppressed. The route imports no database client, contains no SQL, and
contains no network client. Synthetic verification material is never returned.

The shared normalizer now records test state as `true`, `false`, or `null` and
adds `test_state_not_explicit` to review reasons when a vendor payload does not
declare it. Unknown must not silently become live.

## Explicit non-goals

This candidate does not:

- register a webhook;
- request or store a provider credential;
- call Zillow, Follow Up Boss, Meta, or Google;
- create, update, deduplicate, score, assign, or notify a lead;
- write Neon or apply a migration;
- retain a raw payload;
- activate paid media or conversion uploads;
- send email, BCC, SMS, MMS, Push, or consumer acknowledgment;
- change WordPress, DNS, domains, Vercel environment values, or Production; or
- touch NellySelly.

## Later provider activation sequence

For each provider, a separate candidate must prove, in order:

1. owned account and applicable contract;
2. exact current provider field map;
3. server-only secret path and rotation plan;
4. raw-body authenticity verification before JSON transformation;
5. bounded ingress and replay/idempotency behavior;
6. queue/acknowledgment timing and retry contract;
7. privacy, retention, consent, and permitted-use review;
8. isolated test-mode event with no consumer contact;
9. canonical lead mapping and reconciliation evidence; and
10. a provider-specific approval gate.

The existing provider-test phrase remains:

```text
APPROVE [PROVIDER] TEST-MODE INTEGRATION USING PROVIDED CREDENTIALS
```

It is not supplied by this release and would apply only to the named provider.

## Production gate for this lab only

```text
APPROVE PHASE 9 VENDOR INGRESS CONTRACT LAB MERGE AND PRODUCTION DEPLOYMENT
```

That phrase would authorize merging and deploying only this authenticated,
synthetic, no-write contract lab after exact-head CI, Preview, browser, and
deployment-log evidence pass. It would not authorize provider activation,
credentials, webhooks, lead imports, consumer contact, paid media, database
mutation, WordPress publication, or any other pending release.

## Rollback

Revert the candidate merge and redeploy the previous accepted Production
commit. The route and page then disappear. Because this candidate has no schema,
environment, provider, or data change, there is no database or vendor rollback.
