# Vercel Production Environment Presence Truth

Date: 2026-08-29 ET  
Scope: read-only Production metadata for the `eyes-up-industries/ask-magic-mike`
Vercel project

## Outcome

The release doctor and launch-authority report can consume a metadata-only projection of the JSON
emitted by `vercel env ls production --format json`. It accepts variable names,
scopes, and safe metadata only. It never prints, persists, or compares secret
values, and it rejects an input object containing a value-bearing field.

Run from the linked Ask Magic Mike checkout:

```bash
vercel env ls production --scope eyes-up-industries --format json \
  | jq '{envs:[.envs[]|{key,target,type}]}' \
  | pnpm run amm:launch:doctor -- --vercel-json-stdin

vercel env ls production --scope eyes-up-industries --format json \
  | jq '{envs:[.envs[]|{key,target,type}]}' \
  | pnpm run amm:launch:authority -- --vercel-json-stdin
```

The `jq` projection is mandatory. Current Vercel CLI JSON can include a
`value` field for some entries; the projection removes every field except the
name, target, and type before the doctor receives the stream. An unsanitized
stream fails with `vercel_env_manifest_contains_values`.

This is a read-only check. It does not call `vercel env pull`, change a Vercel
variable, create a deployment, contact a lead, or mutate Neon or WordPress.

## Authenticated Production evidence

The 2026-08-29 name-only inspection returned 61 Production-scoped variables.
Every runtime-required lead, database, authentication, notification, webhook,
phone-enrollment, and Web Push variable was present except the optional
`EMAIL_PROVIDER` selector.

That selector is not a missing runtime dependency. The canonical provider
configuration intentionally preserves the already-deployed Resend path when
`RESEND_API_KEY` is present and the selector is absent. An explicit unsupported
selector still fails closed. The doctor now reports this as
`resend_inferred_from_existing_key` rather than a false missing-variable hold.

The following write gates were absent from Production metadata:

- `GROWTH_SPEND_IMPORT_ENABLED`
- `GROWTH_SEARCH_IMPORT_ENABLED`
- `GROWTH_LOCAL_PROFILE_IMPORT_ENABLED`

Absence is safe because each runtime gate defaults to `false`. If any gate name
is present, a name-only manifest deliberately reports that its value still
needs separate verification; it never guesses that a present variable is off.
The same rule applies to a present `EMAIL_PROVIDER` selector: metadata proves
presence only, while an allowed `resend` or `smtp` value must be verified on a
value-aware protected surface.

## Security properties

- Production and Preview scopes are separated; only entries whose target
  includes `production` satisfy the check.
- Duplicate metadata rows are collapsed to one name.
- Nested target arrays from Vercel CLI output are normalized.
- Invalid JSON, invalid top-level shapes, invalid entries, and value-bearing
  fields are rejected with stable non-secret error codes.
- No `.env.local` or other secret-bearing file is created; the projected
  metadata remains in the process pipeline only.
- The doctor prints names and status only, never values.

## Limits

Name-only metadata proves presence and scope, not correctness of a secret's
value. Runtime readiness, provider delivery, webhook receipt, and database
schema remain separate checks. No Production environment change is authorized
by this document.

## 2026-09-01 authority parity evidence

An authenticated name-and-scope-only Production inspection again returned 61
scoped variables. Both commands now consume the same fail-closed parser and
classification rules:

- all 16 required Production names are present;
- Resend is runtime-compatible through the present `RESEND_API_KEY` without
  inventing a missing `EMAIL_PROVIDER` requirement;
- all three growth-import write-gate names remain absent and therefore default
  to disabled; and
- neither command accepted, wrote, printed, or persisted a value-bearing
  environment payload.

The current-operator contract adds one doctor check and four authority document
existence checks. The doctor reported 48/48 PASS with zero skips. The candidate
authority report reported 51/51 PASS, zero `SKIP_OWNER`, and
`GO_CONTROLLED_TRAFFIC_READY`. This closes the prior false hold caused by
checking the local shell instead of authenticated Vercel Production metadata.
Both commands also loaded the canonical current-release manifest and required
one exact PR #247 release-log block matching merge commit, Production tree, and
Vercel deployment ID; a historical PR mention can no longer satisfy currency.
Exact Node 24.18.0 release verification passes system isolation, 14/14 safety,
283 test files / 3,437 tests, strict typecheck, full lint, optimized production
build with 60 static pages, and a 100-route / 22-acknowledged-duplicate
manifest.
It does not authorize a merge, deployment, traffic publication, WordPress
change, database mutation, lead submission, or message send.
