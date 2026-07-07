# Ask Magic Mike QA Checklist

Use this checklist for production verification without relying on chat history. Do not submit production leads or mutate production data unless the specific QA pass explicitly authorizes it.

## Safety Gate

- [ ] No secrets are printed or pasted.
- [ ] No Vercel environment variables are changed.
- [ ] No Supabase schema changes are made.
- [ ] No WordPress files, PHP, theme files, or plugins are changed.
- [ ] No DNS changes are made.
- [ ] No package manager lockfiles other than `pnpm-lock.yaml` are present.
- [ ] Production lead submission is explicitly approved before any live submit.
- [ ] Production status mutation is explicitly approved before changing a real lead.

## Public Route Smoke

Expected: public routes return `200` after any apex-to-www redirect.

- [ ] `https://askmagicmike.com/`
- [ ] `https://askmagicmike.com/home-value`
- [ ] `https://askmagicmike.com/sell`
- [ ] `https://askmagicmike.com/ask`
- [ ] `https://askmagicmike.com/widget`
- [ ] `https://askmagicmike.com/widget.js`
- [ ] `https://askmagicmike.com/embed/ask`
- [ ] `https://askmagicmike.com/integrations/ourtownproperties`
- [ ] `https://askmagicmike.com/widget-preview`
- [ ] `https://askmagicmike.com/social-preview`
- [ ] No route returns `402`.
- [ ] No route returns `DEPLOYMENT_DISABLED`.
- [ ] No public route unexpectedly returns `404`.

## Widget Install

- [ ] WordPress Footer Code contains the `https://askmagicmike.com/widget.js` snippet.
- [ ] Snippet includes `data-source="ourtownproperties"`.
- [ ] Snippet includes `data-medium="website"`.
- [ ] Snippet includes `data-campaign="parent-site-widget"`.
- [ ] Snippet includes `data-placement="sitewide-floating"`.
- [ ] No Vercel preview URL appears in WordPress widget code.
- [ ] Legacy floating widget is disabled unless explicitly needed.

## Widget Open / Close

- [ ] One Ask Magic Mike launcher appears.
- [ ] Launcher is bottom-right on desktop.
- [ ] Launcher becomes mobile-safe on small screens.
- [ ] Open state shows the Black Diamond widget panel.
- [ ] Header reads Ask Magic Mike.
- [ ] Trust line references Our Town Properties.
- [ ] Tabs are visible:
  - [ ] Get My Home Value
  - [ ] Ask a Question
  - [ ] Selling Options
- [ ] Close button works.
- [ ] Escape key closes on desktop.
- [ ] No generic blue chat widget styling appears.
- [ ] No fantasy/genie/cartoon/mascot visuals appear.

## Duplicate Widget Check

- [ ] Only one launcher is visible.
- [ ] Only one `#askmagicmike-widget-root` exists in the DOM.
- [ ] Legacy loader and modern widget are not both actively mounting floating launchers.
- [ ] No duplicate iframe panels open.

## Stale URL Check

- [ ] WordPress code uses `https://askmagicmike.com/widget.js` or `https://www.askmagicmike.com/widget.js`.
- [ ] No `*.vercel.app` URL is embedded in WordPress.
- [ ] No old local `localhost` widget URL is embedded.
- [ ] `/embed/ask` remains available for compatibility.

## Lead Capture QA

Only run when a live QA lead is explicitly approved.

- [ ] Use internal QA name/email/phone only.
- [ ] Do not use a real consumer's information.
- [ ] Submit through the live OurTownProperties.com widget.
- [ ] Public UI shows a success state.
- [ ] Public UI does not show:
  - [ ] `Supabase insert failed`
  - [ ] `PGRST204`
  - [ ] `schema cache`
  - [ ] raw JSON database error
  - [ ] table or column internals
- [ ] Only one submit is performed.
- [ ] No retry storm appears in logs.

## Supabase Row Verification

Use Supabase dashboard or approved read-only inspection. Do not print secrets.

- [ ] One `sessions` row exists for the QA submission.
- [ ] One `leads` row exists for the QA submission.
- [ ] `leads.session_id` references `sessions.id`.
- [ ] `leads.address_raw` contains the submitted address.
- [ ] `leads.timeline_months` is one of `0`, `3`, `6`, `12`, `24`.
- [ ] `leads.lead_type` is populated.
- [ ] `leads.primary_intent` is populated.
- [ ] `leads.source` is populated.
- [ ] `leads.source_detail` is populated.
- [ ] `leads.page_url` points to the true parent page when submitted from OurTownProperties.com.
- [ ] `leads.widget_session_id` is populated.
- [ ] `sessions.landing_page` prefers the parent OurTownProperties.com URL when available.
- [ ] QA lead is marked `spam` after verification.

## Admin Auth

- [ ] `https://www.askmagicmike.com/admin` anonymous returns `401` or fail-closed `503`.
- [ ] `https://www.askmagicmike.com/admin/leads` anonymous returns `401` or fail-closed `503`.
- [ ] Anonymous admin routes never return `200`.
- [ ] Anonymous admin routes should not return `404` after AdminOps deployment.
- [ ] Authenticated `/admin/leads` renders when using the owner-approved Basic Auth credential.
- [ ] Do not print, paste, or screenshot `ADMIN_SECRET`.

## Admin Lead Actions

Only mutate production lead status when explicitly approved.

- [ ] Lead cards show current status.
- [ ] Available actions include:
  - [ ] Mark contacted
  - [ ] Mark qualified
  - [ ] Appointment set
  - [ ] Closed won
  - [ ] Closed lost
  - [ ] Spam / test lead
  - [ ] Restore to new
- [ ] Spam/test requires confirmation.
- [ ] Closed won requires confirmation.
- [ ] Closed lost requires confirmation.
- [ ] QA lead can be marked spam/test through UI.
- [ ] Incorrect status can be restored to `new`.
- [ ] No delete action exists.

## WordPress Visual QA

- [ ] Header/nav remains usable.
- [ ] Homepage hero remains visually aligned with Our Town Properties.
- [ ] Ask Magic Mike launcher does not cover critical CTA controls.
- [ ] We Buy Homes Gravity Forms submit button is visible and usable.
- [ ] Forms retain readable labels and inputs.
- [ ] No overlapping text on desktop.
- [ ] No overlapping text on mobile.
- [ ] Black/gold/ruby/cream treatment stays restrained.
- [ ] No Mike image is altered or regenerated.
- [ ] No generic SaaS or fantasy visuals appear.

## Mobile QA

- [ ] Check iPhone-width viewport around 390px when browser tooling allows.
- [ ] Launcher remains reachable.
- [ ] Widget open state fits the viewport.
- [ ] Close control remains visible.
- [ ] Form inputs remain tappable.
- [ ] Submit buttons remain visible.
- [ ] No content is clipped behind browser chrome.
- [ ] No text overlaps in hero/forms/widget.

## No-Lead / No-Mutation Safety

Use this mode for routine smoke checks.

- [ ] Use GET-only route checks.
- [ ] Do not POST to `/api/leads`.
- [ ] Do not submit WordPress forms.
- [ ] Do not submit Ask Magic Mike widget forms.
- [ ] Do not use admin status forms.
- [ ] Do not write to Supabase.
- [ ] Do not run production SQL.

## Rollback Checklist

### Widget Rollback

- [ ] Remove `widget.js` snippet from WordPress Footer Code.
- [ ] Clear WordPress/cache plugin/CDN cache.
- [ ] Confirm launcher is removed.
- [ ] Re-enable legacy widget only if explicitly approved.

### Visual Rollback

- [ ] Open WordPress Customizer.
- [ ] Open Additional CSS.
- [ ] Delete only the marked block for the failed visual version.
- [ ] Publish.
- [ ] Clear cache.
- [ ] Recheck desktop and mobile.

### Admin/LeadOps Rollback

- [ ] Do not delete leads.
- [ ] Restore mistaken status changes from `/admin/leads?filter=closed`.
- [ ] For deploy-level issues, use the previous known-good Vercel deployment only with explicit approval.
- [ ] Do not change DNS during rollback.
- [ ] Do not change Supabase schema during rollback.
