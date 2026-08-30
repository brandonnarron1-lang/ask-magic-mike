# Current Release Authority

Updated 2026-08-30 from the accepted PR #238 Production cutover. This is the
canonical operator record for current application release authority.
Historical approval phrases are evidence only and cannot be replayed.

The machine-readable companion is
[`config/current-release-authority.json`](../config/current-release-authority.json).
The protected Growth capability ledger consumes the same fail-closed manifest.

## Accepted Production

- Released PR: [#238](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/238)
- Reviewed head: `9232641329acb8a02ce4cf2419cb12768ce33d17`
- Merge commit: `cef0f366380e2e8aa95a70cf45a70830d7997d45`
- Production tree: `e6f388311fd07fc84ed0e580b77b190f7c56f458`
- Vercel deployment: `dpl_EU6Bx2Fj76HtBmNotCEKcfDk5uwe`
- Main Release Gate: [run 33313337535](https://github.com/brandonnarron1-lang/ask-magic-mike/actions/runs/33313337535), successful
- Canonical URL: `https://www.askmagicmike.com`
- Immediate application rollback: `dpl_DJBHm5umeXK2AkrMeca5LK4FMQzj`
- Disposition: live and accepted

## Active application candidate

**None.** The manifest records `candidate: null`. There is no current
application approval phrase, merge authority, migration authority, or
Production deployment authority.

The approval supplied for PR #238 is consumed and exhausted:

```text
APPROVE PHASE 9 CUMULATIVE GROWTH MIGRATIONS, PR 238 MERGE, AND PRODUCTION DEPLOYMENT
```

That text is retained only as a release receipt. It cannot authorize PR #244,
another commit, another migration, a redeploy, an import, or any external
action.

## Released cutover receipt

The accepted cutover applied exactly these five hash-pinned migrations once:

| Version | SHA-256 |
| --- | --- |
| `20260824193000` | `9640e5807622d88c0ca3b1074ea3a0f4d304ca493dbe9ab1d573243e858ee6a1` |
| `20260824220000` | `4d1ec2947134145a75a8b82e2edef71fcd7d8b0974ebfb909d838d1378e81626` |
| `20260825033000` | `68f292f8e1773c9d2b999c61311362576848020176c5dbdeaf0550ba4795047c` |
| `20260825060000` | `705fa33d1516451e721cd30d9991084ff3dae987849a2f47981eaeff762a561a` |
| `20260830190000` | `f50ffe91740fdd0690a87d673daf9e5753f122e19279ef84d729d9435d7adc35` |

Canonical target identity was Neon project `bitter-star-20214385`, Production
branch `br-round-base-auh6h2wd`, endpoint `ep-proud-bonus-autwv60g`, database
`neondb`. Read-only preflight and postflight passed. Each version has exactly
one ledger row; existing bounded counts stayed unchanged; all three receipt
tables remained empty; and all three growth import gates remained false.

The validated backup receipt is retained without committing its local path:
380,265 bytes, 659 restore entries, mode 600, SHA-256
`30fdeca85a7f883db9b812ed676a19f7ec141495fe1e1683bfb8b0e6282f8c49`.

Hardened ownership, RLS, public/browser denial, the service-role allowlist,
immutable triggers, the truth guard, health checks, and post-deploy read-only
verification passed. No growth report was imported merely because its schema
was released.

## Controlled Lead Center proof

The released tree retains the isolated Neon Preview controlled-mutation proof
at application commit `382ebe32d41a23eeb0e4a969c733be78930ba87a`.
The deterministic 36-file surface SHA-256 is
`823997fb72aed87a9c73e313c682361055a8622bc8d79c16dfbd62e7184c67d4`.
It proved test-marked durable write/readback, idempotent replay, skipped
provider delivery, and terminal communication-suppressed closeout. It did not
fabricate a live prospect.

## Preserved lineage

PRs #210 through #243 are historical component lineage included once in PR
#238. Their branches, rescue refs, checks, and evidence remain recoverable,
but no component PR or former phrase has independent current release
authority. PR #244 is a metadata-reconciliation review vehicle only; it is not
an active application candidate and requires its own fresh exact gate before
any merge or Production deployment.

## Creating a future candidate

A future application release must first freeze a new exact head and tree,
identify every migration and environment change, pass local and hosted release
checks, produce an immutable Preview and protected no-write QA, document
rollback, and then generate a new action-specific approval phrase. No authority
may be inferred from an open PR, branch name, successful check, Preview, prior
approval, or this receipt.

## Excluded authority

Current release evidence does not authorize a growth-report import, provider
login, WordPress publication, DNS/domain change, lead submission or mutation,
email/SMS/Web Push send, consumer acknowledgment, social/GBP/email
publication, paid spend, data deletion, purchase, or any NellySelly action.
Those remain separate exact gates.
