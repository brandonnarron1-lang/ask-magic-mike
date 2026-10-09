# Next Production gate

Status: `BLOCKED_HUMAN`

The next and only currently prepared application action is Batch A / Draft PR
#278 at exact head `65a09dc0137b97bda407ee24b0914e8f9bffd9c0` and tree
`5775ba6a315abde9bbe55f770ccda2a64f897362`.

Exact approval phrase:

`APPROVE PHASE 9 BATCH A RELEASE TRUTH AND PUBLIC INGRESS MERGE AND SAME-TREE PRODUCTION DEPLOYMENT`

After approval, the operator must:

1. recheck PR base/head/tree and required checks;
2. confirm protected no-write Preview QA run `36612230647` and exact Preview
   deployment `dpl_3KZ1CYj1H5i8nt3pZRVxPM74JDGq` remain bound to that head;
3. mark Draft PR #278 ready and merge it without modifying its head;
4. identify the resulting main merge commit and tree;
5. verify Vercel Production deploys that exact tree;
6. run read-only smoke, health, funnel, authentication-boundary, and monitor
   acceptance, then scan the exact deployment for runtime errors;
7. roll back to `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U` on failed acceptance;
8. record the receipt before reconciling Batch D onto the accepted tree.

Expected impact: current public ingress, consent, idempotency, rate-limit, and
release-authority boundaries are hardened. No migration or environment change
is included.

This gate does not authorize PR #248, Batch B/C/D, a WordPress write, database
migration, environment/secret change, provider activation, external send, DNS
change, traffic publication, spend, deletion, or NellySelly action. PR #248 is
now a later independent connector reconciliation, not the next application
gate.
