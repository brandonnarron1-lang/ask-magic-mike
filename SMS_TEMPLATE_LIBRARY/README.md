# Phase 7 SMS template library

`index.ts` exposes the provider-independent SMS copy, segment calculation, Eastern quiet-hours policy, frequency caps, and STOP/HELP classification. Carrier delivery is disabled. The mock adapter is the only accepted Phase 7 execution provider; a live adapter requires a separately approved funded provider and verified Brandon-owned test number.

Phone-number presence never creates SMS permission. Every future send must pass purpose-specific consent, suppression, test-state, quiet-hours, frequency-cap, idempotency, and feature-flag checks.
