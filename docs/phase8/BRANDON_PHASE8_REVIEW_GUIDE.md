# Brandon Phase 8 review guide

This guide reviews evidence; it does not authorize consumer communication, paid media, Mike activation, or additional WordPress forwarding.

## 1. Presentations

Open both PPTX files in PowerPoint or LibreOffice. Confirm titles, body text, tables, charts, connectors, diagrams, status badges, and speaker notes are individually editable. Compare exported PDFs and the presentation montage for clipping, missing images, or font changes.

## 2. Workbook dashboards

Start with the operating scoreboard, evidence register, ROI model, deliverability dashboard, AI usage dashboard, and form matrix. Confirm filters and frozen headers work. Change yellow assumption cells only in a copy. Verify formulas update and QA remains excluded from business KPIs.

## 3. Brandon-only email evidence

Verify the accepted Phase 7 subject, provider ID, accepted/sent/delivered lifecycle, mobile/desktop review, and the explicit “No Mike / no consumer / reporting excluded” columns. Do not resend the QA message merely to recreate evidence.

## 4. Copilot output

Confirm the latest accepted row is labeled synthetic/test, strict-schema, advisory, PII-minimized, and no-mutation. Treat $0.006619 as one test result—not a monthly forecast.

## 5. Permission decisions

Review purpose and channel separately. Ambiguous, held, suppressed, opted-out, or unapproved states must fail closed. QA delivery requires both `is_test=true` and suppression plus the exact QA allowlist.

## 6. Message previews and sequences

Review HTML, plain text, SMS preview, version, subject, stop conditions, quiet hours, frequency caps, duplicate protection, bounce/complaint behavior, and rollback. Preview approval is not send approval.

## 7. Form 3 release gate

Confirm Form 3 only, transactional acknowledgment only, exact template/version, permission basis, no test/suppressed sending, idempotency, provider lifecycle, monitoring, and one-flag rollback. Review provider account standing before activation.

## 8. Remaining disabled features

Consumer email, consumer SMS, carrier SMS, scheduled nurture, automatic sending, Mike delivery, paid traffic, and held WordPress forms remain disabled or deferred.

## 9. Visual defects

Use the mobile and desktop montages plus route metrics. Record the exact route, viewport, screenshot, and defect. Fix only evidenced regressions; do not redesign stable production surfaces for presentation aesthetics.

## Approval options

- Artifact review only: no operational change.
- Form 3 pilot: use the exact separate phrase in its release gate.
- Provider remediation: approve a specific no-cost or funded provider action separately.
- Mike activation, consumer SMS, other forms, or paid media: each requires its own scoped approval and acceptance plan.
