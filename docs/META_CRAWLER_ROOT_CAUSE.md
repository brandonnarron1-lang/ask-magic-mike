# Meta Crawler Root Cause — Historical Alias

The Phase 5 40/42 observation remains valid, but its unknown-ModSecurity-rule
hypothesis was superseded by authenticated Apache evidence on 2026-08-28.

Use the canonical current source:
[FACEBOOK_CRAWLER_403_ROOT_CAUSE.md](./FACEBOOK_CRAWLER_403_ROOT_CAUSE.md).

Exact cause: the server-global `pre_virtualhost_global.conf` maps
`facebookexternalhit` to `bad_bots`, then applies
`Require not env bad_bots`. No live correction has been applied.
