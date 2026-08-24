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
facts it can prove. An immutable Vercel Preview must still pass responsive,
focus-visible, console, overflow, and no-write acceptance before this candidate
can receive a valid release gate.

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
