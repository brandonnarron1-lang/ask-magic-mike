# Ask Magic Mike — Production Recovery Runbook

Quick reference for production outage response. Check the appropriate section for the failure mode.

---

## Immediate Triage

```
pnpm run amm:verify:startup    # is the process alive and DB reachable?
pnpm run amm:verify:health     # do all three health tiers respond correctly?
pnpm run amm:smoke:prod        # does the full intake funnel respond?
```

---

## Failure: Deployment Broken (site returns errors)

1. Check the live deployment: `pnpm run amm:verify:startup`
2. View Vercel logs for the failing deployment
3. If the deploy itself is broken, roll back to the previous production alias:

```bash
# Find the last working deployment
node scripts/amm/verify-production-alias.mjs

# Roll back via Vercel dashboard → Deployments → Promote prior build
# OR via CLI:
vercel rollback --scope team_OVg2uOSyJCpX100BPgb8nJK9
```

4. After rollback, re-run: `pnpm run amm:smoke:prod`

---

## Failure: Supabase Unreachable

**Symptoms:** `/api/health/ready` returns 503 with `reason: "db_unreachable"`; intake returns 500.

1. Check [Supabase status](https://status.supabase.com) for incident
2. Check project `mmvvyeypqudywudsndcl` in the Supabase dashboard
3. If project is paused, restore it: Supabase dashboard → Project Settings → Restore

**During outage (intake is unavailable):**
- The intake form will surface a generic error message
- No leads are lost to a frontend error (user can retry)
- Notify Mike if outage exceeds 15 minutes

**After outage resolves:**
- Run `pnpm run amm:verify:startup` to confirm DB reachable
- Check for any leads that need manual follow-up in Supabase dashboard → `leads` table

---

## Failure: Missing Environment Variable

**Symptoms:** `/api/health/ready` returns 503 with `reason: "configuration_error"`.

1. Check which vars are missing:
   ```bash
   ADMIN_SECRET=xxx pnpm run amm:verify:startup
   # Look for FAIL env:XXX lines in dependencies output
   ```
2. Set the missing var in Vercel dashboard → Project → Settings → Environment Variables
3. Redeploy (Vercel requires a new deploy to pick up new env vars): `vercel deploy --prod`
4. Re-verify: `pnpm run amm:verify:startup`

**Required vars:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SECRET`

**Recommended vars:**
- `CRON_SECRET` (needed for Vercel Cron SLA sweep)
- `NEXT_PUBLIC_APP_URL`

---

## Failure: Failed Migration

**Symptoms:** DB queries for a specific table return errors; admin health shows table missing.

1. Check which migration is missing:
   ```sql
   SELECT name FROM supabase_migrations.schema_migrations ORDER BY name;
   ```
2. Identify the migration file in `supabase/migrations/`
3. Apply via Supabase MCP or CLI:
   ```bash
   supabase db push --db-url "postgresql://postgres:[password]@[host]:5432/postgres"
   ```
4. Verify the migration applied:
   ```bash
   pnpm run amm:verify:startup
   ```

**Do not apply migrations during peak traffic hours.** The properties UNIQUE index (00015) and analytics index can lock rows briefly on large tables.

---

## Failure: SLA Sweep 500/503

**Symptoms:** `GET /api/admin/sla/sweep` returns 503 with `error: "sweep_failed"`.

1. The sweep route now wraps the engine in try/catch and returns 503 on DB failure
2. Check if DB is reachable: `pnpm run amm:verify:startup`
3. If DB is fine, check Vercel runtime logs for the sweep route error detail
4. Manual dry-run from admin cockpit: Admin → SLA Sweep → Run (no persist)

**Sweep is idempotent.** Running it multiple times does not create duplicate compliance_flags (dedup check in `recordBreach`). Safe to retry after DB recovers.

---

## Failure: Intake Route 500

**Symptoms:** Lead submission returns 500; no leads being created.

1. Verify DB reachable: `pnpm run amm:verify:startup`
2. Run ghost lead smoke to isolate the failing step:
   ```bash
   curl -X POST https://www.askmagicmike.com/api/admin/smoke/lead \
     -H "x-admin-secret: $ADMIN_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"firstName":"Test","lastName":"Lead","email":"test@amm.invalid","phone":"+19195550100","primaryIntent":"sell","sessionId":"00000000-0000-4000-8000-000000000001","consentEmail":true,"consentSms":false,"consentCall":false}'
   ```
3. Ghost lead smoke runs the same validation/scoring/routing logic with no DB writes. A passing smoke + failing intake = DB write problem.
4. Check Vercel runtime logs for the intake route error.

---

## Failure: Admin Cockpit Returns 401/503

**Symptoms:** Admin UI inaccessible.

1. Verify `ADMIN_SECRET` is set in Vercel env vars
2. Check middleware: `src/middleware.ts` protects `/admin/:path*` via Basic auth
3. Admin API routes check `x-admin-secret` header — distinct from Basic auth
4. If Basic auth password forgotten, update `ADMIN_BASIC_AUTH_PASSWORD` in Vercel and redeploy

---

## Failure: No Agents Assigned (routing returning null)

**Symptoms:** Leads created but no agent assigned; `lead_routing` table empty.

1. Check agents table: `SELECT id, name, is_active, current_load, max_daily_leads FROM agents`
2. If no active agents: `UPDATE agents SET is_active = true WHERE name = 'Mike Eatmon'`
3. Check availability windows in agent record — must include current day/hour
4. Run ghost lead smoke and check `routing.agentsAvailable` and `routing.wouldAssign`

---

## Release Verification Checklist

Before every production deploy:

```bash
# 1. Local gate
pnpm run verify

# 2. After deploy completes
TARGET_URL=https://www.askmagicmike.com ADMIN_SECRET=xxx pnpm run amm:verify:release
```

The release gate runs: startup → health → admin health → conversion funnel. All four must pass before marking a release complete.

---

## Contacts

- **Supabase project:** `mmvvyeypqudywudsndcl` (us-east-1)
- **Vercel team:** `team_OVg2uOSyJCpX100BPgb8nJK9`
- **Production URL:** `https://www.askmagicmike.com`
- **Production alias verification:** `node scripts/amm/verify-production-alias.mjs`
