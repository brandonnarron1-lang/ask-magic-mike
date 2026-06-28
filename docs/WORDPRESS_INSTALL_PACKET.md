# WordPress Install Packet — Ask Magic Mike CTAs

**Product:** Ask Magic Mike — broker-reviewed real estate guidance  
**Production URL:** https://www.askmagicmike.com  
**Parent brand:** Our Town Properties, Inc. — https://www.ourtownproperties.com  
**Broker:** Mike Eatmon  
**Market:** Wilson, NC / Eastern NC  
**Date:** 2026-06-28  
**Status:** `/ask-mike/` embed page is LIVE. Homepage CTA links to it with UTMs. Remaining: verify UTM pass-through is working, confirm leads appear in admin.

---

## Current Production State

| Page on OTP | CTA Type | Target | UTMs | Status |
|---|---|---|---|---|
| Homepage | Link button | `/ask-mike/` with UTMs | `utm_source=ourtownproperties&utm_medium=homepage_cta&utm_campaign=website_widget` | ✅ Live |
| `/ask-mike/` | Iframe embed (amm-loader.js) | `/embed/ask` | `utm_source=ourtownproperties&utm_medium=referral&utm_campaign=website_widget` | ✅ Live |
| Mike Eatmon profile | TBD | — | — | ⬜ Not installed |
| Seller / "We Buy Homes" | TBD | — | — | ⬜ Not installed |

---

## Exact Snippets to Install

> For each snippet: log into WP Admin → Pages → [target page] → Launch Beaver Builder (or Block Editor) → add Custom HTML block → paste → save → publish.

---

### A. Homepage Hero CTA (if current button needs updating)

The homepage already has a CTA pointing to `/ask-mike/`. If you want it to point directly to `askmagicmike.com/value`:

```html
<div style="text-align:center; margin: 2rem 0;">
  <a
    href="https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike"
    target="_blank"
    rel="noopener noreferrer"
    style="
      display: inline-block;
      background: #D4A017;
      color: #0A0A0A;
      font-weight: 700;
      font-size: 1rem;
      padding: 0.9rem 2.2rem;
      border-radius: 8px;
      text-decoration: none;
      letter-spacing: 0.02em;
    "
  >
    What's My Home Worth? →
  </a>
  <p style="font-size:0.78rem; color:#888; margin-top:0.6rem;">
    Free · No account · Mike follows up directly
  </p>
</div>
```

---

### B. Mike Eatmon Profile / Agent Bio Page

Place at the bottom of the Mike Eatmon bio section.

```html
<div style="background:#0A0A0A; border:1px solid rgba(212,160,23,0.25); border-radius:12px; padding:1.5rem 2rem; text-align:center; margin:2rem 0;">
  <p style="color:#D4A017; font-size:0.7rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; margin-bottom:0.5rem;">
    ✦ Broker-Reviewed Local Guidance
  </p>
  <h3 style="color:#F5F0E8; font-size:1.4rem; font-weight:700; margin-bottom:0.5rem;">
    Ask Mike directly — anytime.
  </h3>
  <p style="color:#aaa; font-size:0.875rem; margin-bottom:1.25rem;">
    Get a real local take on your home's value, the Wilson NC market, or your next move.
  </p>
  <a
    href="https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=mike_profile&utm_campaign=ask_magic_mike"
    target="_blank"
    rel="noopener noreferrer"
    style="
      display:inline-block; background:#D4A017; color:#0A0A0A;
      font-weight:700; font-size:0.9rem; padding:0.75rem 2rem;
      border-radius:8px; text-decoration:none;
    "
  >
    Start With Your Address →
  </a>
  <p style="color:#555; font-size:0.7rem; margin-top:0.75rem;">
    Mike Eatmon · Our Town Properties · Licensed in NC · Wilson, NC
  </p>
</div>
```

**Attribution:** `utm_source=ourtown_wp&utm_medium=mike_profile&utm_campaign=ask_magic_mike`

---

### C. Seller / "We Buy Homes" Page CTA

Place on any seller-focused page, after the "What's my home worth?" copy block.

```html
<div style="margin:2rem 0; padding:1.25rem 1.5rem; border-left:3px solid #D4A017; background:rgba(212,160,23,0.05);">
  <p style="font-weight:700; font-size:1.05rem; color:#111; margin-bottom:0.4rem;">
    Curious what your home is worth today?
  </p>
  <p style="font-size:0.875rem; color:#555; margin-bottom:1rem;">
    Mike Eatmon will give you a real, local perspective on your Wilson NC home —
    not an automated estimate.
  </p>
  <a
    href="https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike"
    target="_blank"
    rel="noopener noreferrer"
    style="
      display:inline-block; background:#D4A017; color:#0A0A0A;
      font-weight:700; font-size:0.875rem; padding:0.65rem 1.6rem;
      border-radius:6px; text-decoration:none;
    "
  >
    Get My Home Value →
  </a>
</div>
```

**Attribution:** `utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike`

---

### D. Full Iframe Embed (for deep integration — any page)

Drops the complete intake form widget. Best on Mike's profile page or a dedicated landing page.

```html
<div style="border-radius:12px; overflow:hidden; border:1px solid rgba(212,160,23,0.2);">
  <iframe
    src="https://www.askmagicmike.com/embed/ask?utm_source=ourtown_wp&utm_medium=embed_widget&utm_campaign=ask_magic_mike"
    width="100%"
    height="650"
    style="border:none; display:block; background:#0A0A0A;"
    loading="lazy"
    title="Ask Magic Mike — Home Value &amp; Real Estate Guidance"
    allow="clipboard-write"
  ></iframe>
</div>
<p style="font-size:0.7rem; color:#888; text-align:center; margin-top:0.5rem;">
  Guidance from Mike Eatmon, licensed NC broker · Our Town Properties, Inc. · Not an appraisal.
</p>
```

**Attribution:** `utm_source=ourtown_wp&utm_medium=embed_widget&utm_campaign=ask_magic_mike`

---

### E. JS Loader Embed (recommended for /ask-mike/ page and similar)

Already installed on `/ask-mike/`. Use for any new placements that should inherit parent-page referrer automatically.

```html
<div class="amm-embed"
     data-utm-source="ourtown_wp"
     data-utm-medium="referral"
     data-utm-campaign="website_widget">
</div>
<script src="https://www.askmagicmike.com/embed/amm-loader.js" defer></script>
```

Change `data-utm-campaign` per placement: `homepage_cta`, `mike_profile_cta`, `seller_page_cta`, `blog_cta`.

---

## Placement Instructions (Beaver Builder)

1. WP Admin → Pages → [target page] → hover → **Launch Beaver Builder**
2. In Beaver Builder, click **+** to add a row/module → choose **HTML** module
3. Paste the snippet above
4. Click **Done** then **Publish**
5. Load the page in an **incognito tab** and confirm:
   - The button or embed renders
   - Clicking the button goes to the correct URL with UTM params visible in the address bar
   - The iframe embed loads the Ask Magic Mike intake form

**Do NOT edit theme PHP files, functions.php, or the IDX plugin.** Beaver Builder blocks only.

---

## UTM Attribution Map

| Source | Medium | Campaign | Meaning |
|---|---|---|---|
| `ourtown_wp` | `homepage_cta` | `ask_magic_mike` | Homepage hero button (direct link) |
| `ourtown_wp` | `mike_profile` | `ask_magic_mike` | Mike bio page button |
| `ourtown_wp` | `seller_page_cta` | `ask_magic_mike` | We Buy Homes / seller page |
| `ourtown_wp` | `embed_widget` | `ask_magic_mike` | Iframe embed (any page) |
| `ourtownproperties` | `referral` | `website_widget` | JS loader embed (current /ask-mike/) |
| `ourtownproperties` | `homepage_cta` | `website_widget` | Existing homepage CTA → /ask-mike/ |

All UTMs appear in the admin dashboard under each lead's source attribution row.

---

## Mobile Notes

- All snippets use `width:100%` — they adapt to mobile automatically
- Iframe height: 650px is optimal for mobile; can reduce to 580px if the page feels tall
- The JS loader (`amm-embed` div) auto-sizes to 580px by default; add `data-height="650"` for taller
- Test on a real mobile device or browser DevTools at 375px width before declaring it done

---

## End-to-End QA Checklist (run after each install)

- [ ] Load the page in an incognito window
- [ ] Confirm the CTA button or embed renders (not blank, not broken)
- [ ] Click the button — confirm URL contains the correct UTM params
- [ ] For iframe embed: widget loads, first step visible, no blank white box
- [ ] Submit one test question using: name `WP Smoke Test`, email `wpsmoke@test.invalid`, marker `OURTOWNWP_SMOKE_TEST_DO_NOT_CONTACT`
- [ ] Check admin at `https://www.askmagicmike.com/admin` (requires ADMIN_SECRET)
- [ ] Confirm the lead appears with `utm_source: ourtown_wp` or `ourtownproperties`
- [ ] Confirm `referrer_type: referral` in source attribution
- [ ] Delete the test lead from Supabase dashboard before going live with real traffic
- [ ] Screenshot the installed CTA (mask any credentials in screenshots)

---

## Compliance Rules

**Use these phrasings:**
- Broker-reviewed guidance
- Local follow-up from Mike Eatmon
- Not an appraisal
- Not a guaranteed sale price
- Preliminary home value range

**Do NOT use:**
- AI-powered instant estimate
- Instant home value
- Guaranteed offer
- Exact market value
- Same-day answer
- AI appraisal

---

## Rollback Instructions

If the CTA causes display issues:

1. WP Admin → Pages → [affected page] → Launch Beaver Builder
2. Delete the Custom HTML block you added
3. Save & Publish
4. Confirm the page renders normally in incognito
5. No server changes, no database rollback needed

The iframe/widget has no persistent WordPress side-effects — removing the block fully removes it.

---

## Access Notes

- WordPress admin: `https://www.ourtownproperties.com/wp-admin` — credentials in 1Password (brandonnarron1@gmail.com)
- **Do NOT touch:** IDX plugin, listing/property pages, theme code files, functions.php
- **Page builder:** Beaver Builder Pro — visual editor blocks only
- **DNS:** GoDaddy registrar → Regency Interactive's cPanel — do not touch
- Contact Regency Interactive (Scott Burns) for any hosting/theme-level changes

---

## Screenshots Required (Brandon captures manually)

1. Before: current state of each page before CTA install
2. After: each installed CTA block rendering correctly
3. Admin: lead appearing in `/admin` with correct UTM attribution (redact contact info)

Do not commit screenshots to the repo.
