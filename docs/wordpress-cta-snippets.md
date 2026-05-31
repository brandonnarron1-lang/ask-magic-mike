# WordPress CTA Snippets — Ask Magic Mike

Paste these into WordPress using the **Custom HTML block** or your theme's page builder.
Replace `https://askmagicmike.com` with the live domain if it changes.

---

## 1. Homepage Hero CTA Button

Place on the homepage hero or banner area.

```html
<div style="text-align:center; margin: 2rem 0;">
  <a
    href="https://askmagicmike.com/value"
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

## 2. Mike Profile / Bio Page CTA

Place at the bottom of the Mike Eatmon agent profile page.

```html
<div style="background:#0A0A0A; border:1px solid rgba(212,160,23,0.25); border-radius:12px; padding:1.5rem 2rem; text-align:center; margin:2rem 0;">
  <p style="color:#D4A017; font-size:0.7rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; margin-bottom:0.5rem;">
    ✦ AI-Powered Local Guidance
  </p>
  <h3 style="color:#F5F0E8; font-size:1.4rem; font-weight:700; margin-bottom:0.5rem;">
    Ask Mike directly — anytime.
  </h3>
  <p style="color:#aaa; font-size:0.875rem; margin-bottom:1.25rem;">
    Get a real local take on your home's value, the Wilson NC market, or your next move.
  </p>
  <a
    href="https://askmagicmike.com/value"
    style="
      display:inline-block; background:#D4A017; color:#0A0A0A;
      font-weight:700; font-size:0.9rem; padding:0.75rem 2rem;
      border-radius:8px; text-decoration:none;
    "
  >
    Start With Your Address →
  </a>
  <p style="color:#555; font-size:0.7rem; margin-top:0.75rem;">
    Mike Eatmon · Our Town Properties · Lic. #226434 · Wilson, NC
  </p>
</div>
```

---

## 3. "We Buy Homes" / Seller Landing Page CTA

Place on any seller-focused page.

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
    href="https://askmagicmike.com/value"
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

---

## 4. Embedded Intake Form (optional — /embed/ask)

Drops the full intake form directly into any WordPress page.
Works in a Custom HTML block. Adjust height as needed (600px–700px recommended).

```html
<div style="border-radius:12px; overflow:hidden; border:1px solid rgba(212,160,23,0.2);">
  <iframe
    src="https://askmagicmike.com/embed/ask"
    width="100%"
    height="650"
    style="border:none; display:block; background:#0A0A0A;"
    loading="lazy"
    title="Ask Magic Mike — Home Value & Real Estate Guidance"
    allow="clipboard-write"
  ></iframe>
</div>
<p style="font-size:0.7rem; color:#888; text-align:center; margin-top:0.5rem;">
  Powered by <a href="https://askmagicmike.com" style="color:#888;">Ask Magic Mike</a> · Our Town Properties · Lic. #226434
</p>
```

**Pre-fill with seller chip:**
```
src="https://askmagicmike.com/embed/ask?chip=home_worth&q=What+is+my+home+worth+in+Wilson+NC"
```

**Pre-fill with buyer chip:**
```
src="https://askmagicmike.com/embed/ask?chip=what_can_afford"
```

---

## Notes

- `/value` — standalone campaign landing page, works as a direct link from any page or ad
- `/embed/ask` — lightweight iframe embed, no nav/footer, mobile-responsive
- Do not claim guaranteed valuations — all language uses "local guidance" and "Mike will follow up"
- License number #226434 appears only in trust/consent areas per compliance guidelines
