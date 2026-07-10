# Public UX QA Checklist

Use this checklist for public Ask Magic Mike verification. Do not submit production forms unless the owner explicitly approves a live QA lead.

## Safety Gate

- [ ] No secrets printed or pasted.
- [ ] No production `/api/leads` POST.
- [ ] No production form submissions.
- [ ] No admin status, assignment, or allocation actions.
- [ ] No Supabase production mutation.
- [ ] No Vercel environment variable changes.
- [ ] No WordPress changes.
- [ ] No DNS changes.
- [ ] No schema migrations.
- [ ] No production deploy.
- [ ] No `package-lock.json`, `yarn.lock`, or `bun.lockb`.

## Public Routes

- [ ] `/` returns 200.
- [ ] `/home-value` returns 200.
- [ ] `/value` returns 200 or safely renders the home-value path.
- [ ] `/sell` returns 200.
- [ ] `/we-buy-houses` returns 200 or safely renders the seller path.
- [ ] `/ask` returns 200.
- [ ] `/widget` returns 200.
- [ ] `/embed/ask` returns 200.
- [ ] `/widget-preview` returns 200.
- [ ] `/social-preview` returns 200.
- [ ] `/integrations/ourtownproperties` returns 200.
- [ ] Unknown public paths render a branded not-found page with recovery CTAs.
- [ ] No public route shows `402` or `DEPLOYMENT_DISABLED`.

## Visual QA

- [ ] Premium black/gold/cream/ruby/cyan direction is consistent.
- [ ] Text remains readable on black and image backgrounds.
- [ ] Hero CTA is clear and above the fold on mobile.
- [ ] No generic SaaS palette or novelty magic graphics dominate the UI.
- [ ] Mike imagery remains credible and locally appropriate.
- [ ] Footer and trust/legal copy are visible.

## Funnel QA

- [ ] Address step has a visible label and validation error.
- [ ] Email step has a visible label and validation error.
- [ ] Phone/timeline step has visible labels and validation error.
- [ ] Back/continue behavior is obvious.
- [ ] Success state explains what happens next.
- [ ] Appointment CTA appears after successful local or owner-approved submission testing.
- [ ] Source attribution is preserved in widget/embed URLs.

## Chat QA

- [ ] Starter prompts are visible.
- [ ] User and Mike messages are visually distinct.
- [ ] Loading state appears while a message is pending.
- [ ] Error state offers retry.
- [ ] Handoff copy directs property-specific advice to Mike/Our Town Properties.
- [ ] No fake market facts, comps, or price claims appear.

## Widget / Embed QA

- [ ] Launcher has an accessible name.
- [ ] Open/close controls are keyboard reachable.
- [ ] Escape closes the widget.
- [ ] Focus returns to launcher after close.
- [ ] Tabs are accessible and at least 48px tall on mobile.
- [ ] The panel fits 390px mobile viewport without horizontal overflow.
- [ ] Parent page remains usable when widget is closed.

## Responsive QA

- [ ] No horizontal overflow at 320px.
- [ ] No horizontal overflow at 375px.
- [ ] No horizontal overflow at 390px.
- [ ] Tablet layout at 768px is readable.
- [ ] Desktop layout at 1024px and 1440px is stable.
- [ ] Social preview and integration code blocks do not clip or force page overflow.

## Verification Commands

```sh
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm exec vitest run tests/public/ tests/leadops/ tests/widget/ tests/adminops/
pnpm run test
```

Record screenshots and browser summaries under `.amm-run/public-ux-visual-completion-v1/`. Do not commit `.amm-run/`.
