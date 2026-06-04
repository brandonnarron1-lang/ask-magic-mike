# CI bootstrap — Preview QA dispatcher

This doc explains the bootstrap PR that adds the Preview QA
dispatcher workflow to `main`.

## Why this exists

GitHub Actions has a structural rule: a workflow with a
`workflow_dispatch` trigger only becomes dispatchable from the
**Actions** tab once the workflow file exists on the repository's
**default branch** (`main`).

The release-hardening branch
(`platform/phase-2-release-hardening`) ships the full release gate,
including a full preview-QA workflow. But until that branch lands on
`main`, the "Run workflow" button does not appear. Operators cannot
run protected-preview QA from GitHub CI against the release branch
without first merging it — which defeats the point of running QA
*before* merging.

This bootstrap PR closes that gap.

## What this PR adds

- **`.github/workflows/preview-qa-dispatch.yml`** — a minimal
  dispatcher workflow. It is `workflow_dispatch` only. It takes a
  `target_ref` input (default
  `platform/phase-2-release-hardening`), checks that ref out, and
  runs the QA scripts that ship on that ref. It is the smallest thing
  that puts the "Run workflow" button in the GitHub UI.

## What this PR does NOT include

- No application code.
- No release-branch merge.
- No production promotion path.
- No production env-var changes.
- No DB writes. The dispatcher refuses `safe_db_write != "false"` at
  step 1.
- No Phase 3 product features.
- No CRM changes.
- No further workflows. The full release-gate workflow ships with the
  release branch.

## Safety guarantees baked into the dispatcher

1. The first step fails the run if `safe_db_write` is anything other
   than `"false"`.
2. The workflow checks out the caller-selected `target_ref`, not
   `main`. The QA scripts run against the release-branch source.
3. No `vercel promote`, no `git merge`, no `git checkout main` for
   promotion appears in the file.
4. Secrets are read only as `${{ secrets.NAME }}` env vars. The
   values are never echoed.
5. Controlled DB mutation QA is intentionally **not** supported here.
   It is a manual procedure documented on the release branch.

## Required GitHub repo secrets

After this PR is merged, add these in
`Settings → Secrets and variables → Actions`:

| Secret | Source |
| --- | --- |
| `ADMIN_SECRET`                     | Vercel preview env |
| `CRON_SECRET`                      | Vercel preview env |
| `VERCEL_AUTOMATION_BYPASS_SECRET`  | Vercel Project → Settings → Deployment Protection → Protection Bypass for Automation |

Without these, the dispatcher will fail at the preview-access
precheck with the documented "missing bypass" message.

## After this PR merges — exact operator steps

1. Add the three repo secrets listed above.
2. Go to **Actions → Ask Magic Mike Preview QA Dispatch → Run
   workflow**.
3. Inputs:
   - `target_ref`: `platform/phase-2-release-hardening`
   - `preview_url`: leave blank (the workflow runs `preview:wait` and
     selects a commit-matched Ready preview) — OR paste the URL from
     the latest Vercel preview build comment on the release PR.
   - `wait_for_preview`: `true`
   - `run_browser_e2e`: `true`
   - `safe_db_write`: `false` (any other value is rejected)
4. Wait for the run. Download
   `preview-qa-dispatch-artifacts.zip`. Open
   `launch-authority-report.md` first.

The release branch's full `Ask Magic Mike Release Gate` workflow
becomes available automatically once the release PR (#3) merges to
`main`. This bootstrap PR does not replace it — it only unblocks
manual Preview QA while the release PR is still open.

## What does NOT change with this PR

- Production deployment is untouched.
- Production env vars are untouched.
- Production DB is untouched.
- `main`'s application code is unchanged.
- Branch protection on `main` is unchanged (configure it separately
  once the release PR lands).
