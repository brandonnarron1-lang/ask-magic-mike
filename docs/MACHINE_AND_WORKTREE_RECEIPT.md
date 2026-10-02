# Machine and worktree receipt

Status: `VERIFIED_NOT_PRODUCTION`

Captured 2026-09-28 before modifying any preserved Ask Magic Mike work.

## Machine

- Apple M4, arm64, 10 cores
- macOS 26.5.2 (25F84)
- 16 GiB memory
- approximately 25 GiB free on the internal data volume at adoption
- mounted project volumes: `/Volumes/X10`, `/Volumes/X10_TM`, `/Volumes/MyBook`
- Node 24.18.0, pnpm 10.30.3, PostgreSQL 17.11

One unrelated What's Your Theme Song browser/Playwright process was active and
was preserved. Ask Magic Mike used one heavy local pipeline at a time.

## Worktrees

| Path | Branch / HEAD at adoption | State | Preservation decision |
| --- | --- | --- | --- |
| `/Users/brandonnarron/projects/ask-magic-mike` | `codex/phone-setup-session` / `88913e8` | Untracked `.amm-run`, `.playwright-cli`, and screenshot evidence | Preserve as historical operator checkout; never treat as main. |
| `/Users/brandonnarron/.codex/worktrees/ask-magic-mike/handoff-audit-20260928` | `codex/handoff-audit-20260928` / `de8d556` | Clean at adoption; one docs commit ahead of main | Canonical current handoff/consolidation documentation worktree. |
| `/Users/brandonnarron/.codex/worktrees/ask-magic-mike/consumer-ack-20260928` | `codex/consumer-ack-boundary-20260902` / `cd25939` | 13 modified and 3 untracked implementation files | Treated as irreplaceable; verified, committed, and pushed as `057df89`; Draft PR #275 opened. |
| `/Users/brandonnarron/Projects/ask-magic-mike-free-first-2026-08-14` | `codex/phase7-final-artifacts` / `02baef29` | Untracked generated packages and screenshots | Preserve as historical evidence. |
| `/Users/brandonnarron/.codex/worktrees/ask-magic-mike/pr248-revalidation-20260928` | detached `f6134b7` | Generated ignored acceptance artifacts only | Immutable PR #248 acceptance checkout. |

No branch was reset, force-pushed, deleted, or discarded.
