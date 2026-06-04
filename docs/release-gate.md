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

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run release:safety`
5. `npm run build`
6. Push branch — Vercel creates a preview deployment.
7. Set `PREVIEW_URL` to the preview URL.
8. `npm run preview:qa` (dry-run first, no DB writes).
9. Review `artifacts/preview-qa-report.md`.
10. Only after every gate is green — and only when the user explicitly
    requests promotion — does `main` get touched.

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
