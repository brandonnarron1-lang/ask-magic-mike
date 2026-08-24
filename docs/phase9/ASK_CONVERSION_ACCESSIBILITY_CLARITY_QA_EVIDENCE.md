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
