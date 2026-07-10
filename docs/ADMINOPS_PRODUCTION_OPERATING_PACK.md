# Ask Magic Mike AdminOps Production Operating Pack

## 1. Purpose

This is the safe operating guide for the deployed Ask Magic Mike AdminOps layer used by Our Town Properties. Public lead capture and admin operations are live production surfaces.

Use this pack for day-to-day lead review, reporting review, agent allocation, safe verification, and engineering handoff. Do not use it as approval to mutate production data casually.

## 2. Live URLs

Public:

- `https://www.askmagicmike.com`
- `https://www.askmagicmike.com/widget`
- `https://www.askmagicmike.com/widget.js`
- `https://www.askmagicmike.com/embed/ask`

Admin:

- `/admin`
- `/admin/leads`
- `/admin/reporting`
- `/admin/allocation`

The apex domain `https://askmagicmike.com` redirects to `www`.

## 3. Access and Security

Admin routes use Basic Auth through `ADMIN_SECRET`.

- Do not paste secrets into chat, docs, GitHub, terminal logs, or screenshots.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in page/client code.
- Anonymous admin routes should return `401` with `WWW-Authenticate` or fail-closed `503`, never `200`.
- Missing or placeholder admin auth in production should fail closed.
- Public pages must not import admin read models, admin mutation helpers, allocation actions, or audit writers.

## 4. Admin Surface Map

### `/admin/leads`

Purpose: protected lead inbox for reviewing captured leads and triaging operational status.

Read-only review includes:

- created time
- current status
- funnel/source surface
- assignment state
- name, email, phone, address, timeline, condition, question, and notes when present
- attribution fields such as source, medium, campaign, placement, parent URL, embed host, landing/current path, and device category

Status actions exist for:

- `contacted`
- `qualified`
- `appointment_set`
- `converted`
- `dead`
- `spam`
- `new`

Mutating actions:

- Status forms call the protected server action and PATCH only `leads.status`.
- `Closed won`, `Closed lost`, and `Spam / test lead` require UI confirmation.
- No delete action is implemented.

### `/admin/reporting`

Purpose: protected read-only AdminOps analytics from existing `leads` rows.

Read-only status:

- The page performs bounded Supabase REST GET queries.
- It does not submit leads, update lead status, assign agents, or mutate Supabase.

Windows:

- 7 days
- 30 days
- 90 days

Sections:

- KPI row for leads today, last 7 days, last 30 days, and contactable rate
- funnel counts
- status buckets
- source attribution
- top pages
- lead type, intent, and timeline mix
- hot lead indicators

Use these metrics as operating signals. They are not revenue, appraisal, or guaranteed conversion claims.

### `/admin/allocation`

Purpose: protected manual agent allocation surface for reviewing agent load, assigning captured leads, and auditing assignment activity.

Read-only sections include:

- agent cards
- unassigned hot leads
- unassigned lead queue
- assigned leads by agent
- stale unassigned leads
- source, timeline, and intent mix
- recent assignment activity

Live assignment controls:

- `Assign` sets `leads.assigned_agent_id`, `leads.assigned_at`, and `leads.assignment_status`.
- `Unassign` clears `leads.assigned_agent_id` and `leads.assigned_at`, then sets `leads.assignment_status` to `unassigned`.
- Reassignment uses the same assignment flow when a lead already has a different assigned agent.

Operators must treat these controls as production writes.

## 5. Lead Intake Review Procedure

1. Open `/admin/leads` daily.
2. Identify new, contactable, high-intent, and hot leads.
3. Inspect source, page, timeline, contact fields, question, notes, and attribution before acting.
4. Prioritize leads with phone, immediate timeline, seller intent, and useful property details.
5. Avoid changing status unless the action reflects real operational work.
6. Use `spam` for internal QA or non-real submissions only when clearly labeled and appropriate.
7. Do not create or submit test leads in production unless the owner explicitly approves that QA pass.

## 6. Reporting Review Procedure

1. Open `/admin/reporting` weekly.
2. Compare 7, 30, and 90 day windows.
3. Review lead volume and contactable rate.
4. Inspect status buckets and funnel movement.
5. Compare source attribution and top pages for source quality.
6. Review timeline, intent, and hot lead sections.
7. Use reporting to guide marketing and source-quality decisions.
8. Do not present reporting as fake conversion, revenue, sale-price, or appraisal proof.

## 7. Assignment Procedure

1. Open `/admin/allocation`.
2. Review available agents and current assigned lead load.
3. Prioritize hot unassigned leads.
4. Inspect each lead's contact, intent, timeline, source, and score before assignment.
5. Assign only after deciding the correct agent.
6. Never bulk-click assignment controls.
7. Never test assignment controls on live leads without explicit owner approval.
8. If assigning a live lead, verify the assignment appears afterward.
9. Check recent assignment activity after changes.
10. If an assignment result shows a warning or conflict, pause before continuing.

Requires owner verification: production mutation verification of assignment controls was intentionally not performed during read-only verification. Any future live assignment is an owner-approved operational action.

## 8. Assignment Audit Behavior

Audit storage: `audit_logs`.

Assignment writes:

- preflight GET current assignment from `leads`
- guarded PATCH on `assigned_agent_id`
- audit POST to `audit_logs` after a successful PATCH

Audited actions:

- `assigned`
- `reassigned`
- `unassigned`

Audit payload:

- `actor`: `system/admin_basic_auth` until named admin identity exists
- `action`: `lead.assigned`, `lead.reassigned`, or `lead.unassigned`
- `resource_type`: `lead`
- `resource_id`: lead id
- `before_state.assigned_agent_id`: prior agent id or null
- `after_state.assigned_agent_id`: new agent id or null
- `after_state.assignment_status`: assignment state written to `leads`
- `metadata.source`: `admin_allocation`
- `metadata.action_route`: `/admin/allocation`

Conflict safety:

- If assignment state changes between GET and PATCH, the guarded PATCH returns no row.
- The action returns `assignment_conflict`.
- No audit event should be written on conflict.

Audit failure:

- If assignment succeeds but audit write fails, the assignment remains changed.
- The UI returns an audit warning.
- The operator should pause and investigate audit write health before continuing.

## 9. Operator Do / Do Not Checklist

Do:

- Review leads daily.
- Use reporting weekly.
- Assign intentionally.
- Verify after assignment.
- Check recent assignment activity after assignment changes.
- Escalate audit warnings.
- Keep secrets out of chat, docs, screenshots, tickets, and command output.

Do not:

- Paste secrets.
- Submit fake production leads.
- Test assign/unassign on real leads casually.
- Delete leads.
- Edit Vercel env vars without approval.
- Change WordPress or DNS during AdminOps use.
- Use terminal scripts to mutate production assignments.
- Run production SQL or Supabase writes from a local shell without explicit owner approval.

## 10. Safe Verification Commands

These checks are GET/HEAD-only and should not reveal secrets.

Public route smoke:

```sh
curl -I https://www.askmagicmike.com/
curl -I https://www.askmagicmike.com/widget
curl -I https://www.askmagicmike.com/widget.js
curl -I https://www.askmagicmike.com/embed/ask
```

Anonymous admin protection checks:

```sh
curl -sS -o /tmp/amm-admin-root-anon.txt -D /tmp/amm-admin-root-anon.headers -w "%{http_code}\n" https://www.askmagicmike.com/admin
curl -sS -o /tmp/amm-admin-leads-anon.txt -D /tmp/amm-admin-leads-anon.headers -w "%{http_code}\n" https://www.askmagicmike.com/admin/leads
curl -sS -o /tmp/amm-admin-reporting-anon.txt -D /tmp/amm-admin-reporting-anon.headers -w "%{http_code}\n" https://www.askmagicmike.com/admin/reporting
curl -sS -o /tmp/amm-admin-allocation-anon.txt -D /tmp/amm-admin-allocation-anon.headers -w "%{http_code}\n" https://www.askmagicmike.com/admin/allocation
```

Expected: `401` with `WWW-Authenticate`, or fail-closed `503`. Anonymous admin should never return `200`.

Git safety checks:

```sh
git status --short --branch
git log -5 --oneline
find . -maxdepth 1 -name 'package-lock.json' -o -name 'yarn.lock' -o -name 'bun.lockb'
```

Authenticated read-only pattern:

```sh
read -s AMM_ADMIN_SECRET
export AMM_ADMIN_SECRET
curl -sS -u "admin:${AMM_ADMIN_SECRET}" -o /tmp/amm-admin-allocation.html -w "%{http_code}\n" https://www.askmagicmike.com/admin/allocation
```

After authenticated checks:

- Do not print the secret.
- Do not cat the full body if it contains lead data.
- Grep only required labels.
- Do not commit `/tmp` or `.amm-run` artifacts.

Example label check:

```sh
rg -F "Agent allocation" /tmp/amm-admin-allocation.html
rg -F "Recent assignment activity" /tmp/amm-admin-allocation.html
```

## 11. Incident Response

### Admin route returns `200` anonymously

Immediate safe checks:

- Re-run anonymous curl with headers.
- Confirm the path is under `/admin`.
- Check the deployed code still has matcher `/admin/:path*`.

What not to do:

- Do not paste admin secrets into debug output.
- Do not change env vars without approval.

Escalation path:

- Treat as a security incident.
- Escalate to the owner and engineering.
- Disable access or roll back only through an approved production process.

### Admin route returns `503`

Immediate safe checks:

- Confirm only admin routes are affected.
- Confirm public routes still return `200`.
- Review deployment logs without printing secrets.

What not to do:

- Do not paste or rotate secrets casually.
- Do not expose `ADMIN_SECRET` in screenshots or tickets.

Escalation path:

- Owner or approved engineer verifies Vercel environment configuration.

### Public route returns `402` or `DEPLOYMENT_DISABLED`

Immediate safe checks:

- Check `/`, `/widget`, `/widget.js`, and `/embed/ask` with GET/HEAD.
- Inspect Vercel deployment status through approved tooling.

What not to do:

- Do not redeploy, edit DNS, or edit Vercel env vars without explicit approval.

Escalation path:

- Escalate to owner and deployment operator.

### Assignment action returns `assignment_conflict`

Immediate safe checks:

- Refresh `/admin/allocation`.
- Inspect the lead's current assignment in the UI.
- Check recent assignment activity.

What not to do:

- Do not repeatedly click assignment controls.
- Do not force a database update from the terminal.

Escalation path:

- Decide the correct current assignee with the owner or operations lead before retrying.

### Assignment action returns audit warning

Immediate safe checks:

- Treat the assignment as changed.
- Check the lead's current assignment in `/admin/allocation`.
- Check recent assignment activity and server logs for audit write health.

What not to do:

- Do not continue bulk assignment work.
- Do not manually backfill audit rows without engineering approval.

Escalation path:

- Escalate to engineering to investigate `audit_logs` writes.

### Reporting appears empty

Immediate safe checks:

- Compare 7, 30, and 90 day windows.
- Confirm `/admin/leads` has rows.
- Check whether the page shows a configured-state error.

What not to do:

- Do not submit fake production leads just to create reporting rows.
- Do not run production SQL writes.

Escalation path:

- Engineering should inspect read-only Supabase query health and available columns.

### Lead capture appears broken

Immediate safe checks:

- GET public routes.
- Check browser console and network for public UI errors.
- Review logs for `/api/leads` without submitting repeated test leads.

What not to do:

- Do not POST to `/api/leads` or submit live QA leads unless the owner approves the specific test.
- Do not mutate Supabase directly.

Escalation path:

- Owner-approved QA lead submission may be used only when read-only checks are insufficient.

### Widget not loading on WordPress

Immediate safe checks:

- Confirm `https://www.askmagicmike.com/widget.js` returns `200`.
- Confirm WordPress code uses the production domain, not a Vercel preview URL.
- Check whether a cache/CDN layer is serving stale markup.

What not to do:

- Do not edit DNS.
- Do not paste secrets into WordPress.
- Do not change unrelated WordPress theme/plugin files.

Escalation path:

- Owner or WordPress operator verifies the footer snippet and cache state.

## 12. Launch Readiness Status

- Public routes deployed.
- Admin routes protected.
- Reporting deployed.
- Allocation deployed.
- Assignment audit deployed.
- Authenticated read-only verification completed for `/admin/reporting` and `/admin/allocation`.
- Requires owner verification: production mutation verification was intentionally not performed except real future operations approved by the owner.
- No production data was mutated during read-only verification.

## 13. Remaining Recommended Next Layers

- Named admin identity instead of `system/admin_basic_auth`.
- Agent availability controls if schema supports a simple status field later.
- Notification layer after assignment.
- Audit viewer filters/search.
- CRM export/sync.
- Marketing source attribution dashboard.
- Real operator training checklist.
