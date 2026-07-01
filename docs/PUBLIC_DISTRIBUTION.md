# Public Distribution — Ask Magic Mike

Public-facing partner distribution and campaign generator surfaces. These routes are fully public (no auth required). All embed scripts, channel links, and campaign presets are statically rendered — no server data, no secrets.

---

## Routes

| Route | File | Description |
|---|---|---|
| `/distribution` | `src/app/(campaign)/distribution/page.tsx` | Embed snippets, channel links, attribution reference |
| `/campaigns` | `src/app/(campaign)/campaigns/page.tsx` | 11 campaign presets with copyable output |

---

## Embed Snippets

All embed scripts load from:

```
https://askmagicmike.com/embed/amm-loader.js
```

**Never use a Vercel preview-deployment URL.** Run `scripts/amm/verify-production-alias.mjs` before deploying new embed code.

### WordPress Sidebar

```html
<!-- Ask Magic Mike — WordPress Sidebar Widget -->
<script async
  src="https://askmagicmike.com/embed/amm-loader.js"
  data-amm-widget="ask"
  data-amm-position="sidebar"
  data-amm-source="wordpress-sidebar"
  data-amm-campaign="widget"
></script>
```

Place in: **Appearance → Widgets → Custom HTML**

### WordPress Gutenberg Block

```html
<!-- Ask Magic Mike — Gutenberg Custom HTML Block -->
<script async
  src="https://askmagicmike.com/embed/amm-loader.js"
  data-amm-widget="ask"
  data-amm-position="inline"
  data-amm-source="gutenberg"
  data-amm-campaign="widget"
></script>
```

Place in: **Block editor → Custom HTML block**

### Generic HTML

```html
<!-- Ask Magic Mike — Generic HTML Embed -->
<script async
  src="https://askmagicmike.com/embed/amm-loader.js"
  data-amm-widget="ask"
  data-amm-source="website"
  data-amm-campaign="widget"
></script>
```

Place before `</body>` on any page.

---

## Channel UTM Links

| Channel | URL |
|---|---|
| Facebook | `https://askmagicmike.com/?utm_source=facebook&utm_medium=social&utm_campaign=distribution` |
| Instagram | `https://askmagicmike.com/?utm_source=instagram&utm_medium=bio&utm_campaign=distribution` |
| Email | `https://askmagicmike.com/?utm_source=email&utm_medium=newsletter&utm_campaign=distribution` |
| QR Sign Rider | `https://askmagicmike.com/?utm_source=qr&utm_medium=print&utm_campaign=sign-rider` |
| QR Open House | `https://askmagicmike.com/?utm_source=qr&utm_medium=print&utm_campaign=open-house` |
| SMS / Text | `https://askmagicmike.com/?utm_source=sms&utm_medium=text&utm_campaign=distribution` |

---

## UTM Parameter Reference

| Parameter | Common Values | Tracks |
|---|---|---|
| `utm_source` | `facebook · instagram · email · qr · sms · website · wordpress` | Where the click originated |
| `utm_medium` | `social · bio · newsletter · print · text · sidebar · inline` | Distribution method |
| `utm_campaign` | `sign-rider · open-house · widget · distribution · listing-[MLSID]` | Campaign or context |
| `utm_content` | Any descriptive string — e.g. `header · footer · cta-button` | A/B variant or placement |

---

## Campaign Presets

Defined in `src/lib/content/campaign-presets.ts`. All 11 presets are statically exported — no API calls, no database reads.

| ID | Label | Category |
|---|---|---|
| `home_value` | Home Value | conversion |
| `ask_mike` | Ask Mike Anything | awareness |
| `we_buy_houses` | We Buy Houses | capture |
| `agent_profile` | Agent Profile CTA | awareness |
| `listing_promotion` | Listing Promotion | conversion |
| `open_house` | Open House Capture | capture |
| `qr_flyer` | QR Flyer | print |
| `email_blast` | Email Blast | email |
| `facebook_post` | Facebook Post | awareness |
| `instagram_caption` | Instagram Caption | awareness |
| `video_script` | Short Video Script | video |

Each preset exports:
- `headline` — main copy header
- `shortCaption` — ≤140 chars (X, SMS, pull quote)
- `longCaption` — ≤500 chars (Facebook, Threads, IG, email body)
- `emailSubject` + `emailBody` — for email type presets
- `videoScript` — for video type presets
- `ctaLabel` + `ctaUrl` — CTA with UTM attribution
- `placement` — suggested channels
- `complianceNote` — what not to do

---

## Compliance Guardrails

**Required:**
- Always include Equal Housing Opportunity mark on print materials
- Replace all `[PLACEHOLDER]` values before publishing
- Verify MLS listing data is current before listing promotion campaigns
- Include CAN-SPAM compliant unsubscribe + physical address on all email blasts

**Prohibited:**
- Do not claim guaranteed sale prices or specific value outcomes
- Do not imply real-time automated responses — Mike or the team follows up personally
- Do not claim MLS search or certified property assessment services
- Do not use Vercel preview-deployment URLs in any public-facing link
- Do not post on behalf of Our Town Properties without explicit authorization
- Do not claim AI automatically posts or sends on the user's behalf

---

## Adding a New Preset

1. Add to the `CAMPAIGN_PRESETS` array in `src/lib/content/campaign-presets.ts`
2. Assign a unique `id` (kebab_case), `label`, `category`, `badge`, `badgeColor`
3. Write `headline`, `shortCaption`, `longCaption`, and `ctaUrl` (must include `utm_source`)
4. Add `complianceNote` — describe what is **not** allowed, not just what is
5. Run tests: `pnpm test tests/compliance/public-distribution.test.ts`
6. The `/campaigns` page will automatically render the new preset

---

## Related Files

| File | Purpose |
|---|---|
| `docs/WIDGET_DISTRIBUTION.md` | Admin embed + channel reference (admin context) |
| `docs/MARKETING_TEMPLATES.md` | Long-form marketing templates and video scripts |
| `src/app/(admin)/admin/widgets/page.tsx` | Admin widget center (auth-protected) |
| `src/app/(admin)/admin/distribution/page.tsx` | Admin distribution analytics |
| `src/components/ui/copy-snippet.tsx` | Inline copy component for public surfaces |
| `src/components/admin/copy-block.tsx` | Card-style copy component (reused on public pages) |
| `src/lib/content/campaign-presets.ts` | Canonical preset data |
| `tests/compliance/public-distribution.test.ts` | Test coverage for all public surfaces |
