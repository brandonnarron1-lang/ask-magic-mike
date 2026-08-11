# Live Triage — 2026-08-10

Audit timestamp: 2026-08-10 16:29–16:34 EDT. All checks below were read-only.
No DNS, Vercel, WordPress, database, form, or email mutation was performed.

## Domain and route evidence

| URL/check | Result |
|---|---|
| `https://askmagicmike.com/` | HTTP 308 to `https://www.askmagicmike.com/` |
| `https://www.askmagicmike.com/` | HTTP 200, Vercel, Ask Magic Mike title |
| `https://www.askmagicmike.com/ask` | HTTP 200 |
| `https://www.askmagicmike.com/sell` | HTTP 200 |
| `https://www.askmagicmike.com/value` | HTTP 200 |
| `https://www.askmagicmike.com/buy` | HTTP 404 |
| `https://www.askmagicmike.com/embed/ask` | HTTP 200 |
| `https://www.askmagicmike.com/widget.js` | HTTP 200 JavaScript |
| `https://www.askmagicmike.com/widget/v1` | HTTP 404 |
| `https://www.askmagicmike.com/robots.txt` | HTTP 404 |
| `https://www.askmagicmike.com/sitemap.xml` | HTTP 404 |
| `https://www.askmagicmike.com/admin` | HTTP 401 with Basic Auth challenge |
| `https://www.askmagicmike.com/api/health/live` | HTTP 404 on active root router |
| `https://www.askmagicmike.com/api/leads` | HTTP 405 to read-only GET, consistent with POST-only handler |
| NellySelly marker in Ask root HTML | Not found |

The live HTML references deployment `dpl_FvdnTNjTvzPYu4JsJ49NSDZxXLUj`. Vercel
inspection reports it as `READY`, production, created 2026-07-13, with aliases:
`www.askmagicmike.com`, `askmagicmike.com`, `ask-magic-mike.vercel.app`, and the
project's Git aliases. The reported 402 is not reproducible at this audit time.

## DNS and mail evidence

- `askmagicmike.com` A records: `216.150.1.129`, `216.150.1.65`.
- `www.askmagicmike.com` A records: `216.150.1.129`, `216.150.1.193`.
- `ourtownproperties.com` A record: `69.16.209.191`.
- `www.ourtownproperties.com` CNAMEs to `ourtownproperties.com`.
- `ourtownproperties.com` MX: `mx1.emailsrvr.com`, `mx2.emailsrvr.com`.
- Our Town SPF includes `emailsrvr.com` and the hosting IPs; DMARC is `p=reject`.
- No MX, SPF TXT, or DMARC record was returned for `askmagicmike.com`.

This means the email sender must use a verified aligned brokerage/provider domain;
do not invent an Ask Magic Mike mailbox or change DNS in this task.

## WordPress evidence

The public Our Town page is HTTP 200, canonical `https://www.ourtownproperties.com/`,
and currently exposes `252-243-7700` and `252-243-7867`. It includes Beaver Builder,
FlexMLS/IDX, Gravity Forms, `ask-magic-mike-connector`, and `ask-magic-mike` assets.
The observed live number is retained; the older `252-245-4337` reference is not
propagated into new public copy.

No authenticated WP Admin session was entered. Page IDs, form IDs, notification
rules, entries-before-email behavior, active plugin versions, and current webhook
destinations remain owner/admin checks.

## Vercel evidence

The authenticated Vercel CLI account is `askmagicmike-6186`, team `EyesUpIndustries`.
Project `ask-magic-mike` is Next.js with root directory `.` and project ID
`prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`. Production env names include Supabase public
values and `RESEND_API_KEY`/`RESEND_FROM`, but the inspection did not show production
`SUPABASE_SERVICE_ROLE_KEY`, production notification enablement, or BCC/recipient
variables. Values were not retrieved or printed.

## Exact blockers

1. A production deployment is required to publish the repaired root routes; approval
   is required before deploy.
2. Owner must enter/approve production secure env values for database service role,
   notification recipient/BCC, sender identity, and provider gates; values must not
   be supplied in chat.
3. The live Supabase project/migration state cannot be verified without using its
   authenticated dashboard or server-side deployment environment. No live
   migration was run.
4. WordPress page/form configuration and any plugin activation require takeover or
   explicit approval before changing the live site.
