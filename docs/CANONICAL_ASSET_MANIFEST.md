# Canonical Asset Manifest

Audit time: initially 2026-08-10 16:29 EDT; authenticated production/WordPress
evidence refreshed 2026-08-11. Disposition follows the consolidation directive.

| Asset | Evidence | Disposition | Decision |
|---|---|---|---|
| `/Users/brandonnarron/Projects/ask-magic-mike` | Git remote `brandonnarron1-lang/ask-magic-mike`; mature Next/Neon/AdminOps code; production branch is 18 commits ahead of `origin/main` | **CANONICAL** | Work here on `rescue/amm-pre-consolidation-20260810-162915`; merge through reviewed PR and preserve existing untracked QA artifacts |
| Vercel `eyes-up-industries/ask-magic-mike` | Project `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`; production deployment `dpl_SDMv6Nz69aKZJFfmGB54h6MpY5yt` ready; both Ask hostnames mapped correctly | **CANONICAL** | Current production project; avoid repeated uncontrolled production deploys |
| `/Users/brandonnarron/ask-magic-mike` | Two-commit bootstrap (`bd47194`); no lead, database, admin, or widget lifecycle | **OBSOLETE OR CONFLICTING** | Do not merge; keep as historical fallback only |
| `/Users/brandonnarron/propertylens` | Separate PropertyLens product repository; unrelated public funnel | **REFERENCE/DOCUMENTATION** | Rescue branch created because it was the active workspace; not a Magic Mike runtime |
| `/Users/brandonnarron/eyesup-hq/projects/ask-magic-mike-widget` | Asset/mobile package without its own Git repository or canonical backend | **MERGE INTO CANONICAL** | Reuse only compatible widget assets/contracts; no separate lead store |
| `ask_magic_mike_claude_code_wp_terminal_pack_v6.zip` | Plugin-first WP package, shortcode/widget/specs, no secrets | **WORDPRESS BRIDGE ONLY** | Reuse contracts and plugin ideas after review; do not activate blindly |
| `OurTown_AskMagicMike_Audit_LeadOps.zip` | Lead architecture, WP runbook, data schema, application-password notes | **REFERENCE/DOCUMENTATION** | Use as evidence; current authenticated production outranks it |
| `ask_magic_mike_ourtown_wordpress_v10_assets.zip` | Creative image/video assets only | **REFERENCE/DOCUMENTATION** | No backend or lead storage |
| V8 product-page buildpack/bridge zips | Static page and WP plugin presentation assets | **ARCHIVE AFTER REVIEW** | Do not create a second app or notification system |
| WordPress live site | Authenticated WordPress 7.0.3; Beaver/FlexMLS/Gravity Forms IDs 1–7, legacy AMM database/notification plugin, Lead Ops, and connector | **WORDPRESS BRIDGE ONLY** | Preserve pages/SEO/forms/entries; implement one signed explicit-ID bridge, reconcile legacy records, then retire duplicate notification/storage paths |
| Vercel `ask-magic-mike-4miw` | Separate Next project, no Ask hostname aliases found in production inspection | **ARCHIVE AFTER REVIEW** | Do not attach domains or deploy without explicit decision |
| Vercel `askmagicmike-domain-bridge-v29` | Separate bridge project, no Ask hostname alias in inspected production project | **ARCHIVE AFTER REVIEW** | Reference domain history only |
| Vercel `nellyselly-mvp` / `nellyselly-gate-b` | Separate NellySelly projects; no Ask hostname ownership in Vercel domain/project inspection | **OBSOLETE OR CONFLICTING** | Keep isolated; do not route Ask domains here |
| Git commits `daf9510`, `6601fb6`, `df2b1f3` | Present in canonical repository and reachable from current branches | **REFERENCE/DOCUMENTATION** | Preserve history; no reset or force-push |

## Preservation notes

The canonical worktree was dirty before consolidation (`app/layout.tsx`, route
manifest, Next config, compliance test, Vitest config, new health/robots/sitemap
files, and QA output). Those changes are preserved on the rescue branch and are not
silently overwritten.
