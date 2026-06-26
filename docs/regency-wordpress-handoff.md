# WordPress CTA Handoff — Ask Magic Mike
# www.ourtownproperties.com via Regency Interactive

## Access Summary

**WordPress admin:** You have an administrator account on the site. Check email
(brandonnarron1@gmail.com / dabnelly23@gmail.com) for the credentials Scott Burns
(Regency) sent on 12/15/25, or retrieve via the 1Password secure link keyed off
your Gmail account. WordPress admin URL: `https://www.ourtownproperties.com/wp-admin`

**Page builder:** Beaver Builder Pro (visual editor). Edit pages via WP Admin →
Pages → hover any page → Beaver Builder. Do NOT use the theme code editor.

**Hosting/cPanel:** Available via 1Password secure link (Brandon's Gmail).
DNS is controlled via cPanel Zone Editor on Regency's server — domain is
registered at GoDaddy but nameservers point to Regency's server.

**2FA:** Not mentioned for WordPress admin. cPanel may require password only.

**FlexMLS / IDX:** Active plugin. Do NOT touch any IDX search, listing, or
property pages. Only edit the pages listed in this doc.

---

## Strategy: Link-First, No iFrame Yet

For this immediate pass use direct `/value` links only. Do not embed an iframe
until the direct-link CTAs are confirmed working in production.

---

## Target Pages and CTA Specs

### 1. Homepage — home value / seller CTA area

**Before editing:** screenshot the current hero/CTA area.

**CTA URL:**
```
https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike
```

**Headline copy:**
> Ask Magic Mike what your Wilson-area home may be worth.

**Sub-copy:**
> Start with your address. Mike Eatmon will follow up with local guidance — not a generic internet guess.

**Button text:** `Start With Your Address →`

**Button style:** gold background (`#D4A017`), dark text (`#0A0A0A`), bold, same
radius/padding as existing site buttons. Opens in new tab (`target="_blank"`).

**Beaver Builder instructions:**
1. WP Admin → Pages → Home → Launch Beaver Builder
2. Find the hero or seller CTA row
3. Add or edit a Button module with the URL above
4. Add a Text/Heading module for the copy above
5. Save & Publish

---

### 2. Mike Eatmon Profile / Agent Bio Page

**Before editing:** screenshot the page.

**CTA URL:**
```
https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=mike_profile&utm_campaign=ask_magic_mike
```

**Headline copy:**
> Have a real estate question for Magic Mike?

**Sub-copy:**
> Ask about your home value, selling timeline, or what's happening in the Wilson market.

**Button text:** `Ask Magic Mike →`

**Placement:** Bottom of the bio section, above or below contact info.

---

### 3. Seller / "We Buy Homes" Page (if it exists)

**Before editing:** screenshot the page.

**CTA URL:**
```
https://www.askmagicmike.com/value?utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike
```

**Headline copy:**
> Thinking about selling but not sure where to start?

**Sub-copy:**
> Ask Magic Mike for local guidance before you make your next move.

**Button text:** `Get Local Guidance →`

---

## Post-Edit QA Checklist

For each page edited:
- [ ] Open the page in an incognito window (not logged in to WP)
- [ ] Click the CTA button
- [ ] Confirm it lands on `https://www.askmagicmike.com/value`
- [ ] Confirm UTM params are present in the URL bar
- [ ] Complete all 5 steps of the intake form as a test lead
- [ ] Confirm lead appears in `https://www.askmagicmike.com/admin`
  (requires `ADMIN_SECRET` — set a strong one before public traffic)
- [ ] Screenshot the final live page

---

## Optional: iFrame Embed (Park for Later)

Do not install until direct-link CTAs are confirmed working. When ready:

```html
<div style="border-radius:12px; overflow:hidden; border:1px solid rgba(212,160,23,0.2);">
  <iframe
    src="https://www.askmagicmike.com/embed/ask"
    width="100%"
    height="650"
    style="border:none; display:block; background:#0A0A0A;"
    loading="lazy"
    title="Ask Magic Mike — Home Value & Real Estate Guidance"
    allow="clipboard-write"
  ></iframe>
</div>
<p style="font-size:0.7rem; color:#888; text-align:center; margin-top:0.5rem;">
  Powered by <a href="https://www.askmagicmike.com" style="color:#888;">Ask Magic Mike</a>
  · Our Town Properties · Lic. #226434
</p>
```

The `/embed/ask` route is permitted to be framed by `ourtownproperties.com` and
subdomains via CSP `frame-ancestors`. `X-Frame-Options` is not set (intentionally
removed — modern browsers use CSP only).

---

## Compliance Notes

- Do NOT display automated valuation numbers publicly.
- Do NOT claim guaranteed home value.
- All CTA copy uses "local guidance" and "Mike will follow up."
- License number `#226434` appears only in trust/consent footers inside the app.
  Do not add the license number to WordPress CTA copy.
- Do not display MLS comps anywhere on the WordPress site linked to this tool.

---

## Remaining Blockers Before Public Traffic

1. **`ADMIN_SECRET` on Vercel** — currently weak (`changeme-replace-before-launch`).
   Set a strong random secret before sharing the `/admin` URL with anyone.
   Run in terminal: `! vercel env add ADMIN_SECRET production`

2. **WordPress login** — Brandon must log in directly. Credentials via email or
   1Password link. Regency/Scott cannot edit on our behalf without Mike's
   re-authorization.

3. **Test lead verification** — submit one test lead after install and confirm it
   appears in `/admin` with a score and routing assignment.
