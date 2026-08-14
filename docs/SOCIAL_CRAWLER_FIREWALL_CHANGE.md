# Social Crawler Firewall Change

## Proposed narrow hosting action

The evidence places the Facebook crawler `403` at hosting ModSecurity, upstream of WordPress. The cPanel account exposes only a broad enable/disable control, so no change was made.

Ask the hosting operator to identify the exact managed-rule ID triggered by a current `facebookexternalhit` request to only:

- `/ask-mike/`
- `/agents/mike-eatmon/`

After validating Meta-owned crawler IP/rDNS according to the host's supported procedure, add a path-and-rule-specific exception for public `GET`/`HEAD` requests. Do not bypass `/wp-admin`, `/wp-login.php`, form posts, REST writes, XML-RPC, or arbitrary user agents.

Rollback: remove the rule-specific exception, clear only the affected page cache if necessary, and rerun the crawler matrix.
