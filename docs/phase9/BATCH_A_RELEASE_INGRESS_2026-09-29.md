# Batch A — release truth and public ingress

Status: `VERIFIED_NOT_PRODUCTION`

This current-main consolidation replaces the unique application work from
historical Draft PRs #249–#252, #265–#266, and #268–#271. It ports bounded
capabilities onto the verified PR #247 Production base without merging the old
stacked branch ancestry.

## Scope

- release authority and authenticated Vercel environment-name inspection;
- protected-Preview QA through the Vercel CLI without disabling Deployment
  Protection or exposing request headers and bodies in process arguments;
- exact-origin, JSON-only, byte-bounded appointment, chat, event, experiment,
  and lead ingress;
- fail-closed durable rate limiting, with one explicit emergency-memory flag;
- deterministic lead idempotency, server-owned scoring and routing, protected
  field rejection, and truthful post-commit failure reporting;
- channel-specific consent evidence and a forced-off SMS permission where the
  current public copy does not contain standalone SMS opt-in language;
- server-owned experiment conversions after canonical lead persistence;
- public analytics allowlists and PII-minimized properties;
- patched Next.js, Sharp, Browserslist, Nodemailer, js-yaml, and Vitest floors.

## Explicit exclusions

- no database migration or Production data mutation;
- no environment value or secret change;
- no email, SMS, push, or consumer acknowledgment send;
- no SMTP, Resend, OpenAI, analytics, or messaging-provider activation;
- no WordPress form, plugin, page, CTA, or notification change;
- no DNS, domain, Vercel Production, Neon, NellySelly, or paid-service change;
- no publication of owned traffic or external marketing content.

The public AI route remains gated by its existing server-only key and explicit
feature flag. Shipping this application batch does not enable the provider or
authorize spend.

## Verification

- Node.js 24.18.0 and pnpm 10.30.3 were used for counted verification.
- the package audit reports zero known vulnerabilities;
- 20 focused files / 380 tests passed across lead, consent, idempotency,
  experiment, chat, appointment, analytics, Preview, release-authority, and
  dependency-floor contracts;
- strict TypeScript passed;
- no migration file exists in the branch diff;
- no candidate credential was added.

The complete release gate, protected no-write Preview, and immutable rollback
receipt must pass before this Draft can be considered for release. Exact totals
and hosted evidence must be recorded against the final candidate commit.

## Rollback

No schema change exists. Re-alias the immediately prior Vercel Production
deployment (`dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U`) and verify `/api/health/live`,
`/api/health/ready`, canonical redirects, authentication boundaries, and the
public no-write smoke set. The pre-PR247 fallback remains
`dpl_61ZVKAYFKZdMYvcVprU1UrL1EvGe` only for a separately approved deeper
rollback.

## Future release gate

`APPROVE PHASE 9 BATCH A RELEASE TRUTH AND PUBLIC INGRESS MERGE AND SAME-TREE PRODUCTION DEPLOYMENT`

That phrase authorizes only the reviewed application release. It does not
authorize environment or secret changes, provider activation, database writes,
WordPress publication, traffic publication, or any outbound message.
