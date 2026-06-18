# WordPress Widget Integration — Ask Magic Mike

**Product:** Ask Magic Mike — broker-reviewed real estate guidance  
**Parent brand:** Our Town Properties, Inc.  
**Agent:** Mike Eatmon  
**Market:** Wilson, NC / Eastern NC  
**Production URL:** https://www.askmagicmike.com  
**Embed route:** https://www.askmagicmike.com/embed/ask  
**WordPress site:** https://www.ourtownproperties.com  
**WP Admin:** https://www.ourtownproperties.com/wp-admin  

---

## Quick-start (copy-paste into WordPress Custom HTML block)

```html
<div class="amm-embed"
     data-utm-source="ourtownproperties"
     data-utm-medium="referral"
     data-utm-campaign="website_widget">
</div>
<script src="https://www.askmagicmike.com/embed/amm-loader.js" defer></script>
```

Or use the bare iframe if you prefer no script:

```html
<iframe
  src="https://www.askmagicmike.com/embed/ask?utm_source=ourtownproperties&utm_medium=referral&utm_campaign=website_widget"
  title="Ask Magic Mike — Our Town Properties real estate guidance"
  width="100%"
  height="580"
  style="border:none; border-radius:12px; display:block; max-width:600px; margin:0 auto;"
  loading="lazy">
</iframe>
```

---

## What it does

When embedded on OurTownProperties.com, Ask Magic Mike:

1. Accepts a homeowner or buyer question (address, timeline, intent)
2. Records the lead with full UTM and referrer attribution
3. Sends the lead to the admin command center at `/admin`
4. Mike Eatmon reviews and follows up directly

**What it is NOT:**
- Not an appraisal
- Not an instant cash offer
- Not a guaranteed valuation
- Not a booking/scheduling engine
- Not a live-chat bot

**Safe copy to use on OurTownProperties.com:**
> Ask Mike a local real estate question — then he follows up with broker-reviewed guidance.

---

## Attribution tracking

All embed placements automatically capture:
- `utm_source`, `utm_medium`, `utm_campaign` from query params
- Referrer URL from the parent page (passed as `referrer` param)
- Attribution is stored in `source_attribution` and is visible in the admin inbox

**Default UTM values for OurTownProperties.com:**

| Placement           | utm_source        | utm_medium | utm_campaign       |
|---------------------|-------------------|------------|--------------------|
| Website main widget | ourtownproperties | referral   | website_widget     |
| Homepage hero CTA   | ourtownproperties | referral   | homepage_cta       |
| Agent profile page  | ourtownproperties | referral   | agent_profile_cta  |
| Seller landing page | ourtownproperties | referral   | seller_page_cta    |
| Blog post           | ourtownproperties | referral   | blog_cta           |

---

## Method 1 — JS Loader (recommended)

The loader script auto-mounts the iframe with attribution and handles responsive sizing.

```html
<!-- Place in sidebar, page body, or widget area -->
<div class="amm-embed"
     data-utm-source="ourtownproperties"
     data-utm-medium="referral"
     data-utm-campaign="website_widget">
</div>
<script src="https://www.askmagicmike.com/embed/amm-loader.js" defer></script>
```

**Pre-fill a question (optional):**
```html
<div class="amm-embed"
     data-utm-source="ourtownproperties"
     data-utm-medium="referral"
     data-utm-campaign="seller_page_cta"
     data-q="What is my Wilson NC home worth?">
</div>
<script src="https://www.askmagicmike.com/embed/amm-loader.js" defer></script>
```

---

## Method 2 — Direct iframe

```html
<iframe
  src="https://www.askmagicmike.com/embed/ask?utm_source=ourtownproperties&utm_medium=referral&utm_campaign=website_widget"
  title="Ask Magic Mike — Our Town Properties real estate guidance"
  width="100%"
  height="580"
  style="border:none; border-radius:12px; display:block; max-width:600px; margin:0 auto;"
  loading="lazy">
</iframe>
```

Customize the URL params for each placement:
- `utm_campaign=homepage_cta` for homepage
- `utm_campaign=agent_profile_cta` for Mike's profile page
- `utm_campaign=seller_page_cta` for seller landing pages

---

## Method 3 — Tracked CTA link (no iframe)

If you don't want to embed the full form, use a tracked CTA link that opens in a new tab:

```html
<a
  href="https://www.askmagicmike.com/?utm_source=ourtownproperties&utm_medium=referral&utm_campaign=website_cta"
  target="_blank"
  rel="noopener noreferrer"
  style="display:inline-block; background:#D4A017; color:#0A0A0A; font-weight:700; font-size:1rem; padding:0.9rem 2.2rem; border-radius:8px; text-decoration:none;"
>
  Ask Magic Mike →
</a>
<p style="font-size:0.78rem; color:#888; margin-top:0.5rem;">
  Broker-reviewed guidance · Not an appraisal · Our Town Properties
</p>
```

For value-page entry (sellers):
```html
<a
  href="https://www.askmagicmike.com/value?utm_source=ourtownproperties&utm_medium=referral&utm_campaign=seller_page_cta"
  target="_blank"
  rel="noopener noreferrer"
  style="display:inline-block; background:#D4A017; color:#0A0A0A; font-weight:700; font-size:1rem; padding:0.9rem 2.2rem; border-radius:8px; text-decoration:none;"
>
  What May My Home Be Worth? →
</a>
```

---

## WordPress page builder instructions

### Beaver Builder (current site builder)

1. WP Admin → Pages → [target page] → Launch Beaver Builder
2. Add a **Custom HTML** module
3. Paste the iframe or loader snippet
4. Set the row max-width to 640px or let the iframe control sizing
5. Save → Publish

### Block Editor (Gutenberg)

1. Edit the page
2. Add a **Custom HTML** block
3. Paste the iframe or loader snippet
4. Preview → Publish

### Elementor / Divi

1. Add an **HTML** widget / **Custom Code** module
2. Paste the iframe or loader snippet
3. Save → Publish

### Theme footer / sidebar widget

Add the loader snippet to any Text Widget or Custom HTML Widget in WP Admin → Appearance → Widgets.

---

## Recommended page placements on OurTownProperties.com

| Page                     | Recommended method | Suggested copy                                        |
|--------------------------|-------------------|-------------------------------------------------------|
| Homepage hero            | CTA link           | "Ask Magic Mike what your Wilson-area home may be worth" |
| Mike Eatmon profile      | Iframe embed       | Full widget below bio                                 |
| Seller landing page      | Iframe embed       | After "What's my home worth?" copy block              |
| Buyer landing page       | Iframe embed       | After "Find homes in Wilson NC" intro                 |
| Blog sidebar             | CTA link           | Compact gold button                                   |
| Footer widget area       | CTA link           | Link + one-line caption                               |

---

## Compliance / copy rules

**Use:** broker-reviewed guidance · local next steps · not an appraisal · request follow-up · Our Town Properties · Mike Eatmon · Wilson, NC / Eastern NC

**Do not use:** instant value · appraisal · guaranteed offer · same-day promise · within minutes · AI-powered instant estimate · market value guaranteed

**Boilerplate to include near any embed:**
> Guidance from Mike Eatmon, licensed NC broker — Our Town Properties, Inc. Not an appraisal. Results require human review.

---

## Fallback (if iframe doesn't render)

Add a visible fallback link inside the iframe:
```html
<iframe src="..." ...>
  <a href="https://www.askmagicmike.com/">Ask Magic Mike on AskMagicMike.com</a>
</iframe>
```

Or use the CTA link (Method 3) as a fallback alongside the embed.

---

## Technical notes

| Property               | Value                                                                              |
|------------------------|------------------------------------------------------------------------------------|
| Embed URL              | `https://www.askmagicmike.com/embed/ask`                                          |
| iframe-safe            | Yes — `Content-Security-Policy: frame-ancestors 'self' https://ourtownproperties.com https://*.ourtownproperties.com` |
| robots                 | `noindex, nofollow` (embed route is not indexed)                                   |
| Responsive             | Yes — uses `width:100%`, `max-width:600px`                                        |
| Mobile                 | Yes — tested on 375px width                                                        |
| HTTPS required         | Yes                                                                                |
| No cookies from AMM    | Session is local/in-memory; no cross-site tracking cookies                        |
| No outbound SMS/email  | Lead is captured; Mike follows up manually via CRM                                |

---

## Testing after deployment

After adding the snippet to OurTownProperties.com:

1. Load the page in an incognito window
2. Confirm the iframe renders (not blank)
3. Submit a test question using name/email with marker `OURTOWNWP_SMOKE_TEST_DO_NOT_CONTACT`
4. Check admin at `https://www.askmagicmike.com/admin` (requires ADMIN_SECRET)
5. Confirm the lead shows `referrer_type: referral` and `utm_source: ourtownproperties`
6. Delete the test row from Supabase dashboard before going live with real traffic

---

## Access notes

- WordPress admin: `https://www.ourtownproperties.com/wp-admin` — credentials in 1Password (brandonnarron1@gmail.com)
- Do NOT touch the IDX plugin or any listing/property pages
- Page builder: Beaver Builder Pro (visual editor only — do not edit theme code files)
- DNS: GoDaddy registrar → Regency Interactive's cPanel servers
- Hosting/cPanel: Available via 1Password

---

## Remaining manual steps

1. Add the embed or CTA link to at least one OurTownProperties.com page (homepage or Mike's profile)
2. Test the embed in a staging/draft page before publishing
3. Verify UTM attribution appears in admin inbox after first real submission
4. Confirm Mike Eatmon has admin access and can review leads at `https://www.askmagicmike.com/admin`
