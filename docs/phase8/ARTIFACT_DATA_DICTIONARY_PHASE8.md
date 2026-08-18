# Phase 8 artifact data dictionary

Source: `output/phase8/data/current-system-state.json`. Classification: redacted operational evidence. Values are generated from authenticated production inspection, canonical repository evidence, and prior accepted QA records. No secret value, hidden BCC, genuine lead identity, provider payload, session token, or push endpoint is permitted.

| Path | Meaning | Source | Refresh rule |
|---|---|---|---|
| `canonical.*` | Current GitHub, Vercel, and Neon identities | GitHub CLI, Vercel CLI, Neon production UI | Refresh before release |
| `health.*` | Current production readiness and runtime log state | Canonical health endpoints and Vercel logs | Refresh before release |
| `lead_counts.*` | Redacted lead/test aggregates | Read-only Neon aggregate query | Never export lead rows |
| `notifications.*` | Notification queue and lifecycle aggregates | Read-only Neon aggregate plus Resend webhook UI | Provider account risk must remain explicit |
| `forms[]` | Live Gravity Forms status and canonical forwarding disposition | Authenticated WordPress admin and bridge panel | `wordpress_active` does not imply canonical forwarding |
| `wordpress_bridge.*` | Canonical bridge version and allowlist | Authenticated WordPress bridge panel | Form 3 only unless separately approved |
| `rbac.*` | Aggregate role and session readiness | Read-only Neon aggregate and login redirect | No names, emails, tokens, or sessions |
| `operators.*` | Redacted operator readiness | RBAC aggregates and accepted Phase 7 evidence | No mailbox address or phone is included |
| `ai_copilot.*` | Latest accepted synthetic Copilot run and durable counts | Read-only Neon aggregates | Do not extrapolate one acceptance cost |
| `messaging.*` | Current guarded messaging state | Neon aggregates, Vercel control-name audit, Phase 7 evidence | Disabled remains the default |
| `visual_acceptance.*` | Phase 8 responsive checks | In-app browser test matrix | Authenticated Lead Center remains separate |
| `quality.*` | Accepted release-gate and Phase 8 build state | Canonical QA reports and artifact verifier | Update after every artifact build |
| `security.*` | Packaging and product-isolation assertions | Secret/PII scans and isolation tests | Fail the package on any violation |
| `remaining_approval_gates[]` | Human decisions intentionally not activated | Current operating rules | Never infer approval from artifact review |

Zero means a verified zero count, not missing data. `held`, `disabled`, and `deferred` are intentional control states. `pending_build` is not equivalent to pass.
