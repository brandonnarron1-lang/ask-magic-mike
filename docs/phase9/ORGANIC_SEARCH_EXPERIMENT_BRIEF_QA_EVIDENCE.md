# Organic search experiment brief — decision and QA evidence

Date: 2026-08-29
Branch: `codex/phase9-organic-experiment-brief-20260828`
Parent: exact sealed PR 230 head `883ddec3f8b3796ba8be3fe41e5cd326e1a16d`
State: downstream Draft release candidate; no Production authority

## Executive decision

The existing system already has:

- privacy-minimized Search Console page CSV validation;
- canonical owned-domain and report-identity checks;
- explainable page-level signal and opportunity scoring;
- atomic, idempotent Neon persistence behind explicit authority;
- a protected Growth Command Center decision packet; and
- a separate social/owned-demand draft queue.

It did **not** turn an organic page opportunity into the bounded experiment that its own next-decision text requested. The missing layer was a reviewable bridge between “this page has a directional gap” and “here is the one safe experiment an operator can investigate.” Creating another importer, dashboard, content database, CMS, AI writer, or publishing path would duplicate or weaken the canonical architecture.

This candidate adds one pure deterministic builder and renders its output inside the existing protected organic-search workbench. It does not change the CSV contract, row or batch fingerprints, database serializer, schema, migrations, canonical opportunity records, public routes, WordPress, providers, credentials, or Production.

## Current official platform research

Primary sources reviewed on 2026-08-28:

1. [Google — Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) says content should serve an existing audience, demonstrate first-hand expertise, clearly identify who created it, avoid exaggerated headings, and avoid extensive search-first automation.
2. [Google — Control your snippets in search results](https://developers.google.com/search/docs/appearance/snippet) explains that snippets are primarily generated from page content and may use a page-specific meta description when it better represents the page.
3. [Google — Performance report dimensions and data groupings](https://support.google.com/webmasters/answer/17011259) documents anonymized-query omissions, row truncation, canonical URL aggregation, and high-impression/low-CTR review as an opportunity—not a guarantee.
4. [Google — Crawling and indexing](https://developers.google.com/search/docs/crawling-indexing) identifies crawlable links, valid metadata, redirects, canonical handling, and A/B testing impact as separate technical controls.

Implementation consequences:

- page metrics are directional evidence, not causal or exhaustive truth;
- the system must not infer exact query intent because raw query text is intentionally not retained;
- one existing canonical page is reviewed before any new page is proposed;
- owner-supplied facts, human authorship/review, and the live page are required inputs;
- the brief uses people-first usefulness and qualified outcomes, not ranking promises;
- title, heading, opening answer, description, internal links, canonical behavior, accessibility, and conversion integrity are reviewed together but changed as one bounded experiment;
- no AI or programmatic public copy is produced from insufficient evidence.

## Implemented capability

For each validated scored owned-page row, the pure builder produces:

- immutable brief version and deterministic key;
- exact owned page URL and page-specific consumer task prompt;
- opportunity type, score, confidence, observation window, impressions, clicks, CTR, average position, and internal review threshold;
- type-specific objective, hypothesis, single-change scope, primary metric, baseline, and decision rule;
- explicit owner inputs that remain missing;
- ordered review steps;
- qualified-lead, appointment, accessibility, mobile, analytics, and canonical diagnostics;
- a minimum evidence and comparable-window measurement plan;
- real-estate, privacy, Fair Housing, SEO, data-integrity, and conversion guardrails;
- stop/revert/escalation conditions;
- a plain authority statement; and
- copyable Markdown plus links to official guidance.

Only the top 25 scored briefs render at once to keep a large 1,000-row import review usable. Every brief is collapsed by default and ordered by deterministic opportunity score, then page URL.

## Fail-closed boundaries

The builder returns no brief when:

- no explainable opportunity fired;
- the URL is not HTTPS on the exact Ask Magic Mike or Our Town Properties allowlist;
- the URL contains credentials, query parameters, or a fragment;
- the normalized URL path and row path disagree;
- the row fingerprint is malformed;
- dates are invalid or reversed;
- clicks exceed impressions;
- metrics or confidence are non-finite or outside the bounded contract; or
- the opportunity type is unknown.

The output contains no:

- raw query text;
- raw CSV;
- consumer PII;
- private MLS remarks;
- provider payload;
- AI/provider call;
- live-page fetch;
- database write;
- campaign, message, spend, redirect, deployment, or publication authority.

## Authority and release boundary

This candidate is read-only application code. It can be tested and deployed to an immutable protected Preview without a Production action. PR 209 and its durable-rate-limit gate are already accepted in canonical Production at `a0a0aea8dd7746dbed7b25b45ad72f2884e6a0ca`; that consumed approval cannot be reused.

PR 210 remains the first pending application candidate. PR 230 is the exact sealed parent of this candidate, and its future application gate remains:

```text
APPROVE PHASE 9 CAPABILITY AUTHORITY LEDGER MERGE AND PRODUCTION DEPLOYMENT
```

That PR 230 gate is not requestable until PR 210 and every predecessor are accepted and PR 230 is refreshed on the resulting exact sealed head. PR 231 cannot leapfrog it. PR 231's own future application gate is:

```text
APPROVE PHASE 9 ORGANIC PAGE EXPERIMENT BRIEFS MERGE AND PRODUCTION DEPLOYMENT
```

That PR 231 gate is not requestable until PR 230 is accepted and this candidate is refreshed, reverified, and resealed on the resulting exact parent. Even after application release, an experiment brief is not authority to edit or publish WordPress. The current independent WordPress action remains the separately reviewed basic-consent bridge 1.2.0 installation, legacy GTM removal, and controlled runtime QA gate. Any later page-specific publication request must identify the reviewed page, exact change, rollback, Preview evidence, measurement window, and one approval.

## Rollback

Rollback is application-only:

1. revert the candidate commit or omit this downstream Draft PR from the ordered train;
2. redeploy the prior known-good application commit through the normal release process;
3. verify the organic-search workbench still validates and imports under the unchanged existing contract.

No database rollback, data repair, WordPress rollback, provider change, DNS action, or secret change is required because this candidate introduces none.

## Verification record

Local verification ran with Node 24.18.0 and the repository-pinned pnpm dependency tree:

```text
pnpm exec vitest run \
  tests/adminops/organic-search-experiment-brief.test.ts \
  tests/adminops/organic-search-ingress.test.ts \
  tests/adminops/growth-capability-ledger.test.ts
pnpm exec eslint \
  app/lib/growth/organic-search-experiment-brief.ts \
  app/admin/growth/search-ingress/organic-search-ingress-workbench.tsx \
  app/lib/growth/capability-ledger.ts \
  tests/adminops/organic-search-experiment-brief.test.ts \
  tests/adminops/growth-capability-ledger.test.ts \
  tests/e2e/organic-search-ingress-preview.spec.ts
pnpm exec playwright test tests/e2e/organic-search-ingress-preview.spec.ts
pnpm run release:gate
pnpm audit --prod
git diff --check
```

Results before sealing:

- focused organic-search and capability coverage: 3 files / 17 tests passed;
- protected local browser acceptance: desktop and mobile, 2/2 passed;
- system isolation: passed; deployable source contains no NellySelly project identifier;
- release safety: 14/14 passed;
- full Vitest suite: 268 files / 3,321 tests passed;
- strict TypeScript: passed;
- full ESLint: passed;
- Next.js 15.5.21 optimized Production build: passed;
- static generation: 59 pages;
- route manifest: 95 active / 17 acknowledged root/src duplicates passed;
- Production dependency audit: no known vulnerabilities; and
- whitespace check: passed.

Secret evidence:

- repository history: gitleaks 8.30.1 scanned 644 commits / approximately
  16.11 MB with no leak; and
- staged candidate: gitleaks scanned approximately 48 KB with no leak.

The expected test-only durable-rate-limit warnings exercise fail-closed regression
paths; they are not evidence of a current Production blocker. The accepted
Production readiness baseline remains green. No Production secret was entered
and no degraded-state override was added.

## Security review

The touched application surface was reviewed against the repository's Next.js,
React, and browser security boundaries:

- untrusted imported values are rendered through normal React text escaping;
- the imported page URL is displayed as text, never converted into a clickable
  operator-controlled link;
- reference destinations are immutable application constants on official
  Google HTTPS hosts and open with `rel="noopener noreferrer"`;
- the pure builder imports no environment, database, authentication, provider,
  filesystem, or network module;
- the workbench adds no storage, dynamic code, HTML injection, redirect,
  `postMessage`, or cross-origin request;
- the existing Preview and commit APIs remain same-origin and retain their
  existing server authorization and mutation gates; and
- the upstream CSV normalizer already rejects credentials, ports, parameters,
  fragments, control characters, email-like paths, foreign hosts, and
  NellySelly pages before a brief can exist.

The focused dangerous-sink scan found only the two pre-existing same-origin
Preview/commit fetches. No new security finding remains open in this change.

## Desktop, mobile, and accessibility acceptance

The protected workbench was exercised with its built-in unmistakably synthetic
CSV at:

- desktop: 1280 × 720 viewport; full page 1280 × 3,870;
- mobile: 390 × 844 viewport; full page 390 × 8,415.

For both viewports, the test proved:

- HTTP 200 and the existing protected workbench flow remained functional;
- synthetic validation used one intercepted read-only Preview request;
- the commit control remained disabled and zero commit request occurred;
- the decision packet rendered collapsed by default, opened with the native
  disclosure control, and exposed evidence, scope, owner inputs, review steps,
  primary metric, guardrails, stop conditions, and authority;
- the primary source link carried the expected safe new-tab relation;
- every input and textarea had an accessible name;
- keyboard focus moved from the CSV textarea to the file selector;
- document width did not exceed viewport width;
- zero browser console errors and zero page errors occurred; and
- the copy result has a polite live-region announcement and is reset whenever
  source CSV changes.

Manual screenshot review compared the candidate with the existing protected
Growth workbench design system. The final surface preserves the established
restrained black, gold, and cyan hierarchy, rounded panel geometry, typography,
and disclosure pattern. It introduces no new visual language or parallel page.
The first pass found small 9-pixel micro-labels, one 3.99:1 metric-label color,
and a tiny reference-link row. The final pass raises those labels, uses a 5.73:1
label color on the darkest metric tiles, enlarges the references, and preserves
responsive wrapping without horizontal overflow.

Ignored local evidence (not deployable source):

- `artifacts/organic-search-ingress-desktop.png` — SHA-256
  `a0eaca36650b7c3d7033d48b416f5b5c56874b5d42183109eba10043ee870c9c`;
- `artifacts/organic-search-ingress-mobile.png` — SHA-256
  `b854d0c2134d81951152964e8ffcb8842e3b2a4687d78dc4a201939765bd72fa`.

Evidence limit: this pass verifies responsive layout, accessible names, one
keyboard path, focusability, error-free rendering, and the touched color pair.
It is not a claim of full screen-reader certification or a complete WCAG audit.

## Exact-head seal still required

After commit and push, this candidate still requires:

1. exact-head GitHub Release Gate;
2. immutable Vercel Preview identity bound to that exact SHA;
3. protected no-write Preview QA on the immutable deployment;
4. clean/mergeable stacked Draft PR evidence; and
5. confirmation that canonical Production remains on its recorded baseline.

The mutable exact-head identifiers belong in the Draft PR evidence so this
file does not recursively invalidate its own commit by attempting to contain
its resulting SHA.
