# Lead Center Subdomain Rollback

1. Remove only the `hub` CNAME from the Our Town DNS zone.
2. Remove only `hub.ourtownproperties.com` from the canonical Vercel project.
3. Leave AskMagicMike.com, its production deployment, database, mail records,
   and all other Our Town DNS records unchanged.
4. Verify `hub.ourtownproperties.com` no longer resolves and
   `https://www.askmagicmike.com/admin` still enforces the current authentication
   model.

The host-specific redirect code is inert when the DNS/domain mapping is absent
and may remain for a fast recoverable reattachment.
