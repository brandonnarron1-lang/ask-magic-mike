# Lead Center Subdomain Decision

Decision: **NOT REQUIRED — CANONICAL `/admin` IS SUFFICIENT**.

`https://www.askmagicmike.com/admin` already provides the shortest safe path to
the authenticated Lead Center, enforces server-side RBAC, redirects anonymous
users to login, and is covered by current monitoring and rollback procedures.

Adding `hub.ourtownproperties.com` would introduce DNS, TLS, cookie-origin,
domain-mapping, monitoring, and rollback work without improving authorization,
lead routing, delivery, or first-response time. Host-bound redirect code remains
available for a future operator-convenience decision, but no DNS or Vercel domain
change is justified in Phase 5. Public DNS currently has no
`hub.ourtownproperties.com` record; that is consistent with this decision, not a
production outage.

The preserved implementation and rollback references are
`LEAD_CENTER_SUBDOMAIN_CHANGE.md` and `LEAD_CENTER_SUBDOMAIN_ROLLBACK.md`.
