# Next Production gate

Status: `BLOCKED_HUMAN`

The next and only currently prepared Production action is PR #248.

Exact approval phrase:

`APPROVE PHASE 9 CONNECTOR READINESS APPLICATION PR 248 MERGE AND SAME-TREE PRODUCTION DEPLOYMENT`

After approval, the operator must:

1. recheck PR base/head/tree and required checks;
2. merge PR #248 without modifying its head;
3. identify the resulting main merge commit and tree;
4. verify Vercel Production deploys that exact tree;
5. run read-only smoke, health, funnel, and monitor acceptance;
6. roll back to `dpl_7csaKS8Nnzci282Ru4L6hJvhGp3U` on failed acceptance;
7. record the receipt before preparing any WordPress installation.

This gate does not authorize a WordPress write, database migration, environment
change, provider activation, external send, DNS change, or publication.
