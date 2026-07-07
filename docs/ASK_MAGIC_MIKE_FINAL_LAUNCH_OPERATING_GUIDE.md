# Ask Magic Mike Final Launch Operating Guide

This guide captures the verified launch state for Ask Magic Mike and the OurTownProperties.com widget integration so day-to-day operation is not trapped in chat history.

## Final Verified Status

- Ask Magic Mike production is live.
- OurTownProperties.com widget is live and verified.
- Lead capture works end to end.
- PR #98 fixed sessions-first Supabase write mapping.
- PR #99 fixed `sessions.landing_page` parent URL attribution.
- PR #100 added protected `/admin/leads` status actions.
- Authenticated `/admin/leads` was verified.
- Anonymous `/admin/leads` returns `401`.
- Missing or placeholder `ADMIN_SECRET` fails closed with `503`.
- The QA lead was marked as spam/test through admin operations.
- OurTownProperties.com visual polish v1, v2, v3, v4, and v4.1 are live.
- v4.1 fixed the We Buy Homes Gravity Forms submit button.
- Final public visual/widget audit passed.
- No high or medium issues remain.
- No launch blocker remains.

## Domains

- Ask Magic Mike: `https://askmagicmike.com`
- Canonical Ask Magic Mike host: `https://www.askmagicmike.com`
- Our Town Properties: `https://www.ourtownproperties.com`

The apex Ask Magic Mike domain may redirect to `www`; that is expected.

## Public Ask Magic Mike Routes

These public routes should remain reachable:

- `/`
- `/home-value`
- `/sell`
- `/ask`
- `/widget`
- `/widget.js`
- `/embed/ask`
- `/integrations/ourtownproperties`
- `/widget-preview`
- `/social-preview`

Expected public smoke result: `200` after any apex-to-www redirect.

## WordPress Integration

The current sitewide widget uses the modern floating widget script:

```html
<!-- Ask Magic Mike sitewide floating widget -->
<script
  async
  src="https://askmagicmike.com/widget.js"
  data-source="ourtownproperties"
  data-medium="website"
  data-campaign="parent-site-widget"
  data-placement="sitewide-floating">
</script>
```

Install location:

1. WordPress Admin.
2. Customizer.
3. Code.
4. Footer Code.
5. Paste the snippet before the closing body area.
6. Publish.
7. Clear WordPress/cache plugin/CDN cache if active.

Operational notes:

- The legacy floating widget should remain disabled unless explicitly needed for rollback.
- Legacy `/embed/ask` remains live for compatibility.
- Do not use Vercel preview URLs in WordPress.
- Do not paste secrets into WordPress custom code.
- Keep data attributes intact so attribution survives.

Integration artifacts:

- `docs/integrations/ourtownproperties-widget-snippet.html`
- `docs/integrations/ourtownproperties-wordpress-instructions.md`
- `docs/integrations/ourtownproperties-homepage-section.html`

## Lead Capture Flow

Current production flow:

```text
OurTownProperties.com widget
  -> https://www.askmagicmike.com/widget iframe
  -> POST /api/leads
  -> upsert sessions row
  -> upsert leads row
  -> admin review in /admin/leads
```

`/api/leads` writes `sessions` first, then writes `leads`. This avoids the production failure where `leads.session_id` required an existing `sessions.id`.

Important lead fields:

- Property address: `leads.address_raw`
- Timeline: `leads.timeline_months`
- Lead type: `leads.lead_type`
- Intent: `leads.primary_intent`
- Source: `leads.source`
- Source detail: `leads.source_detail`
- Parent or landing page: `leads.page_url`
- Widget/session id: `leads.widget_session_id`

Important session fields:

- `sessions.id`
- `sessions.utm_source`
- `sessions.utm_medium`
- `sessions.utm_campaign`
- `sessions.referrer_url`
- `sessions.landing_page`
- `sessions.initial_address`
- `sessions.status = completed`

Embedded widget attribution:

1. `sessions.landing_page` prefers `attribution.parent_url`.
2. Then `payload.page_url`.
3. Then `attribution.landing_page`.
4. Then `attribution.current_path`.
5. Then request `referer`.

For OurTownProperties.com widget leads, the intended result is that the parent OurTownProperties.com page is visible on the lead/session, not merely the Ask Magic Mike widget route.

## Admin Operations

Admin route:

- `https://www.askmagicmike.com/admin/leads`

Protection:

- `/admin/:path*` is protected by Basic Auth.
- Password comes from `ADMIN_SECRET` in Vercel environment variables.
- Anonymous access should return `401` with a Basic Auth challenge.
- Missing or placeholder `ADMIN_SECRET` should fail closed with `503`.
- Do not print or paste `ADMIN_SECRET` in chat, docs, tickets, logs, or screenshots.

Admin lead actions:

- `new`
- `contacted`
- `qualified`
- `appointment_set`
- `converted`
- `dead`
- `spam`

Operational mappings:

- Internal QA / not-a-real-lead -> `spam`
- Closed won -> `converted`
- Closed lost -> `dead`
- Archived -> not implemented

Admin UI rules:

- Do not delete leads through Supabase unless explicitly approved.
- Use `/admin/leads` status actions rather than direct database edits.
- Spam/test and closed actions require explicit confirmation in the UI.
- Restore a wrongly marked lead by using `Restore to new`.

## QA Lead Policy

- Use only internal QA identity details.
- Never use real consumer data for QA.
- Submit production QA leads only when explicitly approved.
- After verifying the row, mark the QA lead as spam/test through `/admin/leads`.
- Do not delete QA leads unless explicitly approved.
- Do not mutate production leads from terminal.

## WordPress Visual Polish

Verified live polish:

- v1: initial Black Diamond visual alignment.
- v2: stronger widget/brand alignment.
- v3: final public visual polish pass.
- v4: additional OurTownProperties.com alignment.
- v4.1: We Buy Homes Gravity Forms submit button fix.

Rollback method:

1. WordPress Admin.
2. Customizer.
3. Additional CSS.
4. Delete only the clearly marked Ask Magic Mike / Black Diamond / v1-v4.1 CSS blocks that correspond to the failed change.
5. Publish.
6. Clear cache.
7. Recheck desktop and mobile.

No PHP, theme, or plugin file edits are part of the approved visual polish path.

## Security Rules

- Never paste secrets into chat.
- Never print secrets in terminal output.
- `ADMIN_SECRET` lives in Vercel environment variables.
- WordPress credentials live only in the owner password manager or browser session.
- Supabase service role key is server-side only.
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to client code.
- Do not use production Basic Auth credentials in command output.
- Do not change DNS, Vercel aliases, Vercel env vars, WordPress code, or Supabase schema without explicit approval.

## Routine Operations

### Verify Widget

1. Open `https://www.ourtownproperties.com`.
2. Confirm one Ask Magic Mike launcher is visible.
3. Open it.
4. Confirm the Black Diamond widget panel loads.
5. Confirm tabs are available:
   - Get My Home Value
   - Ask a Question
   - Selling Options
6. Close with the close button and Escape on desktop.
7. Check mobile width for near full-screen behavior.

### Verify Lead Capture

Only perform a production lead submission when explicitly approved.

1. Use internal QA identity details.
2. Submit through the live widget.
3. Confirm the public UI shows a success state.
4. Confirm exactly one `sessions` row and one `leads` row are created.
5. Confirm `leads.session_id` references `sessions.id`.
6. Confirm `address_raw`, `timeline_months`, `lead_type`, `primary_intent`, `source`, `source_detail`, `page_url`, and `widget_session_id`.
7. Confirm no raw Supabase/PostgREST/schema-cache text appears to the user.
8. Mark the QA lead as `spam`.

### Verify Admin Actions

1. Anonymous `https://www.askmagicmike.com/admin/leads` should return `401`.
2. Authenticated `/admin/leads` should render.
3. Find the QA lead.
4. Use `Spam / test lead`.
5. Check the confirmation box.
6. Submit.
7. Confirm the lead moves out of the default active queue.
8. If needed, use `/admin/leads?filter=closed` and `Restore to new`.

### Clear WordPress Cache

1. Clear the active WordPress cache plugin if present.
2. Clear host/CDN cache if present.
3. Hard refresh browser.
4. Recheck in an incognito/private window.
5. Recheck mobile viewport.

## Emergency Rollback

Use the smallest rollback that resolves the issue.

### Widget Problem

1. Remove the `widget.js` snippet from WordPress Footer Code.
2. Clear WordPress/cache plugin/CDN cache.
3. Recheck that the widget is gone.
4. Re-enable legacy widget only if explicitly approved.

### Visual Problem

1. Delete the marked Additional CSS block for the latest visual version.
2. Publish.
3. Clear cache.
4. Recheck desktop and mobile.

### AskMagicMike.com Deploy Problem

1. Identify the previous known-good commit.
2. Use Vercel rollback or redeploy that commit only with explicit approval.
3. Do not change DNS.
4. Do not change environment variables unless the incident is explicitly an env-var issue.

### Lead Status Mistake

1. Open `/admin/leads?filter=closed`.
2. Locate the affected lead.
3. Use `Restore to new`.
4. Re-triage with the correct action.

## Known Optional Future Work

- Analytics/reporting v1.
- Agent allocation controls.
- Email/SMS follow-up operations.
- Marketing asset generator.
- Final mobile 390 screenshot recapture when browser tooling allows.

These are optional improvements, not launch blockers.
