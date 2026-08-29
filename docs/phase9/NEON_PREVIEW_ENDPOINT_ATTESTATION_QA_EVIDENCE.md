# Neon Preview endpoint attestation QA evidence

Date: 2026-08-23 EDT

Release candidate: Draft PR #209

Production mutation: none

## Outcome

Preview mutation authority is now bound to the actual Neon endpoint parsed
from the server-only `DATABASE_URL`. Environment labels and write toggles cannot
authorize a Preview write unless all of these facts are true:

- Vercel and database labels both explicitly identify Preview;
- expected Preview and Production endpoint IDs are valid and distinct;
- the parsed endpoint is a valid Neon PostgreSQL endpoint;
- the parsed endpoint exactly matches Preview;
- the parsed endpoint does not match Production;
- Preview data mode and the separate mutation opt-in are enabled;
- the canonical schema is reachable; and
- live email and SMS are disabled.

The same endpoint attestation is enforced by the application-level Preview
mutation guard, not only by the QA runner. Protected health output contains
booleans and blocker names only; it does not return connection URLs,
credentials, endpoint IDs, recipient addresses, or provider secrets.

## Authenticated infrastructure evidence

Read-only Neon console inspection confirmed one Ask Magic Mike project with
separate branches and computes:

| Environment | Branch | Endpoint | Role |
| --- | --- | --- | --- |
| Production | `br-round-base-auh6h2wd` | `ep-proud-bonus-autwv60g` | default Production branch |
| Preview | `br-morning-paper-aun3378r` | `ep-billowing-paper-au4tdhz8` | isolated child Preview branch |

No connection string, password, token, database row, or NellySelly system was
read or changed during that inspection.

## Verification

| Check | Result |
| --- | --- |
| Focused endpoint/health/write-guard suites | PASS — 5 files / 30 tests |
| Full Vitest suite | PASS — 228 files / 3,054 tests |
| Strict TypeScript | PASS |
| ESLint | PASS |
| Next.js optimized build | PASS — 52 generated pages |
| Route manifest | PASS — 83 active routes / 17 acknowledged duplicates |
| Release safety | PASS — 14/14 |
| Ask Magic Mike / NellySelly deployable-source isolation | PASS |
| Production dependency audit | PASS — no known vulnerabilities |
| Gitleaks | PASS — 571 commits / no leaks |
| `git diff --check` | PASS |

The focused tests cover direct and pooled Neon hostnames, forged and non-Neon
hosts, malformed URLs, missing or invalid expected IDs, equal Preview and
Production IDs, an actual Production endpoint behind Preview labels, exact
Preview acceptance, and no raw identity values in returned attestation data.

## Deliberately not performed

- no Preview write flags enabled;
- no synthetic database write or cleanup;
- no database migration;
- no email, SMS, Push, or consumer acknowledgment;
- no Production environment-variable change, merge, or deployment;
- no WordPress, DNS, domain, or publication change.

Controlled mutation QA remains a separate approval-gated procedure documented
in `docs/controlled-preview-mutation-qa.md`.
