# Ask Magic Mike — Widget Distribution Guide

**Surface:** `public/embed/amm-loader.js`  
**Embed host:** `https://askmagicmike.com` (Vercel — confirm current alias before publishing)

---

## Quick Start (Copy-Paste Embed)

Paste this snippet into any HTML page, WordPress post, or landing page. Replace `YOUR_SITE` with the deploying domain:

```html
<!-- Ask Magic Mike Widget -->
<div
  data-amm-widget="true"
  data-utm-source="wordpress"
  data-utm-medium="embed"
  data-utm-campaign="home-value"
></div>
<script
  src="https://askmagicmike.com/embed/amm-loader.js"
  async
  defer
></script>
```

The loader injects a responsive iframe that hosts the full intake flow. No additional dependencies required.

---

## UTM Attribute Reference

All `data-utm-*` attributes on the container are forwarded as query parameters to the intake URL.

| Attribute | Maps to | Example |
|---|---|---|
| `data-utm-source` | `utm_source` | `facebook`, `instagram`, `email`, `qr`, `wordpress` |
| `data-utm-medium` | `utm_medium` | `embed`, `social`, `print`, `paid` |
| `data-utm-campaign` | `utm_campaign` | `home-value`, `ask-mike`, `open-house` |
| `data-utm-content` | `utm_content` | `hero-banner`, `sidebar`, `footer` |
| `data-utm-term` | `utm_term` | `wilson-nc`, `fike-zone`, `downsizing` |

---

## Platform-Specific Snippets

### WordPress — Sidebar Widget

Paste into **Appearance → Widgets → Custom HTML**:

```html
<div
  data-amm-widget="true"
  data-utm-source="wordpress"
  data-utm-medium="embed"
  data-utm-campaign="home-value"
  data-utm-content="sidebar"
></div>
<script src="https://askmagicmike.com/embed/amm-loader.js" async defer></script>
```

### WordPress — Post/Page Block (Gutenberg)

Add a **Custom HTML** block and paste the Quick Start snippet. Adjust `utm_content` to reflect placement:

```html
<div
  data-amm-widget="true"
  data-utm-source="wordpress"
  data-utm-medium="embed"
  data-utm-campaign="home-value"
  data-utm-content="post-body"
></div>
<script src="https://askmagicmike.com/embed/amm-loader.js" async defer></script>
```

### Facebook / Instagram (Link in Bio or Ad)

Use a tracked landing page URL (not the embed) for social. Direct link:

```
https://askmagicmike.com/ask?utm_source=facebook&utm_medium=social&utm_campaign=home-value&chip=home_worth
```

For Instagram bio link, use:

```
https://askmagicmike.com/?utm_source=instagram&utm_medium=bio&utm_campaign=ask-mike
```

### Email Campaign (Newsletter or Drip)

Button link in your email HTML:

```html
<a href="https://askmagicmike.com/ask?utm_source=email&utm_medium=newsletter&utm_campaign=home-value&chip=home_worth">
  Ask Mike What Your Home Is Worth
</a>
```

Plain-text fallback:

```
Ask Mike what your Wilson home is worth:
https://askmagicmike.com/ask?utm_source=email&utm_medium=newsletter&utm_campaign=home-value
```

### QR Code (Flyer / Sign Rider / Open House)

Generate a QR code pointing to this URL. Match `utm_content` to the physical placement:

```
https://askmagicmike.com/?utm_source=qr&utm_medium=print&utm_campaign=home-value&utm_content=sign-rider
```

```
https://askmagicmike.com/?utm_source=qr&utm_medium=print&utm_campaign=open-house&utm_content=flyer-123-elm
```

---

## Mobile Guidance

- The widget is fully responsive. No fixed width needed — it adapts from 320px to full desktop.
- On mobile, the iframe opens at 100% width with a minimum height of `520px`.
- For landing pages served via Facebook/Instagram in-app browser, add `loading="lazy"` to the `<script>` tag to avoid mobile render blocking.
- Test on iOS Safari and Chrome Android before publishing. The intake form uses `inputMode="text"` and `autoComplete="street-address"` for optimal mobile keyboard behavior.

---

## Stale URL Guard

**Before publishing any embed or link:** confirm the canonical Vercel production alias is active.

Run from the project root:

```bash
node scripts/amm/verify-production-alias.mjs
```

Or check current deployment status in the Vercel dashboard. Never hardcode a Vercel preview URL (e.g., `ask-magic-mike-PREVIEW.vercel.app`) in an embed — preview URLs rotate on every push.

The canonical URL is: `https://askmagicmike.com`  
The fallback alias is: `https://ask-magic-mike.vercel.app`

---

## Admin Distribution Page

The admin dashboard at `/admin/distribution` shows:
- Active platform UTM breakdown
- Publishing queue and scheduled posts
- Embed performance metrics

An embed snippet generator is available in the admin UI for one-click copy of pre-configured snippets.

---

## Frequently Asked Questions

**Can I embed on multiple pages?**  
Yes. Each page instance is independent. Use `utm_content` to distinguish placements.

**Does the widget track conversions?**  
Yes. Every submission fires an analytics event attributed to the UTM parameters set on the embed container. View results in `/admin/analytics`.

**What if the embed doesn't appear?**  
1. Confirm the script tag is present and not blocked by a content security policy.
2. Check that `data-amm-widget="true"` is set on the container `<div>`.
3. Verify the script URL uses the canonical `askmagicmike.com` host, not a preview URL.

**Can I pre-fill a question or chip?**  
Not via widget attributes today. Use a direct URL with `?q=` and `?chip=` parameters for pre-filled flows.
