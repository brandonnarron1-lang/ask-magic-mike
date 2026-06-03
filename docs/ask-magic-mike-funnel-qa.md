# Ask Magic Mike — Funnel QA

Owner: Our Town Properties, Inc. · Wilson, NC · Mike Eatmon (broker/BIC)
App: `ask-magic-mike` (Next.js 15 on Vercel)
Lead funnel entry: `/value` → `/ask` (5-step intake) → confirmation

This doc captures how to verify the live WordPress CTA → `/value` → lead-submit
flow after attribution + compliance hardening.

## 1. Live WordPress CTA source URLs

These are the three production CTAs wired into wordpress.ourtownproperties.com.
All three route to `/value` with `utm_source=ourtown_wp` and a distinct
`utm_medium`.

| Source | URL |
| ------ | --- |
| Homepage | `https://ask-magic-mike.vercel.app/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike` |
| Mike profile | `https://ask-magic-mike.vercel.app/value?utm_source=ourtown_wp&utm_medium=mike_profile&utm_campaign=ask_magic_mike` |
| We Buy Homes / Seller page | `https://ask-magic-mike.vercel.app/value?utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike` |

`utm_source` is always `ourtown_wp`. Ignore any rendered `utm_source=chatgpt.com`
links — the verified browser URLs use `ourtown_wp`.

## 2. Attribution fields captured

The `/value` page captures attribution on first paint and writes it to
`sessionStorage` under the key `amm_attribution`. The record carries:

```
utmSource     utmMedium     utmCampaign     utmContent     utmTerm
referrerUrl   referrerType  landingPath     landingUrl     firstSeenAt
```

Persistence rules (see `src/lib/attribution/client-storage.ts`):

- First-touch wins: once UTMs are stored, later page views without UTMs do not
  overwrite them.
- A fresh UTM source in the URL replaces the stored record (last-paid-click
  override).
- `firstSeenAt` is set once and preserved across re-captures.

When the user clicks the `/value` form button or a quick chip, captured UTMs
are appended to the `/ask?...` URL via `appendUtmsToParams` so attribution
survives even if `sessionStorage` is cleared between the two routes.

`/ask` re-captures attribution from the URL (or reads stored record if URL is
bare), then passes it to `useSession()`, which posts every UTM field plus
`referrerUrl` and `landingPage` to `/api/session/create`. The resulting session
row owns the canonical attribution; the same data is also attached to the lead
submit payload (see below) for redundancy.

## 3. Lead submit payload

`POST /api/intake/submit` accepts these fields (see
`src/schemas/lead.schema.ts`). Attribution-related fields are bold:

```
sessionId            uuid (required)
firstName            string | null
lastName             string | null
email                email | null
phone                E.164 | null
addressRaw           string | null
addressLine1/2       string | null
city, state, zip     string | null
primaryIntent        sell | buy | both | unknown
questionRaw          string | null
timelineMonths       0 | 3 | 6 | 12 | 24 | null
consentSms           boolean
consentCall          boolean
consentEmail         boolean
ctaChipUsed          enum | null
utmSource            string | null   ← from sessionStorage / URL
utmMedium            string | null   ← from sessionStorage / URL
utmCampaign          string | null   ← from sessionStorage / URL
utmContent           string | null   ← from sessionStorage / URL
utmTerm              string | null   ← from sessionStorage / URL
sourceUrl            string | null   ← window.location.href at submit
landingPath          string | null   ← original /value path
referrerUrl          string | null   ← document.referrer at submit
```

The submit route now:

- forwards `utmSource` / `utmMedium` into the scoring input (was hardcoded to
  `null`),
- tags CRM contacts with `utm_source:`, `utm_medium:`, `utm_campaign:` and
  appends the source to the contact's `source` field
  (`ask-magic-mike:ourtown_wp` for WordPress traffic),
- attaches UTMs to the `intake_completed` and `lead_scored` analytics events.

## 4. Test lead

Safe data for manual QA. The CRM adapter will see this as production data, so
clearly label leads as test and avoid triggering live SMS:

```
Address     123 Test Lead Street, Wilson, NC 27893
Name        Atlas Test Lead
Email       test+askmagicmike@ourtownproperties.com
Phone       +12525550100
Timeline    3 months
Intent      sell
Consent     email only (skip SMS to avoid carrier message)
```

## 5. Manual QA checklist

Run this for each of the three source URLs in §1. Use Chrome devtools →
Application → Session Storage → `amm_attribution` to verify the captured
record, and Network → `/api/intake/submit` payload to verify the lead body.

For each source:

- [ ] `/value` loads cleanly (no 404, no console errors).
- [ ] `sessionStorage.amm_attribution` contains the expected `utmSource`,
      `utmMedium`, `utmCampaign`.
- [ ] Disclosure text "Ask Magic Mike by Our Town Properties, Inc. provides
      local guidance…" is visible under the address form.
- [ ] Click "Start" → `/ask?…` URL contains the same UTM parameters.
- [ ] `POST /api/session/create` payload includes the UTMs and `landingPage`.
- [ ] Walk through steps 1 → 5 with the test data.
- [ ] `POST /api/intake/submit` payload includes `utmSource`, `utmMedium`,
      `utmCampaign`, `sourceUrl`, `landingPath`, `sessionId`.
- [ ] Confirmation step renders with disclosure paragraph at the bottom.

## 6. Compliance language

Required language on `/value`:

> Ask Magic Mike by Our Town Properties, Inc. provides local guidance and a
> preliminary home value range. This is not an appraisal and does not create
> an agency relationship unless a written brokerage agreement is signed. Mike
> Eatmon or a member of the Our Town Properties team may follow up.

Required language on confirmation:

> Mike Eatmon or a member of the Our Town Properties team will follow up with
> local guidance based on the information provided. Any home value range
> shared is preliminary and is not an appraisal. No agency relationship is
> created unless a written brokerage agreement is signed.

Forbidden language anywhere in the `/value` funnel (enforced by
`tests/compliance/value-copy.test.ts`):

- "appraisal" (except in the negation "not an appraisal")
- "guaranteed value" / "guaranteed offer"
- "binding offer" / "binding cash offer"
- "instant cash offer"

## 7. Running tests

```
./node_modules/.bin/vitest run        # unit + schema + attribution + compliance
./node_modules/.bin/next lint         # eslint
./node_modules/.bin/tsc --noEmit      # typecheck
./node_modules/.bin/next build        # production build
```

Last green run: 10 files / 106 tests · lint clean · typecheck clean · build OK.

## 8. Verifying `/value` locally

```
./node_modules/.bin/next dev
open "http://localhost:3000/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike"
```

In devtools console, after page load:

```
JSON.parse(sessionStorage.getItem('amm_attribution'))
```

Expect:

```json
{
  "utmSource": "ourtown_wp",
  "utmMedium": "homepage_cta",
  "utmCampaign": "ask_magic_mike",
  "landingPath": "/value",
  ...
}
```
