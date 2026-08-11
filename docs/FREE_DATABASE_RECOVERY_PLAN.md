# Free Database Recovery Plan — 2026-08-10

## Decision

Adopt **Neon Free PostgreSQL** as the replacement production database when the
Supabase project cannot be restored without paying the outstanding balance.
Neon is the lowest-risk no-cost path because the canonical schema, migration
files, JSONB fields, UUIDs, transactional functions, and indexes are already
PostgreSQL. This preserves the one canonical lead database and avoids placing
consumer data in a spreadsheet, serverless filesystem, browser store, or
Git repository.

Official evidence at time of decision:

- [Neon pricing](https://neon.com/pricing): Free is $0, no credit card, 0.5 GB
  storage/project, 100 CU-hours/month/project, and pooled Postgres connections.
- [Neon serverless Postgres](https://neon.com/use-cases/serverless-apps):
  serverless connection pooling supports Vercel Functions.
- [Vercel Marketplace storage](https://vercel.com/docs/marketplace-storage):
  Neon is a supported Postgres integration and injects server-side credentials
  into the Vercel project.

## Rejected alternatives

| Option | Decision | Reason |
|---|---|---|
| Continue Supabase | Blocked | Project requires billing resolution; do not create debt or enter a payment method. |
| Cloudflare D1 | Not selected | It is a credible free SQLite service, but moving a Vercel/Postgres/RPC application to Workers/D1 is a larger same-day rewrite and adds a hosting boundary. |
| Turso | Not selected | SQLite dialect and migration differences add avoidable risk to the current PostgreSQL schema. |
| Vercel filesystem / Blob / Edge Config / Git | Rejected | Not a transactional canonical lead database and unsafe for PII. |
| Existing cPanel MySQL | Fallback only | May already be paid for, but external network access, backups, TLS, and role boundaries have not been verified. |

## No-cost implementation sequence

1. Create a Neon Free project in `us-east-1` using email sign-in (not Google
   SSO), with no paid-plan selection and no credit card.
2. Connect it to `eyes-up-industries/ask-magic-mike` using the Vercel
   Marketplace or add the server-only pooled `DATABASE_URL` in Vercel's secure
   environment interface. Do not paste it in chat or commit it.
3. Run the canonical PostgreSQL migrations into the empty Neon database, then
   run schema, index, function, RLS-equivalent server-boundary, and lead-capture
   contract checks.
4. Switch the canonical persistence adapter from Supabase PostgREST/RPC to the
   server-only Neon Postgres adapter. Preserve the API contracts, score,
   routing, outbox, idempotency, audit events, and notification records.
5. Keep public routes fail-closed until health checks pass. Do not import old
   Supabase lead data unless it can be exported lawfully and the owner approves
   the exact scope.
6. Configure email and the hidden audit BCC through Vercel secure variables;
   keep all external delivery disabled until controlled QA approval.

Neon does not provide Supabase's built-in `service_role`, `anon`, or
`authenticated` roles. After the canonical lifecycle migration, apply
`scripts/neon/service-role-compatibility.sql` using the owner role. Create or
rotate the service-role password only in Neon's secure interface, then store the
pooled URL only as Vercel's Sensitive `DATABASE_URL`. The script contains no
credential and grants no schema-creation capability.

## Current handoff

The owner-created Neon project contains an isolated preview branch named
`amm-lead-pipe-preview`; the canonical migrations were applied there on
2026-08-11. Its production branch has not been migrated.

To continue the preview deployment without disclosing a secret in chat:

1. In the open Neon **Connect to your branch** dialog, click **Copy snippet**.
2. In Vercel, open **ask-magic-mike → Settings → Environment Variables → Add
   Environment Variable**.
3. Set key `DATABASE_URL`, leave **Sensitive** enabled, select **Preview only**,
   paste into the value field, and save. Do not add Production.
4. Reply `TAKEOVER DONE`.

Do not add SMTP, BCC, or consumer-messaging values in this handoff. Those remain
separate controlled delivery gates.

## Rollback

The existing public production deployment remains untouched. A Neon candidate
will first be deployed as a preview. Production promotion is reversible by
promoting the prior Vercel deployment, and no Supabase data will be deleted.
