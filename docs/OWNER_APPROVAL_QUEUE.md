# Owner Approval Queue

Updated 2026-08-23 from authenticated GitHub, Vercel, Neon, WordPress, and
Production evidence. The public funnel and internal email path are live. This
queue covers only actions that still require a human or external-system gate.

## Completed Production release sequence

Release only one approved PR at a time. Rebase the downstream PR on the exact
new `main`, then rerun Node 24 CI and Vercel Preview before using its gate.

1. PR [#183](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/183)
   — campaign safety and three-offer owned-demand flight is merged and live.
2. PR [#184](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/184)
   — its exact gate was received; the backup-first Neon migration is applied
   and verified, and application release evidence is attached to the PR.
3. PR [#185](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/185)
   — its exact gate was received; the WordPress proof-scope migration was
   backup-first applied and verified, and reviewed application head
   `2877fab35591c7f43c8def2ee920a12654b37a22` was merged as
   `44a7483400bdb9b4a10ecdf0883edc4bf96d4ab8` and deployed to Production.
4. PR [#193](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/193)
   — its exact gate was received; privacy/KPI head
   `21fdb5b3490cdc0517518578878a8db5d1b683a7` was merged as
   `9b82afb609674bb0209b73f8ac9622ab02733e2a` and accepted on Vercel Production
   deployment `dpl_HkKHY5nF8DeF5azY1CuHAbHGNp3a`. It contained no migration.
5. PR [#196](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/196)
   — its exact verifier gate was received; reviewed head
   `c8e19c8e822e585bc4b27c7abc47adf3a88fc8ad` was merged as
   `c08abe1168840b99ccba07866bbec8cf7a6752fb` and accepted on Production
   deployment `dpl_sew1CoF13dtfJTsvasDJf6vyndj8`. It contained no migration.
6. PR [#194](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/194)
   — its exact iOS handoff gate was received after the PR #196 release. Final
   reviewed head `851ebe530ac6a91a4e410f26538d29c1bf43f1c6` was merged as
   `5a3c5c7f2463ea399c21b616ff249f6c67e156b6` and accepted on Production
   deployment `dpl_3FWSKSu9jXvC2FTPuojVpt8mgm8J`. It contained no migration,
   device enrollment, or send.
7. PR [#195](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/195)
   — its exact conversion-identity gate was received; reviewed head
   `db13953071aa5dca59b74b671c2ed4592c53494f` was merged as
   `b450b41c66c6740bd20571cdbe7d8caf82e92d5e` and accepted on Production
   deployment `dpl_1bnT7C9SHamP8h13PjmtdSjvJPfW`. It contained no migration,
   form submission, or message send.

These completed gates are exhausted and must not be reused as authority for a
new action. None authorized a social/GBP post, email campaign, QR
printing/distribution, consumer message, spend, DNS change, WordPress change,
provider action, or deletion.

## Immediate Production durability candidate

- Production runtime evidence shows 17 requests used the availability-first
  memory limiter because no suitable server-only HMAC secret was available.
  The current readiness endpoint and prior monitor remained green.
- Draft PR [#202](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/202)
  on branch `codex/phase9-durable-rate-limit-readiness-20260823` is an isolated,
  main-based candidate that makes Production readiness require the existing
  Neon table's exact schema/upsert target, runtime privileges, RLS access, and
  dedicated secret, and makes the monitor validate that contract. It creates
  no second limiter or database and contains no migration.
- The exact read-only catalog probe passed on canonical Neon Production, and
  deployed Preview health proves the encrypted Preview runtime role. Hardened
  application head `abd2269b77496024a20d172e83a5404f013c5a43` has green PR
  merge-ref CI, exact-head Vercel status, protected 17-pass/6-write-skip
  acceptance, Widget 2/2, doctor 43/43, zero Preview warning/error/fatal logs,
  and `PREVIEW_READY`. The documentation-only evidence seal still requires its
  own final-head checks before the gate is consumable.
- Its only combined configuration/application release phrase is:
  `APPROVE PHASE 9 DURABLE RATE-LIMIT READINESS SECRET ENTRY, MERGE, AND SAME-COMMIT PRODUCTION DEPLOYMENT`.
- That phrase will authorize one encrypted Production-only secret entry, the
  exact reviewed candidate merge/deploy, and one malformed event request that
  writes only an HMAC-pseudonymized rate-limit bucket before returning HTTP
  400. It will not authorize a lead, analytics event, email, SMS, Push,
  WordPress change, publication, spend, DNS change, migration, deletion, or
  NellySelly action.
- Stale encrypted Upstash variable names are ignored by canonical code. Their
  deletion is not included in this gate.

## Application candidates after the durability correction

- Draft PR [#203](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/203)
  fast-tracks only PR #200's unique conversion-journey work on top of exact PR
  #202. Application head `a86eece1f2b18ceb064d109912c5b77314d2aca9` has
  exact-head CI, READY immutable Preview, protected 17-pass/6-write-skip
  acceptance, Widget 2/2, doctor 43/43, and `PREVIEW_READY`. It must remain
  Draft until PR #202 releases, then refresh onto exact `main` and repeat proof
  before a separate gate can be issued. PR #202's gate does not authorize it.
- Draft PRs #197–#201 remain preserved. PR #203 does not authorize, merge,
  delete, or silently supersede #197–#199 or #201.

## Owned-traffic activation fast-track after PR #204

- The local candidate on
  `codex/phase9-owned-traffic-fast-track-20260823` reuses only PR #197's
  attribution-trust work and PR #198's read-only WordPress manifests on exact
  sealed PR #204 head.
- It has no Production gate. It must remain Draft behind #202 → #203 → #204,
  then refresh onto exact `main` and repeat exact-head proof.
- Application release cannot edit WordPress. The first later proposed write is
  one homepage href only and still requires:
  `APPROVE PHASE 9 HOMEPAGE ASK MAGIC MIKE CTA WORDPRESS PUBLICATION`.

## Deferred candidates requiring refresh and overlap review

- PR [#182](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/182)
  is superseded for release. Its unique Buyer/current-router work is preserved
  in consolidated PR #185, so its former gate must not be requested or reused.
- PR #187's KPI-target migration is deferred because Production has no eligible
  live-demand baseline. It is not part of PR #185.
- PRs #186, #188, and #189 are preserved as source history; their useful work
  is consolidated into PR #185 and their former standalone gates are obsolete.
- PRs #190–#192 remain preserved as source history; their independently useful
  work was consolidated once in released PR #193 and is not part of PR #185.
- Historical PR [#179](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/179)
  is preserved but superseded by the released current-stack iOS handoff in PR
  [#194](https://github.com/brandonnarron1-lang/ask-magic-mike/pull/194).
  Physical enrollment and a `[TEST]` Push remain separately approved actions.
- PRs #92 and #119–#121 remain archive-after-review candidates. They are not a
  parallel Production release plan.

## People and brokerage decisions

1. Mike/BIC: decide whether preserved Form 7 entry 1550 permits a
   purpose-limited one-to-one response. Do not market, alert, or forward it
   until that decision is recorded.
2. Mike/BIC: approve requested-response consent and separately optional
   marketing consent before Forms 1, 2, or 4–7 enter the bridge allowlist.
3. Mike: activate his dormant `primary_lead_owner` account from his approved
   email/device and pass assigned-lead-only, logout, and revocation acceptance.
4. Brandon and Mike separately: enroll their own supported browsers for Web
   Push, grant notification permission, and approve one `[TEST]` receipt.
5. Brokerage/BIC/legal reviewer: approve seller-options, guaranteed-value,
   cash-offer, territory, response-time, or material campaign claims before
   publication.

## Infrastructure and publication gates

1. Hosting operator: identify the exact ModSecurity rule blocking the Facebook
   crawler on selected WordPress URLs before approving one narrow GET/HEAD
   exception. Do not weaken global bot protection.
2. DNS/Vercel owner: approve attachment of `hub.ourtownproperties.com` and the
   exact Vercel-provided CNAME. Canonical `/admin` remains available meanwhile.
3. Owner: approve each exact internal test send, consumer acknowledgment,
   WordPress placement, GBP/social/email publication, QR distribution, or paid
   campaign immediately before execution.
4. Owner/BIC: approve a registered carrier-SMS provider and sender before SMS
   activation. No free workaround may bypass registration, consent, or carrier
   rules.
5. Owner: separately approve deletion of the empty Vercel helper projects
   listed in `docs/CANONICAL_ASSET_MANIFEST.md`. Each has zero deployments and
   no custom-domain or Production effect; none is deleted implicitly.

## Resolved and removed from this queue

- PRs #170, #172, #173, #177, #178, #180, #181, #183, and #184 are released;
  do not request their historical approval phrases again.
- Canonical Neon Production and Better Auth/RBAC are established.
- Form 3 signed WordPress forwarding and duplicate native-notification shutdown
  passed controlled QA.
- Internal Resend email, hidden audit BCC, provider message ID, and delivery
  reconciliation have controlled QA evidence.
- Both Ask Magic Mike hostnames belong only to the canonical Vercel project.
