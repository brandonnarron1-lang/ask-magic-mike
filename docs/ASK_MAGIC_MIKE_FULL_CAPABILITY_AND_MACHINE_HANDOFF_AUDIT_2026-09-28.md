# Ask Magic Mike — Full Capability, Completion, and Machine Handoff Audit

**Audit date:** 2026-09-28 18:50 EDT

**Evidence cutoff:** 2026-09-28 18:50 EDT

**Canonical repository:** `brandonnarron1-lang/ask-magic-mike`

**Canonical local source:** `/Users/brandonnarron/projects/ask-magic-mike`

**Audit worktree:** `/Users/brandonnarron/.codex/worktrees/ask-magic-mike/handoff-audit-20260928`

**Audit branch:** `codex/handoff-audit-20260928`

**Audience:** owner, ChatGPT handoff, Codex continuation agent, engineering operator

**Authority:** read-only external inspection plus local repository inspection; no Production mutation was made

## 1. Executive decision

Ask Magic Mike is not a mockup and does not need another greenfield rebuild. It is an operating lead platform with a live public funnel, one canonical Neon PostgreSQL database, deterministic lead scoring and routing, a protected Lead Center, durable notification records, production email, a signed WordPress bridge, Web Push infrastructure, analytics/growth controls, and a mature release/rollback system.

The correct next move is consolidation, not reinvention:

1. Keep the existing Next.js/Neon/Vercel application as the canonical system.
2. Reconcile release-authority documentation with the actual live release.
3. Decide and release PR #248 through its exact application-only gate.
4. Repackage the later Draft stack into a small number of fresh, reviewable dependency batches instead of merging 26 stacked PRs blindly.
5. Preserve and finish the uncommitted consumer-acknowledgment candidate before any machine transfer.
6. Keep Ask Magic Mike assigned to the current Mac M4 unless the owner explicitly reassigns it to a different dedicated machine.

### Current outcome

| Question | Truth at audit cutoff |
| --- | --- |
| Is the public funnel reachable? | **Yes.** `https://www.askmagicmike.com/` returned HTTP 200. |
| Is the former 402 condition present? | **No.** Current Vercel Production is Ready. |
| Is the apex canonicalized? | **Yes.** `https://askmagicmike.com/` returns HTTP 308 to `https://www.askmagicmike.com/`. |
| Is the canonical database reachable? | **Yes.** `/api/health/ready` returned HTTP 200 with database, capture, notification, RBAC, rate-limit, and push readiness true. |
| Can the public system collect seller, buyer, renter, open-house, general-question, appointment, and widget activity? | **Yes, with route-specific forms and APIs already present.** |
| Is private lead data publicly exposed? | **No evidence of that.** Anonymous `/admin` requests redirect to login; anonymous `/api/admin/health` returns HTTP 401. |
| Is internal email active? | **Yes at the runtime configuration level.** Health reports production notification mode and email enabled. Prior controlled evidence records internal Resend delivery and hidden audit BCC. This audit did not send email. |
| Is carrier SMS live? | **No.** Twilio-compatible code exists, but carrier SMS remains intentionally disabled pending a registered provider, paid carrier path, and controlled acceptance. |
| Is free phone alerting available? | **Infrastructure yes; device completion is operator-specific.** Web Push and phone setup report ready, but each physical device owner must enroll and accept a `[TEST]` receipt. |
| Is consumer acknowledgment live? | **Not proven.** A safer atomic implementation has been reconstructed locally but is uncommitted and was not reverified after reconstruction. |
| Is the WordPress connection complete? | **Partly.** The signed Form 3 bridge has prior authenticated proof. Existing Ask Magic Mike public surfaces remain. The homepage CTA exists in source but is hidden by known CSS; the connector 1.1.0 upgrade and page-specific publication remain gated. |
| Does NellySelly share this system? | **No.** Repository and Vercel identity checks pass; no NellySelly identifiers were found in deployable Ask Magic Mike source. |
| Is a genuine public prospect guaranteed? | **No.** The system can accept one now, but a real person cannot be fabricated. Last documented aggregate evidence contained only suppressed/test records; this audit did not query private lead rows. |

### Single most important coordination defect

The repository's merged source and external runtime are newer than several authority documents on `main`:

- actual `origin/main`: PR #247 merge `a2f3de834830f600df106dbf5836ae4bbde4eb4a`;
- actual Production deployment: `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U`;
- stale files on `main` still describe PR #246 as Production and PR #247 as pending;
- PR #248 correctly starts from the merged PR #247 base and is the current clean, non-Draft application candidate.

This is a release-authority documentation drift, not a public outage. Do not use the old PR #247 approval language. The current PR #248 gate is the only application gate that may be evaluated after fresh exact-head checks.

## 2. Truth-state definitions

This audit uses five states deliberately:

| State | Meaning |
| --- | --- |
| **LIVE PRODUCTION** | Present in the canonical Vercel deployment and supported by current runtime or recent authenticated evidence. |
| **BUILT + VERIFIED, NOT PRODUCTION** | Code exists in a remote branch/PR and has prior exact-head checks, but is not in canonical Production. |
| **LOCAL RECONSTRUCTED, UNVERIFIED** | Work exists only in a local worktree and has not completed a fresh verification/commit/PR cycle. |
| **PLANNED / PREPARED** | Design, adapter, packet, or runbook exists, but required provider/configuration/publication work is not active. |
| **BLOCKED / OWNER OR PROVIDER ACTION** | A human, licensed provider, paid carrier path, BIC decision, secure credential entry, DNS action, or exact Production gate is required. |

Passing tests or a Preview does not make a capability Production. A route existing in source does not prove its provider is enabled. A queued email does not prove delivery. A synthetic QA record is never a genuine prospect.

## 3. Canonical system identity

| Layer | Canonical authority | Fresh status |
| --- | --- | --- |
| Repository | `https://github.com/brandonnarron1-lang/ask-magic-mike.git` | Active and authenticated as `brandonnarron1-lang` |
| Default branch | `main` | `a2f3de834830f600df106dbf5836ae4bbde4eb4a` |
| Production tree | Git tree `0065f829fc94f87ab5e0faf596c8e56733be3972` | Matches merged PR #247 source |
| Branch protection | GitHub ruleset `17291635` | Active; PR required, non-fast-forward/deletion protected, `local-release-gate` required |
| Vercel team/project | `eyes-up-industries/ask-magic-mike` | Project `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8`, Ready |
| Production deployment | `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U` | Ready; aliases attached |
| Generated Production URL | `https://ask-magic-mike-571exyxlz-eyes-up-industries.vercel.app` | Ready |
| Canonical public URL | `https://www.askmagicmike.com` | HTTP 200 |
| Apex | `https://askmagicmike.com` | HTTP 308 to canonical `www` |
| Brokerage/SEO authority | `https://www.ourtownproperties.com` | HTTP 200; WordPress/Gravity Forms/FlexMLS surface |
| Canonical database | Neon project `bitter-star-20214385` | Production branch `br-round-base-auh6h2wd`, database `neondb`; health ready |
| Database runtime | Server-only `DATABASE_URL` | Neon PostgreSQL; Supabase directory name is migration-history legacy, not the Production provider |
| Private operations | `https://www.askmagicmike.com/admin` | Protected; anonymous users redirect to Lead Center login |
| Future vanity hub | `https://hub.ourtownproperties.com` | Not attached; DNS/domain action remains separately gated |
| Internal email | Existing authenticated provider adapter, documented as Resend in Production | Runtime reports enabled; private BCC value intentionally omitted |
| WordPress bridge | Existing signed Ask Magic Mike Canonical Bridge | Prior Form 3-only proof; no competing WordPress lead database |

### Product isolation

Ask Magic Mike and NellySelly must remain separate in all of the following:

- repository and Git history;
- Vercel project, aliases, domains, environment variables, and deployments;
- Neon organization/project/database/roles;
- analytics containers and event ledgers;
- webhook secrets, provider credentials, notification recipients, push subscriptions, and CRM records;
- local worktrees, environment files, caches, and machine handoff records.

The current isolation verifier passed against the actual Ask Magic Mike project ID and current `main` source. It found no NellySelly identifier in deployable source.

## 4. Machine and local execution state

### Current assigned machine

| Item | Current fact |
| --- | --- |
| Assignment | Ask Magic Mike is assigned to the current Mac M4 |
| Model/chip | Apple-silicon MacBook Air, Apple M4, 10 cores |
| Architecture | `arm64` |
| OS | macOS 26.5.2, build 25F84 |
| Memory | 16 GiB |
| Internal free space | Approximately 26 GiB at audit time |
| Required mounted volumes found | `/Volumes/X10`, `/Volumes/X10_TM`, `/Volumes/MyBook` |
| Project runtime | Node 24.18.0 installed; default shell Node is 26.5.1 and should not be used for release proof |
| Package manager | pnpm 10.30.3 |
| PostgreSQL contract-test runtime | PostgreSQL 17.11 installed; default `psql` currently points to PostgreSQL 18.3 |
| GitHub CLI | Authenticated to the canonical owner account |
| Vercel CLI | Authenticated; canonical project inspection succeeds |

### Resource warning

Internal free space is adequate for normal work but narrow for multiple Next.js/Playwright/PostgreSQL pipelines. One unrelated WYTS Playwright/Chrome daemon is running from `/Volumes/X10`. Preserve it. Run one heavy Ask Magic Mike build/test/database pipeline at a time. Do not kill unrelated project processes merely to free resources.

### Current Ask Magic Mike worktrees

| Path | Branch/base | State and handling |
| --- | --- | --- |
| `/Users/brandonnarron/projects/ask-magic-mike` | `codex/phone-setup-session`, commit `88913e86...` | Primary historical checkout; only untracked runtime/browser artifacts were observed. Preserve them. Do not treat this old branch as current `main`. |
| `/Users/brandonnarron/.codex/worktrees/ask-magic-mike/handoff-audit-20260928` | `codex/handoff-audit-20260928` from `origin/main` | Current audit worktree. Documentation only. |
| `/Users/brandonnarron/.codex/worktrees/ask-magic-mike/consumer-ack-20260928` | `codex/consumer-ack-boundary-20260902` from PR #274 head | Contains uncommitted reconstructed consumer-ack work. Preserve exactly; do not clean, reset, or mix into another branch. |
| `/Users/brandonnarron/Projects/ask-magic-mike-free-first-2026-08-14` | `codex/phase7-final-artifacts` | Historical worktree; inspect before reuse or archival. |

## 5. Fresh live evidence

At the audit cutoff:

- `GET https://www.askmagicmike.com/` → HTTP 200.
- `GET https://askmagicmike.com/` → HTTP 308 to the canonical `www` hostname.
- `GET /api/health/live` → HTTP 200 with `environment=production`, `database_provider=neon_postgres`, production notification mode, and email enabled.
- `GET /api/health/ready` → HTTP 200 with canonical capture, leads, notification table, RBAC schema, durable rate-limit store/secret, Push configuration, and phone setup ready.
- `GET /robots.txt` and `/sitemap.xml` → HTTP 200; admin/API paths are excluded from crawling.
- `GET /admin` and `/admin/leads` without a session → HTTP 307 to `/lead-center-login`.
- `GET /api/admin/health` without a session → HTTP 401.
- `GET /widget/v1` → HTTP 200 with `frame-ancestors` limited to the Ask Magic Mike and Our Town hosts.
- `GET /open-house/internal-qa` → HTTP 200 without creating a lead.
- `GET https://www.ourtownproperties.com/` → HTTP 200.
- The latest scheduled Production monitor on current `main` completed successfully on 2026-09-28; the preceding scheduled runs also passed.

No form was submitted, no private lead data was queried, no notification was sent, no environment value was displayed, and no external system was changed during this audit.

## 6. What the system can do now

### 6.1 Public conversion and consumer experience — LIVE PRODUCTION

The public application provides:

- premium mobile-first Ask Magic Mike landing experience;
- seller/home-value intake;
- seller strategy and sell-direct-options intake with conditional, human-reviewed language;
- buyer/property-match intake;
- renter-to-homeownership intake;
- property/open-house registration paths;
- general real-estate question intake;
- appointment requests;
- a device-private recurring review planner;
- a versioned WordPress-safe widget and isolated Ask embed;
- public referral links that do not include form answers or PII;
- privacy, terms, accessibility, and contact surfaces;
- canonical metadata, sitemap, robots policy, social preview assets, and compatibility redirects.

The public copy explicitly avoids fake instant valuations, guaranteed offers, fabricated availability, and unverified response promises.

### 6.2 Canonical lead capture — LIVE PRODUCTION

The active flow is:

```text
public form / approved WordPress bridge / widget
  -> server validation, honeypot, body/origin/rate-limit controls
  -> idempotent atomic Neon capture
  -> contact identity + lead + attribution + consent + score + routing
  -> durable notification outbox
  -> provider attempt/retry lifecycle
  -> authenticated Lead Center timeline
```

Implemented behaviors include:

- durable storage before a success response;
- normalized contact identity and deduplication;
- idempotency/fingerprint protection against repeat submissions;
- first-touch and last-touch attribution;
- source URL, placement, referrer, UTMs, approved click IDs, and funnel/session identity;
- exact consent text, version, timestamp, source, and communication permissions;
- test/suppression flags and KPI exclusion;
- deterministic 0–100 scoring with factors and grade;
- deterministic assignment with reason, prior/new owner, and audit event;
- Mike/default routing when no approved specialist mapping exists;
- unassigned/admin-review behavior when no eligible recipient exists;
- durable notification intent independent of provider success;
- safe correlation IDs and failure responses.

### 6.3 Lead Center and operations — LIVE PRODUCTION, WITH ROLE-SPECIFIC ACCEPTANCE LIMITS

The protected Admin/Lead Center surface includes:

- overview and operational health;
- lead inbox and lead detail;
- assignment/allocation;
- notes, tasks, appointment follow-up, status/stage, and communication permissions;
- notification status and retries;
- source/reporting views;
- action queue and SLA sweeps;
- message preview studio;
- distribution and owned-demand controls;
- growth intelligence workbenches;
- database-revival review;
- authenticated Operations Copilot jobs.

The server implements per-user sessions, roles, permissions, assigned-lead scope, secure cookies, revocation, and rate limits. Anonymous behavior was freshly proven. The health endpoint reports RBAC schema ready. Brandon's administrator activation has prior acceptance evidence. Mike's `primary_lead_owner` account remains an operator-specific acceptance item unless a newer authenticated receipt proves completion.

The vanity `hub.ourtownproperties.com` hostname is not yet attached; `/admin` is the canonical private entry point.

### 6.4 Scoring, routing, and lead intelligence — LIVE PRODUCTION

- Scoring is deterministic and explainable; AI does not silently assign or prioritize leads.
- Seller/buyer intent, timeline, contact completeness, property context, financing/preapproval, and message specificity can contribute.
- Protected-class data and demographic/neighborhood proxies are forbidden inputs.
- HOT/ACTIVE/NEW presentation derives from stable score bands.
- Duplicates preserve the prior approved owner unless explicitly reassigned.
- Every assignment/reassignment is auditable.
- Next-best-action guidance is derived from stored facts and permission state.
- Outcome, first-response, SLA, and attributed-revenue ledgers support operational measurement without becoming a second CRM.

### 6.5 Internal email notification — LIVE PRODUCTION

The code and prior controlled evidence support:

- responsive HTML and plain-text lead alerts;
- source-explicit subjects with `[HOT]`, `[ACTIVE]`, `[NEW]`, or `[TEST]`;
- Mike as the primary internal recipient;
- a hidden audit BCC stored only in secure configuration;
- safe Reply-To behavior;
- provider message ID, status, attempts, timestamps, and error recording;
- bounded retries and visible failures;
- idempotency by lead/notification/template;
- distinct test labeling and suppression;
- event-webhook handling for delivery lifecycle;
- Resend and authenticated SMTP adapters.

Production health reports email enabled. Prior acceptance records internal Resend and hidden-BCC delivery. This audit intentionally did not send another QA email and therefore does not create a new delivery receipt.

### 6.6 Web Push phone alerts — INFRASTRUCTURE LIVE; DEVICE ACCEPTANCE REQUIRED

The free-first phone-alert path is standards-based Web Push, not mislabeled SMS. It supports:

- role-specific primary and copy devices;
- short-lived, signed, one-time phone setup invitations;
- iOS Home Screen installation flow;
- HttpOnly token exchange and exact-origin controls;
- independent outbox records and idempotency per device;
- minimal lock-screen content with PII retained behind authenticated Lead Center access;
- a copy-device-only `[TEST]` send path;
- test-lead suppression.

Runtime health reports Push and phone setup ready. Physical browser permission and device receipt cannot be completed autonomously without the device owner.

### 6.7 Carrier SMS/MMS — BUILT ADAPTER, NOT ACTIVE

Twilio-compatible provider, status webhook, inbound STOP/HELP handling, recipient roles, message IDs, retries, and signed callback validation exist. Carrier SMS remains off because legitimate U.S. SMS is not permanently free and requires an approved registered sender/provider and carrier-compliance path.

Production-safe rules already exist:

- QA leads are suppressed;
- internal SMS excludes consumer name, contact data, full address, free text, consent text, and click IDs;
- primary and copy recipients have separate idempotency/delivery records;
- BCC/copy is not assignment;
- MMS visuals are disabled by default;
- enabling internal SMS never changes the public brokerage telephone number.

### 6.8 Consumer acknowledgment and nurture — NOT YET RELEASED

Production contains permission and template foundations, but a consumer acknowledgment must not be claimed live until atomic intent creation and provider delivery are proven.

The local reconstructed candidate adds:

- `capture_public_lead_v3` wrapping the existing v2 capture transaction;
- conditional creation of one `consumer_ack` outbox intent only when stored email and exact affirmative consent evidence permit it;
- hard test/suppression checks;
- version-pinned `consumer_ack_email_v1`;
- retry refusal when consent evidence or template support is missing;
- readiness proof for the v3 function.

This candidate is **uncommitted and unverified after reconstruction**. An earlier, OS-cleaned temporary version had strong local proof, but that historical result is not proof of the reconstructed files. Fresh tests and PostgreSQL 17 contract verification are mandatory.

### 6.9 WordPress and Gravity Forms — PARTLY LIVE, CONTROLLED EXPANSION READY

Current architecture preserves Our Town Properties as the brokerage, SEO, listings, agents, rental, FlexMLS/IDX, and local-trust surface. WordPress is a bridge, not a second lead source of truth.

Current evidence:

- Our Town homepage is live and displays public brokerage number `252-243-7700`.
- A source-tagged Ask Magic Mike homepage CTA exists in HTML but its `.amm-cta` container is hidden by `display:none !important`; the floating widget is also suppressed.
- The Home Value page contains a source-tagged Ask Magic Mike `/value` link; `/value` correctly redirects to `/home-value`.
- The Ask Mike page loads `https://www.askmagicmike.com/embed/amm-loader.js`; the loader and `/embed/ask` return HTTP 200.
- Prior authenticated evidence records the signed Canonical Bridge enabled for Gravity Form 3 only, with the duplicate native Form 3 admin notification inactive.
- Form 7 entry 1550 remains on a no-contact/BIC-review hold because purpose/consent is unclear.
- Forms 1, 2, and 4–7 must not be bulk-forwarded until each field map and consent contract is approved.

PR #248 source-controls connector 1.1.0, adds constrained per-shortcode UTM attribution, hash-pinned install/rollback packages, a non-sensitive public version marker, and fail-closed placement readiness. It does not itself modify WordPress.

### 6.10 Analytics, attribution, and growth operations — LIVE FOUNDATION; EXTERNAL ACTIVATIONS GATED

The system can:

- persist first/last touch and UTMs in the lead record;
- record PII-minimized funnel and widget events in Neon;
- keep canonical `lead_created` server-authored;
- reject browser-authored privileged conversion outcomes;
- exclude test/private traffic;
- report source, campaign, placement, qualified lead, first-response, outcome, and revenue evidence;
- manage deterministic experiments and protected experiment events;
- preview and, when feature-gated and approved, atomically import bounded marketing-spend, organic-search, and local-profile aggregate evidence;
- generate owned-demand assets and WordPress change-set packets without publishing them;
- record immutable publication proof only after a real native action is performed.

Cross-domain GA4/GTM code exists, but the documented WordPress tag-before-consent order remains a hold. Do not enable cross-domain advertising/measurement until the consent-order repair and authenticated GTM/GA4 configuration pass.

No GBP, social, email-signature, QR, paid-media, or vendor action is live merely because an asset or publication packet exists.

### 6.11 AI capability — BUILT AS ASSISTANCE, NOT DECISION AUTHORITY

The repository includes:

- a server-side public chat adapter with an OpenAI-compatible key/model boundary;
- AI lead-summary/intelligence records and usage audit tables;
- a protected Operations Copilot and durable job queue;
- prompt registry, output schemas, safety reviews, and data-handling rules;
- synthetic provider contract labs;
- AI-generated marketing asset records.

AI may summarize, draft, recommend, and help an operator review. It must not independently determine assignment, score, protected-class targeting, legal conclusions, valuation, guaranteed offer, response promises, external publication, spend, or consumer sending.

The public AI/provider path was not invoked in this audit; provider runtime enablement must be proven separately without exposing the key.

### 6.12 Visual system — LIVE AND EXTENSIBLE

The current Black Diamond design system provides a dark black/gold/red identity, mobile-first funnel layouts, brand assets, social previews, widget visuals, and internal lead-alert hierarchy.

The supplied HOT/ACTIVE/NEW lead examples informed the system, but runtime alerts correctly keep changing lead facts as selectable HTML/plain text rather than burning PII or synthetic facts into a static image. Score-band backgrounds are deterministic. SMS remains text-first. Video generation is intentionally outside the critical notification path because it increases latency, accessibility risk, and provider variability without improving routing.

Future image/video generation should be used for reviewed public marketing, explainers, open-house assets, and social variants—not as a dependency for durable lead capture or urgent internal delivery.

### 6.13 Security, privacy, and compliance — LIVE CONTROLS

Implemented controls include:

- server-side validation and normalization;
- honeypot and durable rate limiting;
- origin/CORS/frame-ancestor restrictions;
- signed WordPress and provider webhooks;
- idempotency and atomic database functions;
- secure cookies, session revocation, RBAC, and assigned-lead scope;
- PII-minimized analytics and phone notifications;
- exact consent evidence and channel suppression;
- append-only audit, provider event, outcome, and publication-proof records;
- environment-only secrets;
- no client exposure of `DATABASE_URL` or provider keys;
- test-lead exclusion;
- Fair Housing/protected-class restrictions;
- no unauthorized MLS/private-field exposure;
- no automated appraisal, guaranteed value, guaranteed offer, or fabricated inventory.

Legal/BIC review remains necessary for material seller claims, marketing consent, territory promises, response times, direct-purchase language, and communication campaigns.

### 6.14 Capability horizon — what becomes possible after the remaining gates

| Future operating capability | Existing foundation | Missing gate or dependency |
| --- | --- | --- |
| Atomic consumer receipt after every eligible capture | Permission engine, templates, email provider, durable outbox, reconstructed v3 capture | Fresh local proof, Draft PR, additive migration, application release, first-send approval |
| Fully atomic provider delivery lifecycle | Resend/Twilio webhook routes and Draft #272–#274 hardening | Consolidated current-main release; provider must remain configured correctly |
| Automatic bounded notification recovery | Durable outbox, retry API, Draft stale-pending/retry cron | Consolidated notification-operations release |
| Live primary/copy carrier SMS | Twilio adapter, safe templates, status and inbound consent handlers | Paid registered provider/sender, secrets, carrier approval, test acceptance |
| Immediate free phone alerts to approved devices | Web Push provider and secure install flow | Each device owner's physical enrollment and `[TEST]` acceptance |
| Visible source-tagged owned-traffic placements across Our Town pages | WordPress bridge, connector package, placement manifests, rollback packets | PR #248, plugin upgrade, then page-specific publication approvals |
| Reliable open-house QR registrations | Dynamic open-house route, bounded packet work in Draft stack | Current-main consolidation, property/host mapping, publication/distribution approval |
| Cross-domain GA4 session continuity | First-party event ledger, GTM boundary code, shared attribution | WordPress consent-order repair and authenticated GTM/GA4 configuration |
| `hub.ourtownproperties.com` branded Lead Center | Existing authenticated `/admin` application | DNS and Vercel domain mapping approval; no new app required |
| Agent-specific routing beyond Mike | Assignment engine and RBAC/object scope | Approved roster, explicit listing/open-house mappings, agent acceptance |
| CRM synchronization | Adapter boundary and sync log | Approved CRM account, scoped credentials, field map, contract and privacy review |
| Provider-backed listing/property alerts | Listings schema, private-field separation, adapter scaffolding | MLS/provider contract, licensed field/display rules, consumer alert permission |
| Measured zero-spend growth experiments | Growth command center, source reporting, experiment and publication-proof ledgers | Real owned placements, sufficient genuine traffic, owner-reviewed hypotheses |
| AI-assisted operator summaries and drafts | OpenAI boundary, Copilot jobs, prompt/output/audit records | Provider/runtime proof, per-use safety review, human approval for external use |
| Scaled public image/video content | Brand system, deterministic asset studio, AI media workflow options | Approved campaign brief, identity/likeness rights, BIC review, publication approval |

None of these requires replacing the lead database, public app, Lead Center, or WordPress site.

## 7. Route and service inventory

The canonical root `app/` router declares **100 expected routes**: 28 public, 17 admin, 4 authentication, and 46 API routes, plus framework assets. There are 22 acknowledged root/`src` duplicates; root `app/` is canonical and `src/app` must not be reactivated piecemeal.

### Public routes

`/`, `/home-value`, `/value`, `/sell`, `/we-buy-houses`, `/ask`, `/buy`, `/rent`, `/open-house/[propertyOrId]`, `/thank-you`, `/plan`, `/contact`, `/privacy`, `/terms`, `/accessibility`, `/go/[code]`, `/widget`, `/widget/v1`, `/widget-preview`, `/embed/ask`, `/integrations/ourtownproperties`, `/social-preview`, `/phone-alerts/install/[token]`, `/phone-alerts/install/[token]/manifest.webmanifest`, `/phone-alerts/setup`, `/phone-alerts/setup/claim`, `/robots.txt`, `/sitemap.xml`.

### Protected admin routes

`/admin`, `/admin/leads`, `/admin/leads/[id]`, `/admin/action-queue`, `/admin/allocation`, `/admin/distribution`, `/admin/experiments`, `/admin/growth`, `/admin/growth/vendor-ingress`, `/admin/growth/local-profile-ingress`, `/admin/growth/search-ingress`, `/admin/growth/spend-ingress`, `/admin/message-previews`, `/admin/notifications`, `/admin/notifications/phone`, `/admin/reporting`, `/admin/revival`.

### Authentication routes

`/lead-center-login`, `/lead-center-password-help`, `/lead-center-set-password`, `/api/lead-center-auth/[...all]`.

### Lead, event, and consumer APIs

`POST /api/leads`, `POST /api/events`, `POST /api/widget/events`, `POST /api/appointments/request`, `/api/chat`, `/api/chat/session`, `/api/chat/message`, `/api/experiments/event`, `/api/listings/search`, `/api/listings/[id]`, `/api/valuation`.

### Admin APIs

The admin API covers lead list/detail/update, assignment, communication permission, notes, tasks, sequences, notification retry, message templates, first-live monitoring, SLA sweeps, QA email, health, reporting/growth views, distribution assets/change sets, provider-ingress preview/commit, and Copilot jobs.

### Provider and device APIs

`/api/webhooks/email/events`, `/api/webhooks/sms/status`, `/api/webhooks/sms/inbound`, `/api/phone-alerts/invite`, `/api/phone-alerts/subscription`, `/api/phone-alerts/test`, plus protected admin variants.

### Scheduled operations

Vercel cron currently schedules:

- SLA sweep hourly;
- first-live operations monitor every two minutes;
- Copilot job processing hourly at minute 15.

GitHub runs the bounded public Production monitor every six hours and after successful Production deployment events.

## 8. Data platform inventory

The migration set contains **39 versioned SQL files**, **70 distinct tables**, and **26 named PostgreSQL functions**. The `supabase/migrations` path is historical naming; canonical runtime is Neon PostgreSQL.

### Core durable domains

- **Identity and funnel:** sessions, contacts, contact identities, leads, properties, source attribution, consent.
- **Qualification and routing:** lead scores, routing, agents, assignments, tasks, appointments, first-response milestones, outcomes.
- **Communication:** permissions, decisions, events, messages, templates, sequence instances/runs, notifications, deliveries, provider webhooks, Push subscriptions, compliance flags.
- **Admin/auth:** Lead Center users/accounts/sessions/verifications/rate limits, audit logs, saved views.
- **Analytics/growth:** analytics events, experiments/assignments/events, campaigns, channels, spend, organic-search batches, local-profile batches, market signals/opportunities/recommendations, publication proofs.
- **AI:** intelligence records, jobs, and usage events.
- **Listings/valuation:** listings, photos, confidential listing fields, FlexMLS imports, matches, properties, valuation reports.
- **Integrations:** CRM sync log, integration accounts, webhook events, vendor-ingest events.
- **Security/operations:** durable rate-limit buckets and immutable/audited mutation functions.

Critical functions provide atomic public capture, appointment idempotency, assignment, lead status/outcome mutation, notes/tasks, SLA/first-response recording, owned-demand proof, and bounded growth imports.

## 9. Git and release landscape

### 9.1 Accepted Production

- PR #247 merged on 2026-09-01.
- Merge commit: `a2f3de834830f600df106dbf5836ae4bbde4eb4a`.
- Tree: `0065f829fc94f87ab5e0faf596c8e56733be3972`.
- Production deployment: `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U`.
- Current public health and scheduled monitors pass.

### 9.2 Current clean application candidate

PR #248 — `WordPress Connector 1.1.0 attribution and fail-closed readiness`

- state: OPEN, non-Draft, CLEAN/MERGEABLE;
- base: current Production merge `a2f3de8...`;
- exact head: `f6134b71f258003aa5dc201cf5ef7cdb6eb61ee7`;
- tree: `832be2750355391f9198fcaaaa6f46bb3beb8b3f`;
- exact-head release gate: passed;
- immutable Preview: `dpl_2WE8ftPXZDrnkGdzVKtU2bzBnSBQ`, Ready;
- 0 migrations, 0 environment/secret changes, 0 external mutations;
- application rollback: current Production `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U`.

Its exact application-only approval phrase is:

```text
APPROVE PHASE 9 CONNECTOR READINESS APPLICATION PR 248 MERGE AND SAME-TREE PRODUCTION DEPLOYMENT
```

That phrase does not authorize a WordPress plugin upgrade, page edit, cache purge, database change, form submission, message, provider action, DNS change, publication, spend, deletion, or NellySelly action.

### 9.3 Open Draft dependency train

PRs #249–#274 are an ordered stack, not 26 independent Production candidates.

| PR range | Capability present in Draft code | Production truth |
| --- | --- | --- |
| #249–#254 | Release authority, launch command center, Ask consent, WordPress capture/form cutover controls | Draft only; must be rebased/reviewed after #248 |
| #255–#259 | Page-specific rollback contracts, seller-decision evidence, open-house QR packets, response action queue, rental placement readiness | Draft only |
| #260–#264 | First-response coverage/SLA cadence, retry cron, stale-pending recovery, atomic lead-alert intent | Draft only |
| #265–#271 | Appointment, public chat/provider/session, analytics/event, lead, and experiment ingress hardening | Draft only |
| #272 | Atomic Resend webhook lifecycle | Draft; exact-head Release Gate passed on `933cf730...` |
| #273 | Atomic Twilio status callbacks | Draft; exact-head Release Gate passed on `dca35b2...` |
| #274 | Atomic inbound SMS consent/opt-out lifecycle | Draft; exact-head Release Gate passed on `cd259391...` |

Do not merge this stack one PR at a time without first recalculating unique diffs against current `main`. It predates the current handoff and contains overlapping authority/evidence commits.

### 9.4 Local reconstructed consumer acknowledgment

The worktree `/Users/brandonnarron/.codex/worktrees/ask-magic-mike/consumer-ack-20260928` contains 13 modified tracked files and three untracked files. It is based on the PR #274 head. It is not committed, pushed, PR'd, or freshly verified. Preserve it before any machine change.

### 9.5 Documentation drift

`docs/CURRENT_RELEASE_AUTHORITY.md`, `config/current-release-authority.json`, `README.md`, and several operational ledgers on current `main` still describe PR #246/PR #247 pre-merge state. PR #248 updates these records. Until #248 is accepted, external authenticated evidence and Git history outrank those stale statements.

## 10. No-rework consolidation plan

### Step 1 — reconcile authority, do not add features

Freshly revalidate PR #248 against current `origin/main`, its Preview, its exact head/tree, and current Production rollback. If unchanged and green, present only its exact application gate. Merge/deploy only after that exact approval.

### Step 2 — establish one post-#248 integration branch

After #248 is accepted, create a fresh integration branch from the resulting `main`. Produce a unique-commit/diff manifest for PRs #249–#274. Classify every file as:

- already Production;
- unique and still required;
- superseded by newer code;
- evidence/documentation only;
- unsafe or obsolete;
- requires a separate migration/provider/WordPress gate.

### Step 3 — port capabilities in bounded batches

Recommended batches:

1. **Release truth and public/admin ingress hardening** — authority reconciliation plus public lead/event/chat/appointment/experiment boundaries.
2. **Durable notification operations** — retry cron, stale-pending recovery, atomic lead-alert intent, Resend lifecycle.
3. **SMS consent/status foundation** — keep provider disabled; release callback/opt-out safety separately from carrier activation.
4. **WordPress/open-house/rental placements** — application readiness first; each actual WordPress publication remains its own reversible gate.

Each batch gets one clean PR from current `main`, one migration manifest, one exact-head release gate, one immutable Preview, one rollback, and one approval phrase. Do not force-push the old stack or delete its branches before evidence is preserved and the owner separately approves archival.

### Step 4 — finish consumer acknowledgment as its own PR

Do not mix the local consumer-ack candidate into the large Draft train. Re-run focused tests, strict typecheck, migration static checks, and exact PostgreSQL 17 execute/replay/failure rollback proof. Then create a small Draft PR with a no-send Preview and a separate database-migration/application gate. Provider enablement and the first real consumer send remain later gates.

### Step 5 — activate owned traffic one surface at a time

Recommended order after application readiness:

1. connector 1.1.0 plugin upgrade with byte/hash backup and rollback;
2. Home Value page 3952 source-tagged CTA publication;
3. controlled public/browser acceptance;
4. We Buy Homes page 3631;
5. homepage visible placement repair;
6. Mike agent page, selected rental/listing surfaces, then open-house QR distribution.

Do not bulk-inject a sitewide widget until page-specific layout, consent, performance, and conversion proof pass.

## 11. Completion timeline estimates

These are engineering estimates, not promises. External review, carrier registration, DNS propagation, owner availability, and genuine traffic can extend them.

| Work package | Estimated elapsed engineering time | Dependency |
| --- | ---: | --- |
| Handoff adoption and fresh drift check on current Mac M4 | 2–4 hours | Legitimate sessions remain valid |
| Refresh authority docs and revalidate PR #248 | 0.5 day | Current head/tree unchanged |
| PR #248 merge + same-tree Production acceptance | 0.5–1 day | Exact owner gate; no unexpected CI/runtime drift |
| Draft #249–#274 unique-diff/consolidation manifest | 0.5–1 day | #248 accepted first |
| Repackage and verify Draft stack in 3–4 clean batches | 2–4 engineering days | One heavy pipeline at a time |
| Consumer-ack reconstruction verification and Draft PR | 0.5–1.5 days | PostgreSQL 17 and no-send Preview |
| Consumer-ack migration/application release | 0.5–1 day | Separate database + deploy approval |
| First controlled consumer acknowledgment | 1–2 hours after release | Exact send approval and eligible consented test case |
| Connector 1.1.0 WordPress upgrade | 2–4 hours | Separate plugin gate, backup, hash verification |
| Home Value page publication and controlled QA | 2–4 hours | Plugin marker/readiness pass and page-specific gate |
| Remaining WordPress placement rollout | 0.5–1 day per small group | Measured performance and rollback proof |
| Web Push enrollment | 30–90 minutes per device owner | Physical-device permission and test-send approval |
| Carrier SMS technical activation | 1–3 engineering days | Paid provider/account/sender available |
| Carrier registration/vendor delay | 1–10+ business days | Provider/carrier, outside engineering control |
| Cross-domain consent and GA4/GTM activation | 1–2 days | WordPress consent-order remediation and authenticated analytics review |
| `hub.ourtownproperties.com` alias | 2–4 hours plus propagation | DNS/domain mapping approval; app auth already exists |
| Post-launch visual/performance/conversion optimization | 7–14 days of measured iteration | Real traffic and enough eligible sample size |
| First genuine public prospect | Unbounded | Depends on a real human and traffic; never fabricate |

## 12. Machine placement options

### Option A — keep Ask Magic Mike on the current Mac M4 (**recommended**)

Why:

- it is already the recorded owner-assigned machine for Ask Magic Mike;
- valid GitHub/Vercel/Neon/WordPress history and local rescue work exist here;
- the canonical services are cloud-hosted, so the Mac is an engineering workstation, not a Production server;
- moving now creates the greatest risk to the uncommitted consumer-ack candidate and local evidence;
- M4/16 GiB is sufficient when one heavy pipeline runs at a time.

Required improvements:

- keep canonical work in persistent paths, never `/private/tmp`;
- use Node 24.18.0 explicitly for release proof;
- use PostgreSQL 17.11 explicitly for migration contracts;
- free additional internal disk space before large Playwright/build/database runs;
- archive completed worktrees only after changes and evidence are accounted for;
- do not copy NellySelly environments or caches into this project.

### Option B — owner-reassigned dedicated Apple-silicon Mac

Use only if the owner explicitly changes the project-to-machine assignment and establishes a legitimate session on that machine.

Recommended minimum:

- Apple Silicon M-series;
- 16 GiB RAM minimum, 32 GiB preferred for concurrent browser/database work;
- at least 100 GiB free internal SSD;
- current supported macOS;
- reliable backup and encrypted disk;
- Node 24.18.0, pnpm 10.30.3, PostgreSQL 17.11, Git, GitHub CLI, Vercel CLI, PHP CLI, and Playwright browser runtime.

The existing Mac mini is currently assigned to Barton Miracle/book and PurposeJoy. It must not be commandeered for Ask Magic Mike without explicit reassignment and a legitimate session there.

### Option C — cloud/devbox or hosted CI as supplementary capacity

Useful for clean builds and parallel read-only verification, but not recommended as the sole owner workstation. GitHub Actions already performs the canonical release gate and Production monitor. A devbox must not become a second secrets store, a parallel database, or an ungoverned deployment path.

## 13. Exact machine handoff procedure

### Phase A — freeze and preserve on the current Mac

1. Stop creating new feature branches.
2. Record `origin/main`, current Production deployment, PR #248 head/tree, all open PR heads, and worktree status.
3. Finish, commit to a rescue branch, or create a secret-free hashed patch bundle for every uncommitted Ask Magic Mike change. Do not copy the working directory wholesale.
4. Confirm no `.env*`, credentials, provider tokens, database URLs, browser profiles, Codex sessions, caches, or keychains enter any patch/archive.
5. Push preserved commits/branches to the canonical remote only after reviewing for secrets.

### Phase B — establish the selected machine

1. Verify model/chip, architecture, OS, RAM, free disk, and required mounts.
2. Establish legitimate owner sessions. If login, MFA, CAPTCHA, email verification, or secure secret entry appears, pause for takeover.
3. Clone `https://github.com/brandonnarron1-lang/ask-magic-mike.git` into a persistent project path.
4. Verify repository identity before installing or executing anything.
5. Install the pinned runtime/toolchain; do not reuse incompatible binaries or copied `node_modules`.

### Phase C — restore access safely

1. Authenticate GitHub CLI to the canonical account and verify ruleset visibility.
2. Authenticate Vercel CLI and link only project `prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8` in team `eyes-up-industries`.
3. Authenticate Neon to project `bitter-star-20214385`; do not copy a connection string from another project.
4. Confirm WordPress/cPanel access without logging out existing sessions.
5. Re-enter required secrets only through Vercel/hosting/provider secure interfaces. Never transfer `.env` files, keychains, or secret-bearing shell histories.
6. Keep the private BCC and internal phone recipients in secure variables; do not put them in documentation or chat.

### Phase D — prove equivalence before adopting the machine

Run, in order and one heavy pipeline at a time:

```bash
pnpm install --frozen-lockfile
pnpm run release:doctor
pnpm run release:safety
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run routes:assert
pnpm run amm:verify:isolation
pnpm run smoke:prod
pnpm run amm:verify:health
pnpm run amm:verify:funnel
```

Then prove:

- current `origin/main` and Production deployment identity;
- anonymous/private auth boundary;
- no NellySelly cross-system marker;
- Preview-only database targeting before any mutation test;
- no secret in Git history or generated artifacts;
- WordPress remains unchanged;
- current Mac remains the rollback workstation until acceptance is signed.

### Phase E — adoption receipt

Record a machine-adoption receipt containing only:

- machine model/chip/OS/RAM/free disk (no serial or hardware UUID);
- canonical repo path, remote, branch, commit/tree;
- Vercel project ID and non-secret deployment ID;
- Neon project/branch/database names, never a credential;
- toolchain versions;
- commands and pass/fail results;
- known unverified areas;
- rollback machine/path;
- explicit owner reassignment date.

Do not retire the old machine or delete a worktree until the new machine passes the same meaning of checks—not weaker substitutes.

## 14. Approval and human-action boundaries

Even with broad autonomy, the following remain separate, exact gates because they change live external state or communicate with people:

- merge/deploy PR #248 or any future application PR;
- live Neon migration or production-data change;
- Vercel environment/secret change;
- WordPress plugin/page/form/menu/widget save or cache purge;
- DNS/domain mapping;
- first real internal QA email/Push/SMS for a new release;
- any consumer acknowledgment, nurture, or sequence send;
- carrier SMS/provider purchase or registration;
- social/GBP/email/QR publication;
- paid traffic or vendor purchase;
- deletion/merge/import of Production lead data;
- NellySelly action.

Login, MFA, CAPTCHA, identity verification, or secure credential entry requires human takeover. Credentials must never be requested in chat.

## 15. Known risks and controls

| Risk | Current control | Required next action |
| --- | --- | --- |
| Release-authority docs lag actual Production | Git/Vercel/runtime truth recorded here; PR #248 reconciles | Revalidate and decide #248 |
| 26-PR Draft stack encourages blind merging | All remain Draft and branch history is preserved | Create unique-diff manifest and fresh batches |
| Uncommitted consumer-ack work exists only locally | Persistent worktree and branch preserved | Verify, commit, push Draft PR or create safe patch before machine move |
| WordPress homepage CTA exists but is hidden | Fail-closed placement readiness | Use connector/page-specific gate; do not claim it is visible |
| Form 7 consent/purpose unclear | Entry preserved without contact | BIC/owner field-purpose and consent decision |
| Public phone conflict in historical assets | Live site consistently shows `252-243-7700` | Keep that public number; do not publish historical `252-245-4337` without explicit owner decision |
| Carrier SMS has cost/compliance dependency | SMS feature flags off; Web Push free-first | Select/register provider only after owner approval |
| Cross-domain analytics consent order | External tag activation held | Repair WordPress consent order, then authenticated GTM/GA4 QA |
| Facebook crawler blocked by server-global Apache policy | Narrow account-level test rolled back | Root/WHM path/method-specific remediation or use AskMagicMike.com links |
| Local disk and mixed tool versions | Pinned Node/PG versions installed | Use explicit binaries; one heavy pipeline at a time; free disk |
| Genuine-demand evidence absent/limited | Test records suppressed and excluded | Activate owned traffic after pipe/release proof; never fabricate a prospect |

## 16. Recommended completion sequence

### Ticket 1 — authority reconciliation and PR #248 decision

Freshly verify PR #248 exact head/tree, current Production deployment, Preview, checks, rollback, and zero-delta claims. If unchanged, request only its exact application gate and complete same-tree Production acceptance.

### Ticket 2 — post-#248 Draft-stack consolidation

Create one machine-readable unique-diff manifest for PRs #249–#274 and propose 3–4 clean current-main integration batches. Do not merge, force-push, close, or delete old branches during the audit.

### Ticket 3 — consumer acknowledgment atomicity

Resume the preserved local worktree, run fresh focused/unit/type/SQL/PostgreSQL 17 proof, repair any failures, and open a Draft PR with no-send Preview evidence. Keep migration, application deployment, provider enablement, and first consumer send as distinct gates.

## 17. Audit limitations

- No authenticated private lead rows were read.
- No real or QA lead was submitted.
- No email, SMS, Web Push, or consumer message was sent.
- No WordPress admin setting was changed or treated as verified merely because a browser tab was open.
- No Neon plan/billing detail was re-read; the owner has reported a Neon Launch upgrade.
- No GitHub billing detail was re-read; the owner has reported a GitHub Enterprise upgrade.
- No provider secret value, private BCC, private phone recipient, credential, database URL, or token was displayed or recorded.
- The reconstructed consumer-ack work was not verified because the user redirected the task to this handoff audit after an earlier test command was interrupted.

## 18. Evidence commands used

Representative read-only commands:

```text
git fetch origin --prune
git status --short --branch
git worktree list --porcelain
git show -s origin/main
gh auth status
gh pr list --state open --limit 100 --json ...
gh pr checks 248
gh pr view 247
gh pr view 248
gh run list --branch main --limit 12 --json ...
vercel project inspect ask-magic-mike --scope eyes-up-industries
vercel ls ask-magic-mike --prod --scope eyes-up-industries
vercel inspect <deployment> --scope eyes-up-industries
curl -I / curl GET against canonical public, health, sitemap, widget, auth, and WordPress surfaces
node scripts/amm/verify-system-isolation.mjs
```

The companion next-agent prompt is:

`docs/ASK_MAGIC_MIKE_NEXT_CODEX_PROMPT_2026-09-28.md`
