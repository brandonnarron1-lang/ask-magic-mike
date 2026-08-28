# Social Crawler 403 Root Cause

Canonical current evidence:
[FACEBOOK_CRAWLER_403_ROOT_CAUSE.md](./FACEBOOK_CRAWLER_403_ROOT_CAUSE.md).

The 2026-08-28 authenticated diagnosis supersedes the earlier hosting-WAF
hypothesis: a server-global Apache include assigns `facebookexternalhit` to
`bad_bots`, and `authz_core` denies that environment class. No ModSecurity rule
ID lookup remains.
