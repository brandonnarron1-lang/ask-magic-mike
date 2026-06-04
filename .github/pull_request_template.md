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
