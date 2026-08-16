# Funnel UX audit — Phase 7

Audit date: 2026-08-16 (America/New_York)

## Scope and method

The Phase 6 black/gold/ruby visual system, real Mike photography, Our Town logo, conversion routes, and mobile-first structure are retained. Phase 7 prioritizes human-review clarity, accessible validation, consent readability, Lead Center permission states, and release controls. No lead was submitted during this audit.

Audited routes: `/`, `/home-value`, `/sell`, `/value`, `/buy`, `/ask`, `/widget/v1`, and authenticated `/admin/leads`. The authenticated Lead Center session expired during the fresh audit and correctly redirected to `/lead-center-login?error=session`; public funnel work continued without bypassing authentication.

## Fresh public-funnel walkthrough

1. Opened the Production home-value route with synthetic internal-QA attribution.
2. Confirmed the existing hierarchy, progress indicator, trust copy, labels, focus treatment, footer compliance copy, and mobile-first structure.
3. Activated `Continue` with an empty address. Production browser-native validation prevented the React submit handler from running, so the user received a transient browser bubble rather than the app's persistent, explanatory alert.
4. Advanced locally with `INTERNAL QA — DO NOT CONTACT` data only. Email and phone steps showed the same native-validation dependency before the patch.
5. Added `noValidate` to each funnel form so the existing server-independent client checks own the visible error state; the API remains the trust boundary and still validates server-side.
6. Added visible `Required` markers while preserving concise accessible names through explicit `label`/`htmlFor` associations.
7. Cleared stale errors when the user edits a field or navigates Back.
8. Increased consent copy, checkbox, contrast, and spacing without changing the approved consent language or making consent mandatory.
9. Re-ran the address state in the same in-app-browser tab and 984×964 viewport. The local implementation showed a persistent `role="alert"`, `aria-invalid="true"`, and the explanatory text after the same action.

## Evidence-backed findings

### Strengths retained

- Clear single-purpose page and four-step progression.
- Strong visual hierarchy and recognizable Our Town branding.
- Honest broker-review framing; no instant valuation or response-time promise.
- Visible keyboard focus and accessible field labels.
- Consent remains optional, explicit, versioned, and separate from durable lead storage.

### Defects closed

- **Closed:** browser-native required validation suppressed persistent app guidance.
- **Closed:** required fields were not visually identified before interaction.
- **Closed:** editing or navigating Back could leave a stale error visible.
- **Closed:** consent language was comparatively small and low-contrast.

### Verification limits

- This is not a claim of full WCAG conformance.
- A fresh authenticated Lead Center visual pass requires a valid operator session; the expired session was not bypassed.
- Fresh 390px and 1440px in-app-browser captures, reduced-motion inspection, and a post-Preview keyboard pass remain release checks.
- No consumer, Mike, SMS, or live-prospect message was sent.

## Screenshot register

- `output/phase7/screenshots/current-audit/06-production-native-error-matched.jpg` — Production before, 984×964 viewport.
- `output/phase7/screenshots/current-audit/07-local-inline-error-matched.jpg` — local after, same tab, viewport, and empty-address state.
- `output/phase7/screenshots/current-audit/08-before-after-comparison.jpg` — combined visual comparison used for review.
- `output/phase7/screenshots/current-audit/09-local-phone-consent-matched.jpg` — local phone/consent state with synthetic, non-submitted QA values.
