# Rollback runbook

Production for Ask Magic Mike / We Buy Houses is
`ask-magic-mike.vercel.app` at `main@ecf59c9`. This runbook is the
single authority for what "rollback" means and how to execute it
safely.

A rollback is **not** a destructive operation. It restores the system
to a known-good state. Discarding work, dropping tables, or rolling
back migrations is not in scope here — that is a separate, human-
approved incident response.

## Decision tree

| Symptom                                | First action                          | Then                                |
| --- | --- | --- |
| Public pages broken (500/blank)        | Stop paid traffic. Vercel rollback.   | Verify with `npm run monitor:synthetic`. |
| Widget broken / submit fails           | Stop paid traffic.                    | Vercel rollback or disable widget at WordPress / Brand Kit layer. |
| Admin cockpit broken                   | Keep public capture online.           | Vercel rollback for admin only if cause is in shared code. |
| Lead capture broken                    | Stop paid traffic immediately.        | Vercel rollback. Investigate `/api/leads` logs. |
| Data leak suspected (PII / private MLS)| Stop paid traffic. Disable preview promotion. | Vercel rollback. Preserve logs/artifacts. Notify legal. |
| SMS/email misfire                      | `ENABLE_SMS=false` and `ENABLE_EMAIL=false`. | Investigate provider webhook logs before re-enabling. |
| Private MLS field surfaced publicly    | Stop paid traffic. Pull suspect listings via admin. | Vercel rollback if cause is in shared code; otherwise patch listing import + re-deploy. |
| CRON misbehaviour                      | Remove `CRON_SECRET` from cron caller / pause schedule. | Investigate SLA sweep logs. |

## First three moves in *every* incident

1. **Stop paid traffic.** Pause Meta + Google ads before anything
   else. Cost compounds while you debug.
2. **Freeze promotion.** Set the PR template's "no production promotion"
   checkbox to enforced — block merges to `main` until resolved.
3. **Preserve evidence.** Save Vercel logs, `artifacts/*.json`, and a
   Supabase snapshot before any rollback.

## Vercel rollback

```
# Inspect recent deployments.
vercel ls ask-magic-mike --scope eyes-up-industries

# Inspect a specific deployment.
vercel inspect <deployment-url>

# Roll back to a known-good production deployment — human approval
# required, do not script.
vercel promote <known-good-deployment-url> --scope eyes-up-industries
```

`vercel promote` is the supported rollback mechanism in our setup.
Never run it from automation. The release-safety scanner will fail
the gate if `vercel promote` appears in a workflow.

## Env-var rollback

If production env vars were changed since the last known-good state,
revert via the Vercel dashboard:

- Project → Settings → Environment Variables → History.
- Restore the prior values for **Production** scope only.
- Trigger a redeploy of the rolled-back commit so the env takes effect.

Never modify production env vars from automation.

## Lead-platform-specific killswitches

| Switch | Effect |
| --- | --- |
| `ENABLE_SMS=false`               | No outbound SMS. Live sends become mocks. |
| `ENABLE_EMAIL=false`             | No outbound email. |
| `ENABLE_AI_GENERATION=false`     | Disables AI-augmented intake. |
| `ENABLE_FLEXMLS_API=false`       | Disables MLS sync. |
| Unset `CRON_SECRET` on caller    | SLA sweep cron stops firing. |
| Pause Vercel cron schedule       | Same effect, recoverable from dashboard. |
| Pause paid-traffic UTM templates | Strangle traffic at the source. |

Use these in addition to a deployment rollback, not instead of one,
when the symptom is environmental rather than code-defect.

## Database rollback

- **Do not** auto-rollback migrations.
- Prefer a forward-fix migration over a `down` migration.
- Restore from a Supabase point-in-time backup only with explicit
  human approval and a written record of what was restored.
- Lead PII deletion under GDPR/CCPA requests is its own procedure —
  not a rollback.

## After the rollback

1. Run `TARGET_URL="https://ask-magic-mike.vercel.app" npm run monitor:synthetic`.
2. Confirm public pages, widget, and `/api/listings/search` are clean.
3. Re-enable paid traffic only after a written all-clear from the
   on-call operator.
4. Post a short post-incident note in `docs/IMPLEMENTATION_NOTES.md`
   or a dedicated incident doc.

## Escalation

If symptoms persist after the first rollback attempt, escalate before
trying clever fixes. The order is:

1. Pause paid traffic if not already paused.
2. Freeze promotion.
3. Preserve logs / artifacts.
4. Notify the human on-call operator.
5. Do not run destructive DB changes without explicit human approval.

Slow is smooth. Smooth is fast. Production does not get faster when
you panic.
