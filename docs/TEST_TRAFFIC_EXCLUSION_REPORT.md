# Test Traffic Exclusion Report

Production audit state: six test leads, zero live Neon prospects, zero unsuppressed tests.

Controls verified or encoded:

- `is_test=true` and communication suppression are mandatory for QA.
- Consumer email, carrier SMS, audiences, ordinary routing, SLA metrics, agent metrics, conversion rates, and revenue exclude tests.
- Internal subjects begin `[TEST]`.
- The operating scoreboard uses formula criteria that exclude `Test? = Yes`.
- Test records are retained as QA evidence; they are not deleted to improve metrics.
- WordPress Form 7 entry 1550 is not classified as QA and remains preserved outside the canonical test register.
