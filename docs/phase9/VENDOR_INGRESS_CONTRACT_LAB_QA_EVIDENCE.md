# Vendor ingress contract lab QA evidence

Date: 2026-08-24

Branch: `codex/phase9-vendor-ingress-contract-lab-20260824`

Base: `a6098ab4ee7a13d024bafc08264628e2691a8e06`

## Scope

Evidence covers the protected, synthetic, no-write contract lab only. No
provider account, credential, webhook, database, lead, message, campaign,
WordPress surface, Vercel environment, Production deployment, or NellySelly
system was used.

## Completed local evidence

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
57.52 KB exact staged candidate scanned · no leaks found
```

Release doctor will be repeated after the candidate is committed; the only
current failure is the expected uncommitted-change state while this evidence is
being authored.

An earlier command accidentally selected the complete suite rather than the
focused files. That run provided useful broad regression evidence: 241 files
and 3,151 tests passed; one new test assertion failed because it prohibited the
safe documentation label `google_key` as well as an actual key value. The
assertion was corrected to prohibit returned credential fields and synthetic
signing material. This was a test defect, not a product-code failure.

## Pending exact-head release evidence

The following must be completed after documentation, lint, and review settle
the final candidate head:

- clean-commit release doctor;
- tracked-history secret scan;
- immutable Vercel Preview;
- authenticated desktop/mobile visual and interaction QA;
- exact Preview log audit proving no mutation or provider call; and
- clean diff, ancestry, and worktree proof.

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
