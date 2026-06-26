# Production Smoke Testing

Lightweight post-deploy verification for Ask Magic Mike. Safe by default — no mutations unless explicitly opted in.

---

## Quick start

```bash
# Read-only smoke (no writes, no credentials needed)
TARGET_URL=https://www.askmagicmike.com node scripts/prod-smoke.mjs

# Via npm script (canonical form):
pnpm run amm:smoke:prod

# With admin health check (needs ADMIN_SECRET):
TARGET_URL=https://www.askmagicmike.com ADMIN_SECRET=<secret> node scripts/prod-smoke.mjs

# With session write (creates one smoke session, never a lead):
TARGET_URL=https://www.askmagicmike.com node scripts/prod-smoke.mjs --write

# Dry run (prints what would be checked, no network calls):
TARGET_URL=https://www.askmagicmike.com node scripts/prod-smoke.mjs --dry-run
```

---

## Checks performed

| Check | Mode | What it verifies |
|-------|------|-----------------|
| `homepage:status` | read | `GET /` → 200 |
| `homepage:og_url` | read | `og:url` meta tag points to `TARGET_URL` |
| `homepage:canonical` | read | `<link rel="canonical">` points to `TARGET_URL` |
| `homepage:no_secret_leak` | read | No raw service-role key pattern in HTML |
| `homepage:og_image` | read | `og:image` meta tag present |
| `homepage:twitter_image` | read | `twitter:card` + `twitter:image` present |
| `homepage:no_funnel` | read | No `/funnel` reference in HTML |
| `homepage:no_stale_copy` | read | No stale market copy (Gainesville, Florida, etc.) |
| `homepage:no_mls_markers` | read | No MLS/IDX confidential markers in public HTML |
| `security:hsts` | read | `Strict-Transport-Security` header present (warn if missing) |
| `security:x_content_type_options` | read | `X-Content-Type-Options: nosniff` present (warn if missing) |
| `security:referrer_policy` | read | `Referrer-Policy` header present (warn if missing) |
| `security:permissions_policy` | read | `Permissions-Policy` header present (warn if missing) |
| `admin:unauth_returns_401` | read | `GET /api/admin/health` without credentials → 401 |
| `embed:ask_loads` | read | `GET /embed/ask` → 200 |
| `robots:status` | read | `GET /robots.txt` → 200 |
| `robots:blocks_admin` | read | `/admin` is in `Disallow` |
| `sitemap:status` | read | `GET /sitemap.xml` → 200 |
| `sitemap:canonical_origin` | read | Sitemap contains `TARGET_URL` |
| `admin:health` | read + auth | `/api/admin/health` → 200 with `ok: true`, DB reachable (only if `ADMIN_SECRET` is set) |
| `session:create` | **write** | `POST /api/session/create` with smoke UTM tag (only with `--write` flag) |

---

## Safety rules

The smoke script enforces these rules:

1. **Never creates a real customer lead.** The only write (`--write`) creates a session, not a lead.
2. **Smoke sessions are tagged** `AMM_SMOKE_DO_NOT_CONTACT` in the UTM campaign field — easy to filter from analytics.
3. **Sessions expire naturally.** No cleanup step needed.
4. **Secrets are never logged.** Env vars are only checked for presence (`present: true/false`).
5. **No outbound SMS or email.** The session route does not trigger messaging.

---

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed (or only warnings/skips — not failures) |
| 1 | One or more checks `fail` |
| 2 | Configuration error (missing `TARGET_URL`) |

Security header checks (`security:*`) emit `warn` status, not `fail`, when headers are absent — they are advisory until Delta PR #44 is merged. All other checks that can fail will fail.

---

## Report output

A JSON report is written to `artifacts/prod-smoke-report.json` after each run. Do not commit this file. It is gitignored.

---

## When to run

- After every production deploy
- After every environment variable rotation
- Before any major campaign or traffic event
- When debugging a suspected production regression

---

## Adding new checks

All pure helper functions (`hasOgUrl`, `hasCanonical`, `hasNoMlsMarkers`, `extractSecurityHeaders`, etc.) are exported from `scripts/prod-smoke.mjs` and tested in `tests/scripts/prod-smoke.test.ts`.

When adding a new check:
1. Extract the detection logic into a pure exported function
2. Add tests for the pure function in `tests/scripts/prod-smoke.test.ts`
3. Call the detection function in a `checkXxx()` async function
4. Add the call to `main()`
5. Update the checks table in this file

---

## Known limitations

- Security header checks (`security:*`) warn rather than fail — the headers depend on Delta PR #44 being merged. After merge, these should be promoted to `fail` if absent.
- The `embed:ask_loads` check only verifies HTTP 200 — it does not parse the embed page content.
- The `admin:health` check requires `ADMIN_SECRET` in env — in CI, set `ADMIN_SECRET` as a secret or the check is automatically skipped.
