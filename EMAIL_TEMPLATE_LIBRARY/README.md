# Phase 7 email template library

`index.ts` exposes the canonical, versioned email registry and the shared responsive HTML/plain-text renderer. The registry includes internal alert, simulated Mike-view, digest, general, home-value, seller, buyer, seller-options, rental, short-term-rental, property-alert, appointment, follow-up, close-the-loop, opt-out, delivery-failure, SLA-breach, and QA-render families.

Consumer templates remain approval-gated and cannot bypass the communication-permission service. QA rendering is restricted to records that are both test and suppressed. The HTML renderer escapes untrusted content, emits accessible semantic markup, includes a plain-text alternative, records a template version and SHA-256 content hash, and does not rely on external fonts or images for essential information.
