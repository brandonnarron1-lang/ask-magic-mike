# Production Change Log

## 2026-08-14

- Backed up active WordPress bridge 1.0.0 and `wp-config.php`.
- Upgraded bridge to reviewed 1.1.0 in shadow mode.
- Added matching encrypted HMAC configuration to WordPress and Vercel.
- Enabled only Gravity Form 3.
- Created controlled Gravity entry 1549 and canonical lead
  `70f63f35-2478-4738-b84c-bc1a89b8482c`.
- Confirmed one canonical internal email to Mike and hidden audit receipt.
- Disabled exact duplicate Form 3 `Admin Notification`.
- Detected pre-fix replay defect; preserved production error evidence.
- Merged PR #139 (`2a9ee23`) and deployed
  `dpl_HzxCrWNSrK491qTddxqKBMcZxvSL`.
- Verified corrected replay returns the original lead with no additional email.
- Held all other forms pending Form 3 data reconciliation.
- Prepared a follow-up compatibility release that normalizes nested WordPress
  click IDs and restores the no-store, public-safe listing fallback routes in
  the active App Router without connecting or exposing private MLS data.
- Merged PR #140 as `178bdefd` and deployed production
  `dpl_3AVXKtKCuiqytNqNQXvSKF4YBPCL`.
- Audited the actual Neon production branch, found the one incomplete controlled
  pre-fix replay row, marked it test/suppressed, and inserted one auditable
  before/after event. No row was deleted and no message was sent.
