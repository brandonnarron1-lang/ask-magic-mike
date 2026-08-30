# Social Crawler Firewall Change

This compatibility filename now points to the canonical, current change
contract:

- [Facebook crawler Apache change sheet](./FACEBOOK_CRAWLER_FIREWALL_CHANGE.md)
- [Exact root cause](./FACEBOOK_CRAWLER_403_ROOT_CAUSE.md)

Current result: the exact denial is a server-global Apache
`facebookexternalhit -> bad_bots` classification followed by
`Require not env bad_bots`. It is not an unidentified ModSecurity rule, and no
live change has been applied.
