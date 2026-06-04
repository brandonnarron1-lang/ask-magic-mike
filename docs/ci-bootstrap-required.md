# CI bootstrap required

GitHub Actions has a structural rule: a workflow with a
`workflow_dispatch` trigger only becomes dispatchable from the
**Actions** tab once the workflow file exists on the repository's
**default branch**.

The release-hardening branch introduces two workflows:

- `.github/workflows/release-gate.yml`
- `.github/workflows/preview-qa.yml`

`release-gate.yml` runs on `pull_request` and on `push` to the
release-hardening branch (and to `main`). It is already running
correctly: GitHub picks up the workflow from the feature branch via
the `pull_request` event.

`preview-qa.yml` is `workflow_dispatch` only. Until that file is on
`main`, the **Run workflow** button does not appear in the GitHub UI,
and `gh workflow run "Ask Magic Mike Preview QA"` returns "could not
find any workflows named …" because no record exists on the default
branch.

## What this means

- **No CI bypass.** Skipping branch protection or back-dooring a
  preview promotion still requires real human action.
- **The `pull_request` Release Gate is enforceable today.** It will
  run on every PR including ones not destined for `main`.
- **The `workflow_dispatch` Preview QA needs one preliminary action.**

## Two safe paths to bootstrap

### Option A — merge this PR

After human review of the PR, merge it. That puts the workflow files
on `main`. Future PRs gain access to the manual Preview QA workflow
immediately.

This is the simplest path because the PR already contains the entire
release system. Branch protection on `main` can then be configured to
require the Release Gate check on subsequent PRs.

### Option B — surgical bootstrap PR first

If the operator wants `workflow_dispatch` *before* merging the full
release-hardening PR, they can:

1. From `main`, create a tiny branch.
2. Cherry-pick **only** the two workflow files and (optionally) this
   doc.
3. Open + merge that minimal bootstrap PR.
4. Rebase the full release-hardening branch on top.

This is slower but isolates the CI plumbing from the larger code
diff. It does not change what either workflow does.

## Required GitHub secrets

In either path, the Preview QA workflow needs three repo secrets
**before** it can fully pass:

| Secret | Where to find |
| --- | --- |
| `ADMIN_SECRET`                     | Vercel preview env |
| `CRON_SECRET`                      | Vercel preview env |
| `VERCEL_AUTOMATION_BYPASS_SECRET`  | Vercel Project → Settings → Deployment Protection → Protection Bypass for Automation |

Add them at:

```
https://github.com/brandonnarron1-lang/ask-magic-mike/settings/secrets/actions
```

Without these, Preview QA still runs and produces a report — it just
fails at the access-precheck step with the documented missing-bypass
message. That is not a code defect.

## After bootstrap

Confirm via:

```
gh workflow list                       # both workflows visible
gh workflow view "Ask Magic Mike Preview QA"
```

Then trigger:

```
gh workflow run "Ask Magic Mike Preview QA" \
  --ref platform/phase-2-release-hardening \
  -f preview_url="" \
  -f wait_for_preview="true" \
  -f run_browser_e2e="true" \
  -f safe_db_write="false"
```

The workflow will fail at step 1 if `safe_db_write` is anything other
than `false`. That is intentional — controlled mutation QA is
documented in `docs/controlled-preview-mutation-qa.md` and is a
manual procedure, never CI.

## Branch protection (recommended, post-bootstrap)

Once the Release Gate has run on `main`, configure:

- Settings → Branches → Branch protection rules → `main`
- Require status checks: `Ask Magic Mike Release Gate / local-release-gate`
- Require PR review (≥ 1 reviewer)
- Block force pushes

The release-safety scanner already enforces the rule that no
production promotion workflow exists. Branch protection makes
unauthorized merges to `main` impossible too.
