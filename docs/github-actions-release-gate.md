# GitHub Actions release gate

Two workflows enforce the release gate in CI:

- `.github/workflows/release-gate.yml` — runs on every PR and push to
  the release-hardening branch + main. No secrets required. Always
  safe to run.
- `.github/workflows/preview-qa.yml` — manual (workflow_dispatch).
  Runs the preview QA + browser e2e against a Vercel preview using
  the required secrets.

No production promotion workflow exists, and none will. Promotion is
a human step.

## Required GitHub secrets (for preview-qa workflow)

| Secret | Source | Notes |
| --- | --- | --- |
| `ADMIN_SECRET`                     | Vercel preview env | required for `/api/admin/health` + admin probes |
| `CRON_SECRET`                      | Vercel preview env | enables the cron-auth SLA sweep probe |
| `VERCEL_AUTOMATION_BYPASS_SECRET`  | Vercel Project → Settings → Deployment Protection → Protection Bypass for Automation | enables protected previews |

## Optional env / repo vars

| Name | Default | Notes |
| --- | --- | --- |
| `VERCEL_PROJECT` | `ask-magic-mike`     | overrides the project name for `preview:find` / `preview:wait` |
| `VERCEL_SCOPE`   | `eyes-up-industries` | overrides the scope |
| `BRANCH_FILTER`  | (current branch)     | narrows `preview:wait` to a specific branch |

## Recommended branch protection

Configure in GitHub → Settings → Branches → main:

- **Require status checks to pass before merging**: yes.
- Required check: `Ask Magic Mike Release Gate / local-release-gate`.
- **Require pull request reviews before merging**: 1 reviewer minimum.
- **Block force pushes**: yes.
- **Require linear history**: optional but recommended.
- **Restrict who can push to matching branches**: only release
  operators.

The preview-qa workflow is intentionally manual — it requires preview
secrets that should not run on every PR.

## How to read the artifacts

Every workflow uploads `artifacts/*.json` and `artifacts/*.md`. The
ones to read:

| Artifact | When |
| --- | --- |
| `release-doctor-report.md`        | Read first. Lists any blocking local failures. |
| `release-candidate-report.md`     | Static + preview-QA aggregate. |
| `launch-authority-report.md`      | Single verdict on the launch ladder. |
| `preview-qa-report.md`            | Detailed preview probe results. |
| `widget-e2e-report.json`          | Playwright stats (expected / unexpected / flaky). |
| `synthetic-monitor-report.md`     | Post-deploy non-mutating probes. |

## Verdict ladder — how to interpret

| Verdict | Means | Next step |
| --- | --- | --- |
| `BLOCKED`          | Local gate or scanner failed; do not push. | Fix the blocking failures listed in the report. |
| `LOCAL_READY`      | Local gate green, preview QA missing or blocked. | Run `preview:qa` against the protected preview. |
| `PREVIEW_READY`    | Preview QA + widget e2e green; mutation gate blocked. | Optional controlled mutation QA; otherwise prepare promotion. |
| `MUTATION_READY`   | Controlled mutation QA passed against a verified safe preview DB. | Review evidence + rollback runbook with a human approver. |
| `PROMOTION_READY`  | Eligible for human promotion review. | Human approves and executes the promotion sequence. |

`PROMOTION_READY` is a **signal**, not an action. Nothing in
automation promotes the build. The operator does.

## Why no production promotion workflow exists

- Promotion involves env vars, traffic decisions, and customer
  communication that no workflow can model safely.
- Automated promotion makes incidents faster, not slower.
- Keeping it manual forces a human to read the verdict ladder and
  the rollback runbook before they push the button.

## How to run preview QA manually from GitHub

1. Actions → "Ask Magic Mike Preview QA" → Run workflow.
2. Provide a `preview_url` input only if you want to skip discovery.
3. Leave `safe_db_write` as `false`. The workflow refuses any other
   value.
4. Wait for the run, then download `artifacts/launch-authority-report.md`.
