# Funnel Event Identity Integrity — Focused Security Review

Date: 2026-08-24

Scope: the Phase 9 browser-to-canonical-analytics identity change only

Base: `0e47db8780c7257f0d445d75e034aacd535c06a4` (stacked after sealed Draft PR #215)

Production impact: none; no merge, deployment, environment-variable change, database migration, or live write was performed.

## Result

Focused review found one low-probability integrity edge: Home Value's first
address interaction could theoretically occur before its passive client effect
initialized the submission UUID. Code-bearing head
`0c45a33b706d7e8a02501ccf83baf24a83ec107d` closes that edge by synchronously
creating or reusing the UUID before the first event and failing truthfully if
secure browser UUID generation is unavailable. Regression coverage proves the
first event and later durable command share the same identity.

No Critical, High, Medium, or Low candidate-specific defect remains after that
fix. The change preserves the existing first-party origin check, rate limit,
bounded request body, public event/property allowlists, coarse user-agent
handling, and parameterized Neon insert. It does not create a browser-authored
canonical conversion or a pre-lead `sessions` row.

This is a scoped review of the changed funnel-event identity behavior, not a claim that every unrelated application surface has been re-audited.

## Threat review and evidence

| Threat | Control and evidence | Residual risk |
| --- | --- | --- |
| Browser spoofs a durable lead or appointment outcome | `app/api/events/route.ts` and `src/app/api/analytics/event/route.ts` reject every event classified by `isCanonicalLedgerProtectedEvent`; `app/lib/analytics.ts` does not post those events to the canonical route. This covers lead/widget creation, qualification, appointment request, and notification lifecycle events. Server-side lead capture remains the only canonical `lead_created` author. | Third-party browser analytics can still receive a success event after the UI observes a successful response; those integrations are not canonical KPI truth. |
| Browser injects a lead, agent, or arbitrary database identifier | Public routes set `leadId: null`, `agentId: null`, and `sessionId: null`. A candidate funnel identity must match a UUID at runtime. It is carried only as `funnelSessionId` and injected by `NeonAnalyticsEventRepository` after the normal public-property sanitizer runs. | A public visitor can generate an arbitrary valid UUID, so the identifier is correlation evidence, not authentication or ownership proof. |
| Public property overrides the protected correlation identity | `safePublicAnalyticsProperties` strips unregistered fields. `NeonAnalyticsEventRepository.record` then overwrites `properties.funnel_session_id` only from the separately validated repository argument. Contract and repository tests cover attempted override. | None identified in this path. |
| Existing UUID blocks atomic lead capture | The candidate deliberately does not pre-create or update `public.sessions`. Funnel events retain a null foreign key until the established lead-capture transaction creates the session. | Pre-submit events remain pseudonymous properties and are joinable only after a matching successful lead submission. |
| First interaction outruns passive UUID setup | Home Value synchronously calls the established secure UUID helper before its first address event and reuses the result for later steps and the durable lead command. Component and source-contract tests cover the earliest interaction. | A browser without secure UUID generation cannot continue that event path; the user sees a truthful recoverable failure instead of silently creating unlinked telemetry. |
| PII reaches analytics, URLs, browser integrations, or logs | Event properties pass through event-specific and global privacy allowlists; the UUID is excluded from GA/GTM/PostHog/custom-event properties and appears only in the first-party request body. The repository logs only the event name plus a normalized error message on failure. | The pseudonymous funnel UUID becomes linkable to a lead after submission and must follow the approved analytics retention/access policy. |
| SQL injection or malformed identifier reaches Neon | UUIDs are runtime-validated; event names and categories are allowlisted/pattern-checked; the insert uses positional parameters and explicit PostgreSQL casts. | None identified in this path. |
| Oversized, cross-origin, or high-rate event flood | Both public event routes enforce an exact approved-origin check, rate limiting before body parsing, JSON content type, and a 4,096-byte streaming body limit. | A same-origin attacker can still create rate-limited non-conversion funnel noise. Funnel events remain telemetry, not an authorization or billing source. Durable shared rate-limit readiness is controlled by the earlier stacked release gate. |
| Widget `postMessage` leaks data to an unexpected parent | `app/lib/analytics.ts` derives an allowlisted parent origin and supplies it as the exact `targetOrigin`; no wildcard target is introduced. Only privacy-allowlisted event dimensions are sent. | Parent-side handlers remain responsible for their own exact-origin and schema validation. |
| Replay creates duplicate canonical conversions | Browser conversion events are excluded from canonical ingestion. Durable lead creation and its canonical event continue to use the established lead idempotency transaction. | Replayed non-conversion funnel telemetry can create additional rate-limited rows; it cannot create a canonical lead conversion through these routes. |
| Browser acceptance accidentally creates a lead, event, message, or provider call | The persistent Preview test installs one catch-all `/api/**` POST interceptor before navigation. Known mutation surfaces receive synthetic responses; an unknown POST is blocked and fails the run. `SAFE_DB_WRITE` remains hard-pinned to false in the dispatcher. | A future new non-`/api/**` mutation transport must be added to the interception contract before browser acceptance can cover it. No such candidate transport exists. |

## Verification performed

- Runtime UUID validation was inspected in both public ingestion paths and the repository boundary.
- Event and property allowlists were inspected at both client and server boundaries.
- The Neon write was confirmed parameterized; no SQL interpolation was introduced.
- Changed client/server files were scanned for raw HTML sinks, string-to-code execution, wildcard `postMessage`, and browser-stored auth/session tokens; no candidate-specific hit was found.
- `pnpm audit --prod` reported no known production dependency vulnerability.
- The tracked Git history was scanned with redacted output; no secret leak was reported.
- Protected branch-owned browser run `32760498269` executed fresh and replay
  Ask conversion behavior plus all four public funnels at desktop/mobile sizes
  with every mutation intercepted; no unexpected POST, provider call, console
  error, PII-bearing event, or protected event-ledger request occurred.
- The first protected remote run exposed file-scoped bypass configuration;
  all new tests stopped on Vercel authentication before a funnel field or
  mutation. Both suites now import one shared secret-safe configuration, and
  the release-safety scanner requires that shared linkage without reading or
  logging the secret value.
- Focused tests, the full test suite, typecheck, lint, production build, route proof, release-safety checks, and Ask/Nelly deployable-source isolation passed before candidate sealing. Exact-head evidence is recorded in `docs/phase9/FUNNEL_EVENT_IDENTITY_INTEGRITY_QA_EVIDENCE.md` and the Draft PR.

## Deferred policy decisions

- Retention/deletion duration for pre-submit pseudonymous funnel events remains an owner/BIC privacy-policy decision.
- Funnel telemetry must not be treated as authenticated identity, a protected-class signal, or a substitute for the server-owned lead and outcome ledger.
- Historical rows are not backfilled or reclassified by this candidate.
