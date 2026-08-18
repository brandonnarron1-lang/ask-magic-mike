# Phase 8 chronology and current-state reconciliation

Reconciled 2026-08-18. The canonical present state is `main` at `58554dffb533852dfbb1887d32cfa68aebb2d2dc`, deployed Ready as `dpl_2vgceZpCb4PSuoYffvwi7QAxYnrX`. Earlier reports remain evidence of their moments in time; none override the current commit, deployment, production database, or live control state.

| Time | Change | Commit / deployment | Current disposition |
|---|---|---|---|
| 2026-08-15 | Phase 6 funnel, AI, and messaging controls merged | PR 152, `509b54fa8def73d48169970868338ca66c28793f` | Historical implementation base |
| 2026-08-15 | Phase 6 production and Brandon QA evidence merged | PR 153, `44a7b6ba704f51c43856c756e99a55c984de635c` | Historical evidence |
| 2026-08-15 | Phase 6 Preview hardening merged | PR 154, `83f726ce87e0e334a080464c03d8d3f04e23402d`; Production `dpl_875K5f4xrJdZD9WEQAftafP338uE` | Superseded by Phase 7 deployments |
| 2026-08-15 | Phase 6 production migration accepted | PR 155, `c1648137b6a7ca3be947e3e0872f35dd671a1b93` | Applied; must not be repeated |
| 2026-08-16 | Phase 7 messaging, Copilot, and Brandon-only acceptance merged | PR 156, `4b4caefcd2aea2944a06df71a8cf3e3e569b969d` | Historical Phase 7 baseline |
| 2026-08-16 | Accessibility and lifecycle hardening | PRs 158–163 | Included in current main |
| 2026-08-16 | Signed Resend webhook acceptance | PR 165, `2810c89e5ef264aaaf10ca6503adf20b656c2eca`; deployment `dpl_5g43rkAatsVi3FHyarZf7Km1jZfG` | Webhook remains enabled |
| 2026-08-16 | Copilot schema correction | PR 166, `275f06e5857aceab2c79d499a3d29766c2c59c19`; acceptance deployment `dpl_7uQC5a9xudCNAN1HEAiBWdBZ7iC9` | Included; acceptance not repeated |
| 2026-08-16/17 | Current evidence merge and deployment | PR 167, `58554dffb533852dfbb1887d32cfa68aebb2d2dc`; `dpl_2vgceZpCb4PSuoYffvwi7QAxYnrX` | **Canonical current state** |

## Current verified state

- Public app, health, Neon, WordPress Form 3 bridge, and Resend webhook are reachable.
- Neon has zero genuine live leads and six suppressed QA leads. Zero QA leads enter business Active/New reporting.
- Notification queue depth is zero. No live-lead notification failure exists. Two permanently failed records belong only to suppressed QA leads.
- Form 3 alone is enabled for canonical WordPress forwarding. Forms 1, 2, 5, 6, and 7 remain held; Form 4 is recruiting-only.
- Copilot remains operator-only. Its accepted run was synthetic and suppressed; it sent no communication and changed no lead state.
- Consumer email, consumer SMS, carrier SMS, scheduling, automatic sending, and Mike activation remain disabled or deferred.
- Resend webhook ingestion is enabled, but the provider dashboard currently warns of an unpaid invoice. This is an operating risk, not a hidden success claim.
- Ask Magic Mike remains isolated from NellySelly by repository, deployment, domains, Neon project, and environment-variable set.

## Superseded statements

Any document naming an earlier deployment as “current” is superseded only for the deployment identifier. Its accepted tests and historical evidence remain valid unless a regression is found. The prior statement that editable Office artifacts were blocked is superseded by the user-approved isolated PptxGenJS/openpyxl/LibreOffice fallback toolchain.
