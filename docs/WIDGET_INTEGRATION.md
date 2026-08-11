# Widget Integration

## Versioned public surface

- Iframe/widget page: `https://www.askmagicmike.com/widget/v1`
- Script loader: `https://www.askmagicmike.com/widget.js`
- Direct fallback: `https://www.askmagicmike.com/ask`

The iframe route is isolated from WordPress CSS. It accepts `placement_id`, source
domain, parent URL/title, referrer, listing/property and approved agent IDs,
campaign/UTMs, click IDs, and a session context. The browser receives no secrets.

## Origin policy

Only `https://ourtownproperties.com`, `https://www.ourtownproperties.com`, and
their explicitly approved subdomains are trusted parents in production. `postMessage`
uses the exact validated parent origin; inbound message handling must validate both
origin and payload shape. Unknown origins fall back to the direct Ask Magic Mike
link.

## Placements

Prepare (do not publish without approval) page-specific placements for the Our Town
homepage, home-value page, seller/We Buy Houses page, Mike profile, listing/property
pages, rental pages, and open-house QR pages. Use stable labels such as
`ourtown_homepage_ask_mike`, `ourtown_home_value`, and `ourtown_open_house_qr`.

Every placement includes `Not an appraisal.` near the form and sends tagged
attribution into the canonical API. Sitewide injection is not activated blindly.
