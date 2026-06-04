# Preview QA Checklist — phase-2-release-hardening

Run against the Vercel Preview URL produced by this branch. Production
must NOT be promoted in this phase.

## Automated runner (preferred)

```bash
PREVIEW_URL="https://<preview-url>" \
ADMIN_SECRET="…" \
CRON_SECRET="…" \
VERCEL_AUTOMATION_BYPASS_SECRET="…"   # only if preview protection is on \
SAFE_DB_WRITE=false \
npm run preview:qa
```

Writes `artifacts/preview-qa-report.json` and `.md`. Exits nonzero on any
failure. Mutation tests require `SAFE_DB_WRITE=true` AND the preview
health endpoint reporting `safe_for_preview_mutation: true`. See
[release-gate.md](./release-gate.md) for the full layered gate.

### Testing protected Vercel previews

If the preview returns 401 on `/`, Vercel Deployment Protection is on.
Set `VERCEL_AUTOMATION_BYPASS_SECRET` (or one of its aliases) and
re-run. The runner sends `x-vercel-protection-bypass: <secret>` on
every request and reports `protection_bypass_present` in the artifact.
Set `SET_VERCEL_BYPASS_COOKIE=true` to also send the
`x-vercel-set-bypass-cookie` header.

For manual browser QA, sign in to Vercel for the same scope, or use a
bypass-cookie URL of the shape
`?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=true`.
**Never paste bypass URLs into public docs, tickets, screenshots,
Slack, or QA reports.** Set `PRINT_MANUAL_BYPASS_URL=true` to surface
the *template* (no token) in runner stdout.

The runner uses Node's built-in `fetch`; no system `curl` is required.

The checklist below documents the manual probes the runner automates —
keep it for incidents or partial debugging when the runner can't reach
a host.

## Setup

```bash
PREVIEW="https://<preview-url>"   # paste the Vercel preview URL
ADMIN_SECRET="…"                  # from Vercel env (Preview scope)
CRON_SECRET="…"                   # from Vercel env (Preview scope)
```

## Public funnel

- [ ] `GET $PREVIEW/` — landing renders, no console errors.
- [ ] `GET $PREVIEW/ask` — intake step 1 renders.
- [ ] `GET $PREVIEW/value` — Brand Kit v2 hero loads, UTM banner picks up `utm_source=ourtown_wp`.
- [ ] `GET $PREVIEW/embed/ask` — iframe-friendly intake renders.
- [ ] `GET $PREVIEW/widget-preview` — internal widget preview renders all four states.

For every WordPress UTM variant:

```bash
for m in homepage_cta mike_profile seller_page_cta; do
  curl -s -o /tmp/q-${m}.html -w "${m} -> %{http_code}\n" \
    "$PREVIEW/value?utm_source=ourtown_wp&utm_medium=${m}&utm_campaign=ask_magic_mike"
done
```

- [ ] All three return `200`.
- [ ] All three contain `Start with your address`, `Mike Eatmon`,
      `Our Town Properties, Inc.`, `not an appraisal`.

## Canonical capture

```bash
curl -sX POST "$PREVIEW/api/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Preview Test",
    "email": "qa+preview@example.com",
    "phone": "+12525550101",
    "lead_type": "buyer",
    "source": "ad_form",
    "utm_source": "facebook",
    "utm_medium": "paid_social",
    "utm_campaign": "preview_qa",
    "consent": { "sms": true, "email": true }
  }'
```

- [ ] Returns `201` with `ok: true` and a `lead_id`.
- [ ] A second identical POST returns `200` with `is_duplicate: true`.
- [ ] A POST with `honeypot: "I am a bot"` returns `422` with `ok: false`.

## Widget functional flow

Open `/widget-preview` and the `/value` page in a browser:

- [ ] Click intent chip → next-question step appears.
- [ ] Answer 1–3 questions → contact form appears.
- [ ] Submit without email AND phone → friendly error.
- [ ] Submit with email → success state appears, reference id shown.
- [ ] Analytics events fired in Network tab:
      `widget_opened`, `widget_started`, `widget_intent_selected`,
      `widget_question_answered`, `widget_contact_submitted`,
      `widget_lead_created`.

## Admin cockpit

- [ ] `GET $PREVIEW/admin` — existing dashboard loads.
- [ ] `GET $PREVIEW/admin/leads` — filter form + table render. With
      Supabase configured, real rows appear; otherwise a clear
      mock-mode banner.
- [ ] `GET $PREVIEW/admin/leads/<id>` — profile, attribution, events,
      messages, tasks, listing matches, compliance flags all render.
- [ ] AdminLeadActions surface shows: Assign, Status/Classification,
      Add note, Create task, Send SMS (with consent state), Send
      Email (with consent state), Intel (listing match + seller
      review).
- [ ] Each action returns a success or error banner; success
      revalidates the page so changes appear immediately.

### Admin APIs

```bash
H="x-admin-secret: $ADMIN_SECRET"

# Dashboard
curl -sH "$H" "$PREVIEW/api/admin/dashboard" | jq '.metrics.totals'

# Lead list
curl -sH "$H" "$PREVIEW/api/admin/leads?limit=5" | jq '.items | length'

# Lead detail (replace LEAD_ID)
curl -sH "$H" "$PREVIEW/api/admin/leads/$LEAD_ID" | jq 'keys'

# Note
curl -sXPOST -H "$H" -H "Content-Type: application/json" \
  -d '{"note":"smoke test"}' \
  "$PREVIEW/api/admin/leads/$LEAD_ID/notes"

# Task
curl -sXPOST -H "$H" -H "Content-Type: application/json" \
  -d '{"title":"Follow up","priority":"high"}' \
  "$PREVIEW/api/admin/leads/$LEAD_ID/tasks"

# Mock SMS
curl -sXPOST -H "$H" -H "Content-Type: application/json" \
  -d '{"channel":"sms","template_slug":"buyer_listing_confirmation"}' \
  "$PREVIEW/api/admin/leads/$LEAD_ID/messages"
```

- [ ] All return `ok: true`.

## SLA sweep

Admin auth:

```bash
curl -sXPOST -H "x-admin-secret: $ADMIN_SECRET" \
  "$PREVIEW/api/admin/sla/sweep" | jq '.mode, .scanned'
```

- [ ] `mode: "admin"`.

Cron auth:

```bash
curl -sXGET -H "Authorization: Bearer $CRON_SECRET" \
  "$PREVIEW/api/admin/sla/sweep" | jq '.mode'
```

- [ ] `mode: "cron"`.

With `?persist=true` the breaches insert into `compliance_flags`. Verify
in Supabase if applied.

## Webhooks (mock mode)

```bash
H="x-admin-secret: $ADMIN_SECRET"

# Inbound SMS STOP
curl -sXPOST -H "$H" -H "Content-Type: application/json" \
  -d '{"From":"+12525551234","Body":"STOP"}' \
  "$PREVIEW/api/webhooks/sms/inbound" | jq '.stop_handled'
# Expected: true

# Inbound SMS START
curl -sXPOST -H "$H" -H "Content-Type: application/json" \
  -d '{"From":"+12525551234","Body":"START"}' \
  "$PREVIEW/api/webhooks/sms/inbound" | jq '.start_handled'
# Expected: true

# Email — Resend-shaped unsubscribe
curl -sXPOST -H "$H" -H "Content-Type: application/json" \
  -d '{"type":"email.unsubscribed","data":{"email_id":"em_1","to":["qa@example.com"]}}' \
  "$PREVIEW/api/webhooks/email/events" | jq '.event_type, .provider'
# Expected: "unsubscribed" "resend"

# Email — SendGrid bounce
curl -sXPOST -H "$H" -H "Content-Type: application/json" \
  -d '{"event":"bounce","email":"qa@example.com","sg_message_id":"sg-1"}' \
  "$PREVIEW/api/webhooks/email/events" | jq '.event_type, .provider'
# Expected: "bounced" "sendgrid"

# Email — Postmark delivery
curl -sXPOST -H "$H" -H "Content-Type: application/json" \
  -d '{"RecordType":"Delivery","MessageID":"pm-1","Recipient":"qa@example.com"}' \
  "$PREVIEW/api/webhooks/email/events" | jq '.event_type, .provider'
# Expected: "delivered" "postmark"
```

## Listings

```bash
curl -s "$PREVIEW/api/listings/search?status=active&limit=3" | jq '.items | length'
```

- [ ] Returns an array. No `agent_remarks`, `lockbox_info`, `compensation`
      fields in any item.

```bash
curl -sXPOST \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"csv":"MLS,Address,City,State,Zip,List Price\nT-1,123 Test St,Wilson,NC,27893,300000"}' \
  "$PREVIEW/api/admin/listings/import"
```

- [ ] Returns `okCount: 1`. If Supabase configured, listing appears in
      `/admin` listings search.

## Compliance spot checks

- [ ] No `lamp` / `genie` / `cash offer` strings on `/value`, `/ask`,
      `/embed/ask`, or any compiled JS bundle.
- [ ] `appraisal` appears only inside `not an appraisal` on every
      public page.
- [ ] Admin auth: routes return `401` when `x-admin-secret` is omitted
      or wrong.

## Rollback

This phase is preview-only. To roll back:

```bash
git checkout main
# main remains at ecf59c9 — production unchanged.
```
