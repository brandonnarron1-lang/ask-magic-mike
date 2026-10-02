# Pull request

## Summary

<!-- One or two sentences. What this PR changes and why. -->

## Release-gate checklist

- [ ] `npm run release:safety` passes
- [ ] `npm run release:gate` passes
- [ ] `npm run preview:qa` run, or intentionally skipped (state reason)
- [ ] `npm run preview:e2e` run, or intentionally skipped (state reason)
- [ ] No production env vars changed
- [ ] No `SAFE_DB_WRITE=true` run unless controlled mutation QA was approved (see `docs/controlled-preview-mutation-qa.md`)
- [ ] No private MLS fields exposed in public APIs or marketing-asset paths
- [ ] Widget flow verified (browser e2e or manual `/widget-preview` walkthrough)
- [ ] Rollback plan reviewed (`docs/rollback-runbook.md`)
- [ ] `artifacts/launch-authority-report.md` reviewed if generated
- [ ] **Production promotion not included in this PR**

## Verdict

<!-- Paste the launch-authority verdict if you ran it locally:
LOCAL_READY / PREVIEW_READY / MUTATION_READY / PROMOTION_READY / BLOCKED. -->

## Notes

<!-- Anything reviewers should know. Migrations, env-var
expectations, rollback considerations. -->

## Release intent

<!-- Keep this strict JSON block. The post-deploy receipt generator validates it
against the merged diff and refuses missing or contradictory evidence. Replace
OWNER_GATE_AFTER_REVIEW with the exact sealed phrase before merge. -->

<!-- amm-release-intent:v1
{
  "schemaVersion": 1,
  "migrationCount": 0,
  "environmentChangeCount": 0,
  "externalMutations": {
    "wordpress": 0,
    "productionDataWrites": 0,
    "leadSubmissions": 0,
    "notifications": 0,
    "dns": 0,
    "billing": 0,
    "nellySelly": 0
  },
  "ownerGate": "OWNER_GATE_AFTER_REVIEW"
}
-->
