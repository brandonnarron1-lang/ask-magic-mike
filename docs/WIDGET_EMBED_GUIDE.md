# Widget Embed Guide

Reuse the existing versioned iframe/script surfaces:

- iframe: `https://www.askmagicmike.com/widget/v1`
- loader: `https://www.askmagicmike.com/widget.js`
- no-script/direct fallback: `https://www.askmagicmike.com/ask`

Prefer the iframe to isolate WordPress/IDX CSS. Use page-specific placement IDs,
not a global sitewide injection. Pass only approved public context such as
`placement_id`, page URL/title, source/referrer, campaign/UTMs, click IDs,
listing/property ID, and approved agent ID. Never place PII or secrets in the URL.

Initial placement IDs:

| Surface | Placement |
| --- | --- |
| Our Town homepage | `ourtown_homepage_ask_mike` |
| Home Value | `ourtown_home_value` |
| We Buy Houses | `ourtown_we_buy_houses` |
| Mike agent page | `ourtown_mike_agent` |
| Listing page | `ourtown_listing_detail` |
| Rental page | `ourtown_rental_to_buyer` |
| Open-house QR | `ourtown_open_house_qr` |

Production allows only exact Our Town origins. `postMessage` sender and receiver
must validate the exact origin and message shape. Test layout, keyboard flow,
consent, source attribution, performance, and fallback on each page before publish.
