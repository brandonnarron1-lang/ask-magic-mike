# Ask Magic Mike / NellySelly System Isolation

Updated: 2026-08-11

## Enforced ownership boundary

Ask Magic Mike is linked only to:

- GitHub: `brandonnarron1-lang/ask-magic-mike`
- Vercel team/project: `eyes-up-industries/ask-magic-mike`
- Vercel project ID: `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`
- Neon organization: `org-royal-tooth-46065082` (`AskMagicMike`)
- Neon project: `bitter-star-20214385`
- Canonical hostname: `www.askmagicmike.com`

The current production deployment (`dpl_9Ypsne6ZdrcqgEqjf2ekENxeqKgm`) is owned
by the canonical Vercel project and carries both Ask Magic Mike domain aliases.
No NellySelly alias appears on that deployment.

NellySelly remains a separate product, Neon organization/project, Vercel project,
domain set, database, queue, and environment-variable set. Its identifiers are
forbidden from Ask Magic Mike deployable source and configuration.

## Automated controls

`pnpm release:gate` runs `pnpm amm:verify:isolation` automatically. It fails when:

1. the local Vercel link is not the canonical Ask Magic Mike project/team;
2. a NellySelly name or known organization identifier appears in deployable
   Ask Magic Mike code or public assets; or
3. the project link cannot be verified.

The release also tests that request-time persistence code performs no schema
DDL. Schema creation and policy changes are migration-only, preserving the
runtime database role's least privilege.

The runtime `service_role` receives only `SELECT`, `INSERT`, `UPDATE`, and
`DELETE` on `staff_push_subscriptions`; schema ownership and DDL remain with the
migration owner.

## Operator rules

- Never copy `DATABASE_URL` between Ask Magic Mike and NellySelly projects.
- Never add an Ask Magic Mike hostname to a NellySelly deployment, or vice versa.
- Never share push subscriptions, lead queues, CRM records, analytics property
  IDs, webhook signing secrets, or notification recipients between products.
- Compare Vercel project/team and Neon organization/project before changing any
  secret. Secret values must not be printed, copied into documentation, or sent
  in chat.
- Treat any future shared integration as denied until it has an explicit,
  reviewed tenant boundary and data-processing purpose.

## Verified state

- Runtime/config scan: no NellySelly identifiers found.
- Vercel environment listing was inspected by name/scope only; secret values
  were not read or printed. `DATABASE_URL` is production-scoped in the
  dedicated Ask Magic Mike project.
- Historical/documentation references are retained only to record the domain
  conflict and the isolation decision.
- Ask Magic Mike's push schema was applied only to Neon branch
  `br-flat-math-aut6n3xu` in project `bitter-star-20214385`.
- No NellySelly database, deployment, domain, or credential was changed.
