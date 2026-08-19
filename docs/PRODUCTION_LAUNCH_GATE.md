# Production Release Gate

Updated 2026-08-19. Ask Magic Mike is already live. This checklist governs each
new Production release; it is not a first-launch Supabase checklist.

## 1. Resolve the exact release

- [ ] Canonical repository is `brandonnarron1-lang/ask-magic-mike`.
- [ ] Base branch is current `main`; the PR is clean and mergeable.
- [ ] Head commit, PR, Vercel Preview deployment, and rollback deployment are
      recorded before approval.
- [ ] The Vercel target is project `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`.
- [ ] NellySelly identifiers are absent and `pnpm amm:verify:isolation` passes.

## 2. Prove the immutable candidate

- [ ] Node 24 release gate passes dependency install, release doctor, safety
      scan, full tests, strict typecheck, lint, production build, route manifest,
      release report, and launch-authority report.
- [ ] The matching Vercel Preview reports Ready.
- [ ] Public routes and any changed protected surfaces receive proportionate
      DOM/runtime or screenshot QA. Evidence must say when screenshot, provider,
      or device verification was not possible.
- [ ] No secret, recipient value, database URL, token, cookie, or private VAPID
      key appears in the diff, logs, screenshots, or artifacts.

## 3. Classify state changes

Check every applicable action separately:

- [ ] Code-only deployment
- [ ] Additive live database migration
- [ ] Environment-variable or provider change
- [ ] Live WordPress form/widget/page change
- [ ] DNS/domain mapping change
- [ ] Internal QA email or push
- [ ] Consumer acknowledgment, sequence, campaign, or publication
- [ ] Production lead import, merge, suppression, or deletion

An approval for one line does not authorize another. A code deployment never
implies a send, migration, device enrollment, provider purchase, or public post.

## 4. Database safety when SQL changes

- [ ] Target is canonical Neon project `bitter-star-20214385`, with Preview and
      Production branch identities confirmed without printing connection data.
- [ ] Migration is additive or has an explicit backup and rollback strategy.
- [ ] Migration passed transactionally on an isolated Neon Preview branch.
- [ ] Pre/post table, row-count, RLS/grant, and application-readiness assertions
      are recorded.
- [ ] Exact live-migration approval is obtained immediately before application.

No runtime or operator may silently use Supabase as a Production fallback.

## 5. Authorization and communications

- [ ] Anonymous `/admin` redirects to `/lead-center-login`; it does not return a
      Basic Auth challenge while Production RBAC is active.
- [ ] Better Auth configuration, RBAC schema, role checks, assigned-lead
      isolation, no-store policy, CSRF/same-origin controls, and audit actors pass.
- [ ] Internal notification tests remain unmistakably `[TEST]`, suppressed from
      KPIs, and use only approved recipients.
- [ ] Consumer email/SMS/sequence actions have affirmative purpose-specific
      permission, suppression checks, template/version evidence, and a separate
      approval.
- [ ] Marketing email has firm identity, valid postal address, and a working
      HTTPS unsubscribe path before provider delivery can be enabled.

## 6. Deployment approval

Immediately before merge and Production deployment, present:

1. PR and immutable head commit;
2. exact Production project and affected routes;
3. tests, Preview, and known limitations;
4. whether migrations, sends, env changes, or publications are excluded;
5. current rollback deployment; and
6. one release-specific approval phrase.

Never reuse an approval consumed by a prior release or apply a generic approval
to a PR created afterward.

## 7. Post-deploy proof

- [ ] `www.askmagicmike.com` and required public routes return expected content.
- [ ] Apex redirects 308 to the canonical `www` hostname.
- [ ] `/api/health/live` and `/api/health/ready` return 200 with Neon and required
      schema/provider readiness.
- [ ] Anonymous admin access redirects to the login route; an authorized operator
      can reach the intended protected surface.
- [ ] Vercel alias resolves to the just-approved commit and no error-level log
      regression appears during the observation window.
- [ ] Storage-before-delivery, test exclusion, outbox, retry, and dedupe behavior
      are rechecked when the release touches the lead or messaging path.
- [ ] `PRODUCTION_CHANGE_LOG.md` and current QA evidence are updated.

## 8. Rollback

For a code-only regression, restore the last verified Vercel deployment/alias and
confirm health plus canonical routes. Prefer a reviewed forward fix for additive
database changes; never drop lead, consent, notification, audit, RBAC, or session
tables to roll back application code. Revoke only affected sessions/devices or
pause only the affected channel when the incident is scoped.

The exact operating sequence is in `GO_LIVE_RUNBOOK.md`. Current external gates
are in `OWNER_APPROVAL_QUEUE.md`.
