# Vercel Cron — SLA sweep

The SLA sweep route `POST/GET /api/admin/sla/sweep` accepts two
authorization modes:

1. **Admin** — `x-admin-secret: $ADMIN_SECRET` (manual run from cockpit).
2. **Cron** — `Authorization: Bearer $CRON_SECRET`.

Vercel Cron cannot easily inject a custom header in older accounts.
The cleanest, account-portable path is `Authorization: Bearer …`, which
Vercel Cron supports out of the box.

## Recommended `vercel.json`

Add to the repo root (this file does NOT currently exist; create it
when you're ready to enable cron):

```json
{
  "crons": [
    {
      "path": "/api/admin/sla/sweep?persist=true",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

The path is hit with the `Authorization: Bearer $CRON_SECRET` header
that Vercel Cron sends automatically when the env var is configured.

## Env vars

In Vercel Project → Settings → Environment Variables:

| Var | Value |
| --- | --- |
| `CRON_SECRET` | a long random string (≥ 32 chars). NEVER commit. |
| `ADMIN_SECRET` | already set; unchanged. |
| `BUSINESS_HOURS_TIMEZONE` | `America/New_York` |
| `BUSINESS_HOURS_START` | `08:00` |
| `BUSINESS_HOURS_END` | `20:00` |

The local `.env.example` already lists these.

## Schedule guidance

- **Every 5 minutes** is appropriate for A+/A SLA windows (2-minute and
  5-minute targets). Anything tighter starts pinging the route faster
  than the SLA target deserves.
- **Every 15 minutes** is fine if A+ traffic is rare.
- **Every 1 hour** is fine for B/C leads only — don't choose this if
  you ever ship paid traffic.

## Manual sweep (cockpit / debugging)

```bash
# Dry-run (does not persist breaches)
curl -X POST "https://ask-magic-mike.vercel.app/api/admin/sla/sweep" \
  -H "x-admin-secret: $ADMIN_SECRET"

# Persist breaches into compliance_flags
curl -X POST "https://ask-magic-mike.vercel.app/api/admin/sla/sweep?persist=true" \
  -H "x-admin-secret: $ADMIN_SECRET"
```

Cron mock test:

```bash
curl -X GET "https://ask-magic-mike.vercel.app/api/admin/sla/sweep?persist=true" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Response shape:

```json
{
  "ok": true,
  "mode": "cron",
  "scanned": 42,
  "breaches": [
    { "leadId": "…", "grade": "A+", "type": "contact_missed", "dueAt": "…" }
  ],
  "summary": { "total": 42, "withinTarget": 39, "breached": 3, "hitRate": 0.928 },
  "flaggedCount": 3
}
```

## What happens on a hit

For each detected breach:

1. `compliance_flags` row inserted with `flag_type`
   `sla_accept_breached` or `sla_contact_breached`.
2. `analytics_events` row inserted with the matching event name.
3. The admin cockpit (`/admin/leads` and `/admin/leads/[id]`) surfaces
   the flag.
4. **No** SMS/email is sent automatically (that's behind the
   communications adapter + consent gates and is intentionally
   separate from the sweep).

## Rollback

To stop the cron without redeploying: remove the `crons` entry from
`vercel.json` and redeploy, or disable the cron in Vercel Project →
Cron Jobs.

Removing `CRON_SECRET` from env vars also disables Bearer-auth without
touching the route code.
