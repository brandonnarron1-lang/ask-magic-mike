# Lead command desk — reviewable source contract

Prepared November 6, 2026. This document describes the implementation, not a
Production release, activation approval or observation of customer demand.

## Operator path

`/admin/today` groups the existing authorized Today action queue into one card per
inquiry. Open the protected request, review actual owner and current permission,
then use an existing server-authorized internal action. Detail keeps the contact
disclosure and fresh exact-destination checks. Opening a composer, completing a
task, provider acceptance and a recorded human response are separate events.
Rejected inline saves retain their explanation and version fence until the
operator explicitly reviews the latest record; only successful saves invalidate
the Today cache. The fresh server/SQL role, assignment and CAS checks are unchanged.

`/admin/leads` retains bounded inbox pagination and authenticated POST-body search.
Changing a search clears prior results; aborted or late requests cannot replace
the current search. Search terms are not added to a URL.

## Explainable order: `operator_action_v1`

Existing actionable overdue task → delivery exception → missing owner review →
recorded appointment/request → other due task → other existing open work.
Due timestamps and stable inquiry/action identities resolve ties. Legacy lead
score, name, geography, financing and absent optional answers do not rank this
desk. The rubric does not predict conversion or grant contact/assignment rights.

Suppression, test records, terminal/NO FOLLOW-UP status, missing contact methods,
unestablished contact permission and inherited read-only access cannot become
contact-task recommendations. Terminal/test work is excluded; held records can be
reviewed internally in the held view. Notification review does not authorize a
retry. UNKNOWN effects require existing reconciliation, never a fresh identity.

Counts refer to returned inquiries with existing open actions, not all inquiries,
people, completed work or conversion. Filters overlap. The existing six bounded
query contracts and sentinel limits remain; only 25 cards render per page. Any
required read failure is unavailable, not empty. Limited coverage holds queue
mutations. No new database table, migration, provider, runtime binding or query
per inquiry is introduced.

## Assignment and evidence

The existing admin-only qualification simulation is a collapsed **ADVISORY ONLY**
drill-in. Actual ownership is preserved. Missing professional/coverage/acceptance
evidence stays missing. Its output is NOT ASSIGNED and creates no offer, timer,
enrollment, notification or routing effect. Allocation runtime gates are unchanged.

Time to first human response comes only from the existing immutable response
milestone and actual inquiry capture timestamp. Missing/invalid values remain
unknown. A task completion or last-contact timestamp is not substituted.

## Local verification

Focused tests: `pnpm exec vitest run tests/adminops/lead-command-desk*.test.*
tests/adminops/lead-operator-brief.test.ts --maxWorkers=1 --no-file-parallelism`.

After `pnpm run build`, the existing owned local harness supports:

```sh
AMM_QA_POSTGRES_TEST=1 AMM_QA_NATIVE_POSTGRES_TEST=1 \
AMM_COMMAND_DESK_ACCEPTANCE=1 AMM_E2E_BUILT=1 \
AMM_SESSION_ARTIFACT_DIR="$PWD/.amm-run/lead-command-desk/attempt01" \
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/amm/reference-session-acceptance.mjs
```

Use a credential-free shell and Node24. The native mode requires the already
installed compatible PostgreSQL17 binaries; default container mode uses the
existing test infrastructure. This is not hosted PostgreSQL18 or Production
acceptance. The command desk mode skips allocation-policy activation, operational
enrollment and offer creation, disables transports/workers, rejects external
fetches, and records no-effect invariants. All accounts/data are synthetic in an
owned temporary local cluster. Its finally block stops and removes only that
owned cluster. Physical iOS/Android acceptance remains separate.

## Release boundary

The branch is deployment-excluded in `vercel.json`. This slice is source review
only: no merge, deployment, migration, configuration, live lead mutation, consumer
communication or hosted QA provisioning. Accepted PR323 remains the fallback;
compatibility is additive UI/read projection over its existing contracts. New
exact-source release disposition and required connected/actual-merge acceptance
must precede any future Production effect. No prior QA allowance is renewed.
