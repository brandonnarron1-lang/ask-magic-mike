# Black Diamond Implementation Handoff

## Summary

Baseline branch: `black-diamond-recovery-implementation`

Baseline commit: `8315130 Implement Black Diamond recovery hero and conversion funnel`

Completion commit: current HEAD, `Complete Black Diamond ecosystem surfaces and widget`

This pass componentized the homepage, added dedicated public routes, implemented a real embeddable widget, created OurTownProperties.com integration artifacts, strengthened lead/chat APIs, and captured QA screenshots.

## Routes Implemented

- `/`
- `/home-value`
- `/sell`
- `/ask`
- `/widget`
- `/widget-preview`
- `/integrations/ourtownproperties`
- `/social-preview`
- `/api/leads`
- `/api/valuation` backward-compatible alias
- `/api/chat`

## Widget Usage

Production snippet:

```html
<script
  async
  src="https://askmagicmike.com/widget.js"
  data-source="ourtownproperties"
  data-medium="website"
  data-campaign="parent-site-widget"
  data-placement="sitewide-floating">
</script>
```

JavaScript API:

```js
window.AskMagicMikeWidget.init({
  source: "ourtownproperties",
  medium: "website",
  campaign: "parent-site-widget",
  placement: "sitewide-floating",
  theme: "black-diamond"
});
```

The script injects a floating launcher and iframe. The iframe loads `/widget` with `source`, `medium`, `campaign`, `placement`, `parent_url`, `embed_host`, and `referrer`.

## OurTownProperties.com Integration

No confirmed live OurTownProperties.com repo was found locally. Production-ready artifacts are included:

- `docs/integrations/ourtownproperties-widget-snippet.html`
- `docs/integrations/ourtownproperties-wordpress-instructions.md`
- `docs/integrations/ourtownproperties-homepage-section.html`
- `/integrations/ourtownproperties`
- `/widget-preview`

## Assets Used

Approved Black Diamond assets only:

- `public/brand/black-diamond/hero-home-desktop.*`
- `public/brand/black-diamond/hero-home-mobile.*`
- `public/brand/black-diamond/hero-social-4x5.*`
- `public/brand/black-diamond/hero-social-story.*`
- `public/brand/black-diamond/our-town-logo.png`

No Mike likeness regeneration or alteration was performed.

## Analytics Events

Supported browser events:

- `page_view`
- `hero_cta_click`
- `home_value_started`
- `address_submit`
- `email_submit`
- `phone_submit`
- `seller_form_submit`
- `widget_opened`
- `widget_closed`
- `widget_lead_started`
- `widget_lead_created`
- `chat_started`
- `chat_message_sent`
- `appointment_click`
- `lead_created`

Client analytics safely no-op unless `window.dataLayer` or `window.posthog` exists. Widget iframe posts analytics messages to the parent window.

## Lead Payload

Canonical endpoint: `/api/leads`

Supported fields:

- `funnel_type`: `home_value | seller | chat | appointment | widget`
- `lead_source_surface`: `homepage | home_value_page | seller_page | ask_page | widget | ourtownproperties`
- `address`
- `name`
- `email`
- `phone`
- `timeline`
- `condition`
- `notes`
- `question`
- `attribution`
- `status: new`
- `assigned_agent_id: null`
- `created_at`

Attribution supports `source`, `medium`, `campaign`, `content`, `term`, `referrer`, `landing_page`, `initial_path`, `current_path`, `parent_url`, `embed_host`, `placement`, `gclid`, `fbclid`, and `device_category`.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POSTHOG_API_KEY`
- `POSTHOG_API_HOST`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `RESEND_API_KEY`

Missing Supabase env vars make lead persistence no-op with server logging. Missing PostHog, OpenAI, or Resend env vars no-op safely. `/api/chat` returns a production-safe fallback when `OPENAI_API_KEY` is absent.

## QA

Commands run:

```bash
npm run lint
npm run build
```

Results: both passed.

Screenshot capture:

```bash
/opt/homebrew/opt/python@3.14/bin/python3.14 scripts/capture_black_diamond.py
```

Screenshots saved under `output/playwright/black-diamond-completion/`:

- `homepage-desktop-1920.png`
- `homepage-desktop-1440.png`
- `homepage-tablet.png`
- `homepage-mobile.png`
- `home-value-step-address.png`
- `home-value-step-email.png`
- `home-value-step-phone-timeline.png`
- `home-value-thank-you.png`
- `seller-path.png`
- `ask-mike-page.png`
- `widget-preview-closed-desktop.png`
- `widget-preview-open-desktop.png`
- `widget-preview-open-mobile.png`
- `ourtown-integration-preview.png`
- `social-preview-feed-4x5.png`
- `social-preview-story-9x16.png`

## Remaining Risks

- Production Supabase schema must accept the full lead payload or the legacy fallback columns.
- Real valuation logic is not implemented; copy avoids promising an instant automated valuation.
- `/api/chat` is intentionally careful and does not claim MLS facts.
- Replace local development URLs in docs/snippets only after deployment target is approved.

## Deployment Notes

Do not deploy without approval. Do not change DNS. Do not run destructive database migrations. Do not add paid services without approval.
