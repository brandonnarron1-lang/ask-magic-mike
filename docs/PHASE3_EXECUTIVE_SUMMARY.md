# Ask Magic Mike - Phase 3 Executive Summary

## Verified live

- Public Ask Magic Mike funnel and canonical Neon persistence.
- Our Town Home Value Form 3 bridge with durable storage, consent/attribution,
  scoring/routing, delivered internal email and hidden audit copy, idempotent
  replay, and suppressed QA consumer messaging.
- Zero live Neon prospects at the current audit; six suppressed test records;
  no unsuppressed tests, queue failures, unassigned live leads, or live duplicate
  suspicions.
- Hourly public synthetic monitor and hourly Vercel SLA cron are active.

## Phase 3 advancement

- Production reporting and Lead Center mutations now fail closed to Neon only.
- Named RBAC schema is accepted on isolated Neon Preview; Production remains on
  fail-closed Basic Auth pending verified roster and Preview authentication tests.
- Forms 1 and 6 were audited and correctly stopped before allowlisting because
  neither records explicit consent. Form 4 remains outside consumer routing.
- Web Push provider is ready; secure device labels are Preview-accepted; zero
  devices are enrolled and no Push was sent.
- The Lead Center subdomain boundary is implemented as a secure redirect to the
  one canonical admin surface; DNS and Vercel attachment remain unapplied.
- Facebook's crawler remains blocked by an upstream Our Town hosting rule. The
  exact narrow host-operator action is documented; AskMagicMike.com previews pass.

## Decisions required

1. Approve the verified administrator roster/role and securely complete Preview
   RBAC secrets/acceptance.
2. Approve unselected requested-response and optional-marketing consent language
   before Form 1 or Form 6 changes.
3. Apply the reviewed Production Push device-label migration/deploy, then enroll
   Brandon and Mike on their own physical devices.
4. Have the hosting operator apply the exact Facebook GET/HEAD public-path rule
   exception and have the DNS operator add only the Vercel-provided `hub` CNAME.

No paid media, carrier SMS, consumer QA message, new public marketing content,
or NellySelly integration is active.
