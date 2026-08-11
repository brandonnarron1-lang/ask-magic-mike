# Release Gate

The release gate makes the `platform/phase-2-release-hardening` branch
preview-ready. It is two independent layers — a static scan and a remote
preview probe — that must both pass before promotion is considered.

## Layer 1 — static safety scan

```
npm run release:safety
```

Runs `scripts/release-safety-scan.mjs` against the on-disk source tree. No
network. Fails on:

- **A. secret exposure** — `process.env.{ADMIN_SECRET,
  SUPABASE_SERVICE_ROLE_KEY, TWILIO_AUTH_TOKEN, EMAIL_API_KEY, CRON_SECRET}`
  read inside a `"use client"` component, or any `NEXT_PUBLIC_*SECRET`.
- **B. private MLS field leak** — `agent_remarks`, `lockbox_info`,
  `showing_instructions`, `compensation`, `owner_notes`, `internal_notes`,
  `private_remarks`, `broker_notes` referenced in a *public* API route
  (under `src/app/api/` but not under `src/app/api/admin/`) or in any
  marketing-asset generator.
- **C. widget wiring** — `MagicMikeWidgetController` and
  `MagicMikeWidgetFloating` must each have at least one consumer outside
  their own file; `/value` must mount Floating; `/widget-preview` must
  mount Controller or Floating.
- **D. public listing whitelist** — `/api/listings/search/route.ts` and
  `/api/listings/[id]/route.ts` must both reference `PUBLIC_FIELD_NAMES`.

Exit nonzero on any failure.

## Layer 2 — preview QA runner

```
PREVIEW_URL="https://ask-magic-mike-<sha>.vercel.app" \
ADMIN_SECRET="..."   \
CRON_SECRET="..."    \
SAFE_DB_WRITE=false  \
npm run preview:qa
```

Runs `scripts/preview-qa.mjs` against the live preview. Checks:

- public routes (`/`, `/ask`, `/value`, `/widget-preview`) return 200
- WordPress UTM variants (`utm_medium=referral|paid_social|paid_search`)
  resolve correctly on `/value`
- `/api/admin/health` returns `safe_for_preview_mutation` and never leaks
  raw secret values (sk_*, Bearer tokens are scrubbed and refused if
  detected in the response body)
- admin list + dashboard return without 5xx
- SLA sweep authorizes with both `x-admin-secret` and
  `Authorization: Bearer $CRON_SECRET`
- public listing endpoints do **not** contain any private MLS field
- mutation tests (lead create / note / task / SLA persist / SMS STOP /
  email unsubscribe) are gated by `SAFE_DB_WRITE=true` AND the health
  endpoint's `safe_for_preview_mutation` flag

Default `SAFE_DB_WRITE=false`. To run mutation tests against a real
database, both:

```
SAFE_DB_WRITE=true                                       \
FORCE_DB_WRITE=true                                      \
CONFIRM_FORCE_DB_WRITE="I_UNDERSTAND_THIS_WRITES_TO_THE_CONFIGURED_DATABASE"
```

must be set. Writes are blocked if the preview environment cannot be
verified.

Artifacts: `artifacts/preview-qa-report.json` and
`artifacts/preview-qa-report.md`.

## Release sequence

1. `npm run release:doctor` — fast local checks; produces
   `artifacts/release-doctor-report.{json,md}`. Run this *before* you
   push.
2. `npm run release:gate` — safety + test + typecheck + lint + build.
3. `npm run preview:find` — discover the latest Ready preview URL.
   For commit-matched discovery, `npm run preview:wait`.
4. `PREVIEW_URL=… VERCEL_AUTOMATION_BYPASS_SECRET=… SAFE_DB_WRITE=false npm run preview:qa`
5. `PREVIEW_URL=… VERCEL_AUTOMATION_BYPASS_SECRET=… npm run preview:e2e`
6. `npm run release:report` — `artifacts/release-candidate-report.*`.
7. `npm run launch:authority` — single GO / NO-GO across the ladder.
   Verdict: `BLOCKED` / `LOCAL_READY` / `PREVIEW_READY` /
   `MUTATION_READY` / `PROMOTION_READY`.
8. `npm run release:assert` (default `REQUIRE_VERDICT=LOCAL_READY`,
   tighten via env in CI). Exits nonzero if the verdict is below
   the required level.
9. After production lands: `TARGET_URL="…" npm run monitor:synthetic`
   for non-mutating smoke against the live target.
10. **No production promotion without explicit human approval.** Only
    after every gate is green does `main` get touched, and only when
    the operator explicitly requests promotion. Controlled mutation
    QA is **manual** — see
    [`controlled-preview-mutation-qa.md`](./controlled-preview-mutation-qa.md).

CI wiring is documented in
[`github-actions-release-gate.md`](./github-actions-release-gate.md).
Rollback is documented in
[`rollback-runbook.md`](./rollback-runbook.md).

## Generated artifacts

- `artifacts/preview-qa-report.json` and `.md`
- `artifacts/release-candidate-report.json` and `.md`
- `artifacts/widget-e2e-report.json` (when Playwright is run with
  `--reporter=json --output=artifacts/widget-e2e-report.json`)

The `artifacts/` directory is gitignored. No artifact contains raw
secrets — admin secret, cron secret, and bypass token are redacted in
every excerpt.

## Database identity and mutation safety

`/api/admin/health` is the **single source of truth** for whether the
QA runner may mutate the database. Five env vars feed the verdict:

- `DATABASE_ENV` — `preview` / `production` / `development`
- `SUPABASE_PROJECT_REF` — project ref of the active Supabase
- `PRODUCTION_SUPABASE_PROJECT_REF` — the production ref to refuse
- `PREVIEW_SUPABASE_PROJECT_REF` — the preview ref to accept
- `ALLOW_PREVIEW_DB_MUTATION` — explicit opt-in; default `false`
- `PREVIEW_DATA_MODE` — `disabled` / `enabled`; default `disabled`

`safety.safe_for_preview_mutation` is `true` only when **every** rule
holds: preview runtime, `PREVIEW_DATA_MODE=enabled`,
`ALLOW_PREVIEW_DB_MUTATION=true`, DB configured and reachable,
migration 00012 applied, live SMS/email disabled,
supabase ref does not match production ref, supabase ref matches
preview ref (or `DATABASE_ENV=preview` with no production ref
configured). If identity is unknown, the answer is `false`.

`shouldRunMutationChecks` in `scripts/preview-qa-lib.mjs` refuses to
mutate when the health endpoint says unsafe — **`FORCE_DB_WRITE` does
not override an unsafe verdict**. This is intentional.

## Browser widget e2e

`npm run preview:e2e` runs `tests/e2e/widget-preview-flow.spec.ts`,
which drives the widget on `/widget-preview` from intent → contact →
success and intercepts `POST /api/leads` via Playwright's `page.route`.
No real lead is ever created. The spec also covers the error path by
intercepting with `500`. Bypass headers are wired through
`extraHTTPHeaders` so protected previews work without printing the
token.

## Testing protected Vercel previews

Vercel preview deployments may return `401` on every route when
Deployment Protection is enabled. The preferred fix is the
**Protection Bypass for Automation** secret. Set it locally or in CI as
`VERCEL_AUTOMATION_BYPASS_SECRET` (alternate aliases:
`VERCEL_PROTECTION_BYPASS_TOKEN`, `VERCEL_BYPASS_SECRET`, in that
precedence order). The runner attaches it as the
`x-vercel-protection-bypass` header on every request — it is never
appended to URLs in reports or logs.

```
PREVIEW_URL="https://ask-magic-mike-l8xfwzg8r-eyes-up-industries.vercel.app" \
ADMIN_SECRET="..." \
CRON_SECRET="..." \
VERCEL_AUTOMATION_BYPASS_SECRET="..." \
SAFE_DB_WRITE=false \
npm run preview:qa
```

The runner runs a `vercel_preview_access` precheck first and exits
early with a clear message if the preview is protected and no bypass
is provided, or if the bypass is rejected. Artifacts are still written
on early failure.

The bypass secret is **normalized** before use: leading/trailing
whitespace and trailing CR/LF are stripped, and a value that is empty
after trim, contains embedded CR/LF, or contains non-printable
characters is rejected. An invalid value fails `vercel_preview_access`
early with `Invalid Vercel bypass secret: <reason>` — the reason never
contains the secret.

### Troubleshooting: HTTP 0 / network error

If preview QA reports HTTP 0/network error, the runner now reports safe
fetch error details (`error_name`, `error_message`, `cause_code`,
`cause_hostname`, `cause_syscall`) in `preview-qa-report.json` and the
report message — with every secret redacted. The most common cause is
an invalid bypass secret value with whitespace/newline (a trailing
newline injected when the GitHub Actions secret was set). Regenerate
the Vercel bypass secret and update the GitHub Actions secret
(`VERCEL_AUTOMATION_BYPASS_SECRET`), making sure no trailing newline is
included.

For manual browser QA: either sign in to Vercel for the same scope,
or use a bypass-cookie URL of the shape
`?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=true`.
**Never paste bypass URLs in public docs, tickets, screenshots,
Slack, or QA reports.** Set `PRINT_MANUAL_BYPASS_URL=true` to surface
the *template* of the URL without the token itself.

The Vercel CLI also has `vercel curl`; this runner uses Node's
built-in `fetch` so it does not depend on system `curl` being
installed.

## Hard rules

- Do **not** merge to `main` from automation.
- Do **not** promote to production from automation.
- Do **not** modify production env vars.
- Do **not** disable Vercel Preview Protection.
- Do **not** print bypass secrets.
- Do **not** run persistent DB mutation tests unless the preview database
  is verified safe by the health endpoint.
- The health endpoint must never return raw secret values — only boolean
  presence flags.
