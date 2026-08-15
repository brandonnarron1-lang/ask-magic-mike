# Production Acceptance - Phase 6

Status: **PRODUCTION SCHEMA ACCEPTED; CONSUMER AUTOMATION REMAINS GATED**

## Passed locally

- ESLint, strict typecheck, 2,606 tests across 166 files, and production build.
- Existing canonical lead and notification tests.
- New AI, permission, messaging, sequence, and SMS policy tests.
- Consumer automation and carrier SMS remain disabled.
- Mike remains outside Phase 6 QA.

## Production record

- PR 152 merged: 2026-08-15T19:52:15Z.
- Production commit: `509b54fa8def73d48169970868338ca66c28793f`.
- Initial merged deployment: `dpl_3yzkZCaPbFfDAJw43NajEYC61CJM`.
- QA-secret rotation redeployment: `dpl_BxCt1Yvq2T4hQqBUnnyPcqc4FNwq`.
- Canonical aliases: `www.askmagicmike.com` and `askmagicmike.com`.
- Production liveness/readiness: pass; canonical Neon configured and ready.
- Public smoke: 19 pass, 2 intentional skips, 0 fail.
- Funnel: 15 pass, 0 fail.
- Production monitor: 9 pass, 0 fail.
- Lead-pipe health: pass.
- NellySelly isolation: pass.
- Post-release Production errors/warnings: none returned by Vercel for the observed 30-minute window.
- PR 154 merged the owner-approved internal-test copy/visual packet and the
  Preview-accepted provider-compatible migration source.
- Current Production deployment: `dpl_875K5f4xrJdZD9WEQAftafP338uE`, merge
  commit `83f726ce87e0e334a080464c03d8d3f04e23402d`.

## Brandon-only email acceptance

- Exact recipient: `brandonnarron1@gmail.com`.
- Subject: `[TEST — BRANDON QA] Phase 6 message acceptance`.
- Provider: Resend.
- Provider message ID: `fb4fdd9d-d421-482d-b062-5c2bbf6bce1c`.
- Provider acceptance: pass.
- Gmail inbox receipt: pass at 2026-08-15 3:56 PM America/New_York.
- Sender shown by Gmail: Ask Magic Mike `<leads@notify.askmagicmike.com>`.
- Authentication shown by Gmail: mailed-by `send.notify.askmagicmike.com`, signed-by `notify.askmagicmike.com`, TLS.
- Canonical CTA href: pass by DOM inspection.
- Mike delivery requested: false.
- Consumer delivery requested: false.
- No lead record was fabricated; the message was a synthetic, recipient-isolated rendering acceptance.

## Production migration acceptance

- Canonical Neon Production branch `br-round-base-auh6h2wd` received the exact
  migration accepted on Preview, inside one `BEGIN` / `COMMIT` transaction.
- Production acceptance: 7/7 tables present, RLS enabled on 7/7, zero grants to
  `PUBLIC`/`anon`/`authenticated`, and zero rows across the new tables.
- Lead and notification aggregates were unchanged: 6 suppressed tests, 0 live
  prospects, 0 unsuppressed tests, 7 notifications, 0 pending, and 0 live
  failures.
- Full evidence: `docs/PHASE6_PRODUCTION_MIGRATION_ACCEPTANCE.md`.

## Deliberately held

- Consumer acknowledgment, nurture, sequence scheduler, auto-send, and carrier SMS remain disabled.
- Mike remains outside QA and dormant.
- Reply was not sent during QA; reply destination behavior remains a separate acceptance item.
- Native mobile Gmail-app rendering was not available. The live responsive component passed 390px layout measurement with no horizontal overflow; the desktop Gmail inbox render was captured separately.

Owner approval of the current copy and visual hierarchy was recorded for
internal testing only; it does not release consumer delivery.

No test result or schema migration authorizes a consumer send, carrier SMS,
Mike activation, or publication by itself.
