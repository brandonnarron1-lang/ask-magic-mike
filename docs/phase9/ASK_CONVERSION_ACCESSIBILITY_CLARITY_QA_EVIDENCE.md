# Phase 9 Ask conversion clarity and keyboard access QA evidence

Date: 2026-08-23

Production mutation: none

## Baseline

The current public `/ask` route was inspected without typing or submitting a
question. It returned its route-specific title, one main landmark, the current
Black Diamond header and Ask card, and no framework-error state. DOM evidence
showed no skip link and product-centric `interface` language.

## Focused contracts

Node 24.18.0:

```text
pnpm exec vitest run \
  tests/public/ask-conversion-accessibility.test.tsx \
  tests/public/public-ux-visual-completion.test.ts \
  tests/public/home-value-inline-validation.test.tsx

3 files / 11 tests PASS
```

The contracts prove:

- the skip link is the first shared-header control;
- it retains `href="#page-content"`;
- activation moves focus to the programmatic content target;
- all 12 shared-header source surfaces have one named focus destination;
- the Ask question has a visible associated required label;
- type, name, required, maximum length, autocomplete, mobile enter hint, and
  description semantics are present;
- the client maximum matches the existing API's 2,000-character boundary;
- the consumer headings no longer use `advisor interface` language; and
- established home-value validation remains intact.

## Full local release evidence

Exact Node 24.18.0:

- Vitest: 231 files / 3,065 tests PASS;
- strict TypeScript: PASS;
- ESLint: PASS;
- optimized Next.js 15.5.21 build: PASS, 52 static pages generated;
- active route proof: PASS, 83 active / 17 acknowledged duplicates;
- release safety: PASS, 14/14;
- Ask Magic Mike / NellySelly isolation: PASS; and
- `pnpm audit --prod --audit-level high`: PASS, no known vulnerability;
- `gitleaks git --redact --no-banner --log-opts='--all'`: PASS, 574 commits /
  approximately 14.89 MB / no leaks; and
- `git diff --check`: PASS.

## Rendered evidence limit

Current in-app screenshot capture timed out on the target routes and on a
neutral control page. The run therefore accepts no screenshot and makes no
responsive-visual or full-WCAG claim. DOM evidence is used only for the narrow
facts it can prove. The immutable Preview acceptance below closes the narrow
focus, geometry, console, validation, and no-write contracts; screenshot-level
visual acceptance remains explicitly unresolved.

## Immutable Preview acceptance — 2026-08-24

The candidate was rechecked at commit
`af22494d96bc3fe1ec930a24f350e4b3e863fe2f` on the protected immutable Preview:

```text
https://ask-magic-mike-nmcmoa5mh-eyes-up-industries.vercel.app/ask
```

The authenticated in-app browser confirmed:

- the route title is `Ask a Wilson, NC Real Estate Question | Ask Magic Mike`;
- the skip link is the first interactive control and points to
  `#page-content`;
- when focused, the skip link is fixed inside the viewport at `16px, 16px`,
  has a 46px rendered height, a 2px cyan outline, and an additional cyan focus
  shadow;
- activating the skip control moves focus to `section#page-content`, whose
  `tabindex` is `-1`;
- the question control exposes its required label, help-text relationship, and
  2,000-character maximum;
- an empty submit is rejected by native validation, focuses the question
  control, and creates no `/api/*` resource request;
- at a 390x844 viewport, desktop navigation is hidden, the question and submit
  controls remain fully inside the viewport, and document width does not
  overflow the viewport; and
- the inspected Preview tab emitted no warning- or error-level console entry.

The Preview is protected as intended: an unauthenticated header check redirects
to Vercel SSO, while the authenticated in-app session renders the candidate.

Fresh screenshot capture was attempted again at desktop and mobile sizes. The
integrated capture path timed out and the operating-system fallback returned an
unusable black frame from the virtual browser surface. Those files are rejected
as evidence and are not committed. This acceptance therefore closes the DOM,
keyboard-target, mobile-geometry, validation, console, and no-write checks, but
it deliberately does **not** claim screenshot-level visual acceptance or full
accessibility conformance.

Fresh local checks on the unchanged candidate:

```text
pnpm exec vitest run tests/public/ask-conversion-accessibility.test.tsx
  1 file / 3 tests PASS
pnpm run typecheck
  PASS
pnpm run lint
  PASS
pnpm run build
  PASS — Next.js 15.5.21, 52 static pages
pnpm run release:safety
  PASS — 14/14
```

The local shell reported Node 26.5.1 against the repository's Node 24.x engine
declaration. The exact-commit GitHub release gate remains green on Node 24, so
the local engine warning is recorded rather than treated as release evidence.

## No-action record

- no Production/Preview database read or write;
- no migration;
- no lead or test lead;
- no analytics or experiment event;
- no AI/provider request;
- no email/BCC, SMS, Push, or acknowledgment;
- no WordPress edit or publication;
- no DNS, domain, secret, billing, spend, deletion, or NellySelly action; and
- no merge or Production deployment.

## Runtime skip-focus correction — 2026-08-24

The signed-in browser loaded refreshed exact-head Preview commit
`1b7eccafe13882b282b8fae98c93f534b5a967bc` and confirmed the intended title,
consumer copy, first-position skip link, `#page-content` target, required
question label, help relationship, 2,000-character maximum, no framework
overlay, no NellySelly identity, and an empty console log. No field was typed
and no request was submitted.

That same locator/CUA runtime check did not retain focus on
`section#page-content` after activation. A follow-up CUA attempt also could not
move initial body focus with Tab, so this is not accepted as definitive browser
behavior. It is a release-blocking evidence ambiguity that the component unit
test alone could not resolve.

- Preserved the affected head at remote rescue branch
  `rescue/amm-pr211-pre-runtime-skip-focus-20260824-0418`.
- Added a deferred, connected-target refocus after the existing synchronous
  focus call so browser activation finalization cannot strand focus on the
  skip control.
- Extended the focused test to model a browser restoring anchor focus and then
  prove the deferred callback returns focus to the content target.
- Focused verification passes 2 files / 10 tests with no warning, strict
  typecheck passes, targeted ESLint passes, and the staged secret scan is clean.
- Preserved the next exact head at
  `rescue/amm-pr211-pre-runtime-e2e-proof-20260824-0426` before extending the
  already executed protected-Preview browser file.
- Added an intercepted Chromium Tab/Enter contract that loads `/ask`, blocks
  all applicable analytics/event endpoints, proves the skip control receives
  first focus, activates it, and proves `#page-content` receives focus.
- Local Playwright now passes 3/3 tests in that no-write file: two existing
  intercepted widget paths plus the new keyboard-focus path.

The former Preview and protected no-write run are historical diagnostic
evidence only. Fresh full Node 24, immutable Preview, and protected no-write
Playwright proof are required for the corrected exact head. Integrated
signed-browser focus output remains non-authoritative because that control path
could not perform a reliable first Tab.

## Refreshed stack evidence boundary — 2026-08-24

- Preserved pre-refresh PR #211 head
  `d529b553d6d822c50c398b10fec25f0d90b9ba38` at remote rescue branch
  `rescue/amm-pr211-pre-pr210-refresh-20260824-0405`.
- Merged exact refreshed PR #210 head
  `5b884d5eca43fb4dcd1111c59c78a85c54698db1`, which contains sealed PR #209
  candidate `6eb89264d59c8d25a711a1ffa178828343772f75` once.
- Merge simulation and the actual merge found no accessibility application-file
  conflict. The sole conflict was additive release history in
  `docs/CHANGELOG.md`; all records were retained.
- Earlier CI, Preview, keyboard, mobile-geometry, and console evidence above is
  valid historical evidence for the former head only. Fresh exact-head proof is
  mandatory for the refreshed candidate.
- No Production environment, merge, deployment, database/lead/event write,
  AI/provider request, message, WordPress edit, DNS change, publication, spend,
  deletion, or NellySelly action occurred.

## Final parent authority refresh — 2026-08-24

- Preserved the prior stacked head at
  `rescue/amm-pr211-pre-final-pr210-refresh-20260824-0529`.
- Merged current PR #210 parent
  `3704cbf78bfd7361435987943854159b22978532`, which contains current PR #209
  parent `d0691a6938afa67c22c4e1bc0adc322963fa2d55` once.
- The parent delta is governance documentation plus release-authority tests. It
  has no overlap with the Ask copy, required-input, skip-link, focus, or E2E
  implementation.
- A new exact PR #211 head must repeat CI and protected Preview proof. The
  current head is resolved from GitHub and sealed in PR evidence rather than
  hard-coded into this mutable file.
- No Production environment, merge, deployment, database/lead/event write,
  AI/provider request, message, WordPress edit, DNS change, publication, spend,
  deletion, or NellySelly action occurred.

## Release-ledger parent refresh — 2026-08-24

- Preserved prior PR #211 head
  `2cb2689d007c7a381879d7eb29f5196785ccd223` at remote rescue branch
  `rescue/amm-pr211-pre-pr210-ledger-sync-20260824-0632`.
- Merged exact clean PR #210 head
  `7aad6b88cd3f34dab7fc9db94fd6ddfb34a1bfa9`, which contains the exact sealed
  PR #209 parent and its completed-release authority repair once.
- Conflicts were limited to additive changelog and QA history. Resolution
  retains the Ask copy, required-input semantics, skip-link focus behavior,
  canonical redirects, monitoring contracts, and completed-release ledger.
- Former PR #211 CI, Preview, keyboard, geometry, and console evidence is now
  historical. The refreshed exact head must repeat full Node 24, protected
  no-write Preview, and three-test Chromium keyboard acceptance.
- No Production environment, merge, deployment, database/lead/event write,
  AI/provider request, message, WordPress edit, DNS change, publication, spend,
  deletion, or NellySelly action occurred.

## Final PR #210 cutover-hygiene refresh — 2026-08-24

- Preserved prior PR #211 head
  `6eacc33d16e34897c97288e48cd736433a3d9e15` at remote rescue branch
  `rescue/amm-pr211-pre-final-pr210-cutover-hygiene-20260824-164445`.
- Merged exact final PR #210 head
  `3ed8d050edd386aa0cd4a83d230ff3170d24a306`, retaining the final PR #209
  cutover preflight, browser no-write hardening, canonical alias redirects, and
  Production monitor contracts once.
- Conflicts were limited to additive changelogs and the release-authority
  documentation test. Resolution retains the Ask copy, required-input
  semantics, shared skip-link focus behavior, and every upstream safety
  contract.
- Earlier CI, Preview, and browser evidence remains historical. The resulting
  exact head must repeat full Node 24 verification, immutable Preview proof,
  the three-test protected Chromium acceptance, and a zero-mutation runtime
  log review before this candidate is sealed.
- No Production environment, merge, deployment, database/lead/event write,
  AI/provider request, message, WordPress edit, DNS change, publication, spend,
  deletion, or NellySelly action occurred.

## Exact sealed PR #210 refresh — 2026-08-28

- Revalidated accepted Production at PR #209 merge
  `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`, deployment
  `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`, with every durable limiter readiness
  boolean true.
- Preserved prior PR #211 head
  `5d566a4a14d4a7cb67175683fdf099e8d62747b7` at remote rescue branch
  `rescue/amm-pr211-pre-pr210-exact-seal-20260828-213129`.
- Merged exact sealed PR #210 head
  `93af400494a94a8d8aedb09ece16bbff4dfd214b` without force push. The only
  conflicts were additive changelog, implementation-status, and executable
  release-authority records; no application file overlapped PR #210's redirect
  implementation.
- Retained the accepted PR #209 ledger, PR #210 canonical redirects and monitor
  contracts, and PR #211 Ask copy, required semantics, shared skip-link focus,
  and three-test browser contract once.
- Former PR #211 CI, Preview, and browser evidence is historical. Fresh exact-
  head Node 24, immutable Preview identity, protected no-write QA, three-test
  Chromium acceptance, and deployment-log review remain mandatory after push.
- No Production environment, merge, deployment, database/lead/event write,
  AI/provider request, notification, WordPress edit, DNS change, publication,
  spend, deletion, or NellySelly action occurred.
