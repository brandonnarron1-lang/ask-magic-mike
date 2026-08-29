# Vendor ingress contract lab QA evidence

Date: 2026-08-24

Branch: `codex/phase9-vendor-ingress-contract-lab-20260824`

Base: sealed Draft PR #216 head
`211485df28fc818ab783ed357df8486f1460d5e2`

Former PR #217 head `d04984b4d162f13c79af261beb55a82f15a86b80`
is preserved at
`rescue/amm-pr217-pre-pr216-exact-seal-20260828-234940`. Exact-parent
application head is `e616170657861c3dd83fae43b28bef9cf89506af`.
The evidence below was collected on the former head and is historical until
repeated on the current exact head.

## Scope

Evidence covers the protected, synthetic, no-write contract lab only. No
provider account, credential, webhook, database, lead, message, campaign,
WordPress surface, Vercel environment, Production deployment, or NellySelly
system was used.

## Historical local evidence

Node runtime: `v24.18.0`.

Focused contract, route, and inherited growth tests:

```text
pnpm exec vitest run \
  tests/adminops/vendor-ingress-contract-lab.test.ts \
  tests/adminops/vendor-ingress-contract-lab-guards.test.ts \
  tests/api/vendor-ingress-contract-lab-route.test.ts \
  tests/adminops/growth-intelligence.test.ts \
  tests/adminops/admin-growth-route-guards.test.ts

5 files passed
30 tests passed
```

Strict typecheck:

```text
pnpm typecheck
PASS
```

Full regression suite:

```text
pnpm test
242 files passed
3,152 tests passed
```

Static analysis and optimized build:

```text
pnpm lint
PASS

pnpm routes:verify
Next.js 15.5.21 optimized build PASS
53 generated pages
86 active routes
17 acknowledged root/src duplicates
```

Safety checks:

```text
pnpm release:safety
14 pass · 0 fail

pnpm amm:verify:isolation
PASS — deployable Ask Magic Mike source contains no NellySelly identifiers

pnpm audit --prod --audit-level high
No known vulnerabilities found

pnpm release:doctor
42 pass · 1 non-blocking pre-commit dirty-tree finding · 0 blocking failures

gitleaks git --staged --redact --no-banner
57.71 KB exact staged candidate scanned · no leaks found
```

Clean-commit integrity:

```text
pnpm release:doctor
43 pass · 0 fail · 0 skip

gitleaks git --redact --no-banner --log-opts='--all'
Full tracked history scanned · no leaks found

git merge-base --is-ancestor 211485df... HEAD
PASS

git rev-list --count 211485df...HEAD
3 commits through the exact-parent application merge

git diff --check 211485df...HEAD
PASS
```

An earlier command accidentally selected the complete suite rather than the
focused files. That run provided useful broad regression evidence: 241 files
and 3,151 tests passed; one new test assertion failed because it prohibited the
safe documentation label `google_key` as well as an actual key value. The
assertion was corrected to prohibit returned credential fields and synthetic
signing material. This was a test defect, not a product-code failure.

## Current exact-parent local evidence — 2026-08-29

Exact release-authority reconciliation head:
`5721a62f40a0d2c63475ca43608be066dddb018a`.

All commands below ran on Node `v24.18.0` with the frozen pnpm lockfile:

```text
6 focused files / 46 tests PASS
242 full-suite files / 3,153 tests PASS
strict TypeScript PASS
full ESLint PASS
Next.js 15.5.21 optimized build PASS
53 generated pages
86 active routes / 17 acknowledged root/src duplicates
release doctor 43/43 PASS
release safety 14/14 PASS
Ask/Nelly system isolation PASS
Production dependency audit: no known vulnerabilities
gitleaks: 649 reachable commits / ~16.21 MB / no leaks
git diff --check PASS
sealed-parent ancestry PASS / 4 candidate commits
clean worktree PASS
```

The focused security review found no actionable defect in the new boundary:

- both page and route enforce `growth:manage` server-side;
- the cookie-authenticated POST requires exact same-origin `Origin` and rejects
  an explicit non-same-origin `Sec-Fetch-Site`;
- JSON is streamed and capped at 512 bytes before parsing;
- the body accepts exactly one allowlisted profile key and no lead payload;
- the only new browser request is a fixed same-origin API path;
- React renders returned strings through normal escaped JSX;
- HMAC/key comparisons reject malformed input and use `timingSafeEqual` only
  after equal-length checks;
- private responses are non-cacheable, noindex, nosniff, no-referrer, and
  same-origin; and
- source and diff scans found no provider/database client, dynamic outbound URL,
  client secret, raw signing material response, dangerous HTML sink, or
  NellySelly identifier.

Current Follow Up Boss and Google first-party documentation was rechecked on
2026-08-28 and continues to match the synthetic signature, envelope, field,
`lead_id`, `google_key`, and forward-compatible unknown-field behavior recorded
by the lab. Zillow remains contract-gated and no authenticated contract is
invented. The documentation-only seal after this record must repeat exact-head
CI and protected Preview proof.

## Pending exact-head release evidence

The following must be completed after documentation, lint, and review settle
the final candidate head:

- immutable Vercel Preview;
- authenticated desktop/mobile visual and interaction QA;
- exact Preview log audit proving no mutation or provider call; and
- clean diff, ancestry, and worktree proof.

The only later Production gate for this lab is:

```text
APPROVE PHASE 9 VENDOR INGRESS CONTRACT LAB MERGE AND PRODUCTION DEPLOYMENT
```

It has not been supplied and cannot authorize provider activation, credentials,
webhook registration, lead import, messaging, database mutation, WordPress,
DNS, spend, or any other release.

## Acceptance assertions

- Only an allowlisted profile ID can enter the route.
- Cross-origin requests fail before session authorization.
- Read-only analysts and agents lack `growth:manage`.
- The body is streamed and capped at 512 bytes before JSON parsing.
- No caller-supplied lead payload is accepted.
- Follow Up Boss and Meta verification uses exact raw-body bytes.
- Google unknown fields are ignored and `lead_id` is preserved.
- Consent is not inferred.
- Unknown test state becomes an explicit review reason.
- Zillow remains blocked until authenticated provider onboarding.
- No result contains synthetic signing material.
- Every result is explicit test/no-contact/no-write/no-call/no-live-authority.
