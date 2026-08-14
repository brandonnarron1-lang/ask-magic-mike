# Lead Center Subdomain Change

Status: **CODE READY / DNS AND VERCEL DOMAIN NOT APPLIED**.

Current evidence:

- `hub.ourtownproperties.com` has no A or CNAME response.
- It is not attached to the canonical Vercel project.
- The canonical project is `eyes-up-industries/ask-magic-mike`
  (`prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`).
- The staged application boundary redirects the exact hub host to
  `https://www.askmagicmike.com/admin` with HTTP 307, strips the incoming path
  and query, sets `no-referrer`, `no-store`, and `noindex`, and never creates a
  second Lead Center or database.

## Exact controlled sequence

1. Deploy the reviewed host-boundary code after the current PR passes.
2. In Vercel project Domains, add only `hub.ourtownproperties.com`.
3. Copy the exact CNAME target Vercel displays for this domain. Vercel now may
   return a project-specific `*.vercel-dns-###.com` value, so do not hard-code a
   legacy target before the domain is attached.
4. In the Our Town DNS zone, create exactly one record:
   - Type: `CNAME`
   - Name/Host: `hub`
   - Target: the exact value from step 3
   - TTL: provider default or 300 seconds for cutover
5. Do not edit apex, `www`, MX, SPF, DKIM, DMARC, verification TXT, or another
   subdomain.
6. Verify Vercel domain status, DNS, TLS, 307 destination, anonymous denial at
   the canonical `/admin`, and `X-Robots-Tag`/Referrer-Policy behavior.

The DNS operator is the only remaining dependency. No subdomain record or
domain mapping was changed during this phase.
