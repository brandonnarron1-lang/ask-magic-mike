# Analytics and attribution status

Status: `LIVE_PRODUCTION`

The canonical lead/event model preserves first touch, last touch, source URL,
referrer, UTM values, click IDs, placement, session, consent evidence, and
server-authoritative outcome events. Public analytics boundaries minimize PII,
reject internal/canonical outcome forgery, and keep test records out of trusted
KPIs.

## Live foundation

- first-party public event endpoint and canonical event ledger;
- page/funnel/widget/contact/appointment event vocabulary;
- source and placement rollups in protected reporting;
- conversion identity tied to canonical lead/session IDs server-side;
- internal/test exclusion and automated-browser protections;
- owned-demand asset and publication packets that do not publish themselves.

## Pending hardening

Batch A must consolidate the newer public event, lead, appointment, chat,
session, and experiment ingress boundaries from PRs #265–#271. Evidence must be
regenerated from fresh main.

Cross-domain GA4/GTM activation remains `BLOCKED_HUMAN`: the known WordPress
tag-before-consent ordering must be repaired and the authenticated GA4/GTM
configuration verified before external cross-domain tags are enabled. No raw
lead data may enter analytics parameters.

No GBP, social, email-signature, QR, paid-media, or vendor publication is live
merely because a tagged asset or packet exists.
