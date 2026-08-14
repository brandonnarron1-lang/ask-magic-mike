# Lead Routing Acceptance Matrix

| Lead class | Initial owner | Rule | QA status |
| --- | --- | --- | --- |
| Seller / home value | Mike | Default approved recipient | PASS — Form 3 score 70, owner Mike |
| Buyer / listing | Mike unless approved mapping exists | Fail closed to Mike | Automated tests pass |
| Open house | Approved host/listing agent else Mike | Explicit mapping only | Automated tests pass |
| Renter / specialty | Mike or admin review | No guessed specialist | Automated tests pass |
| Coastal / out of area | Review queue | No unapproved territory claim | Documented; live proof pending |
| Test / suppressed | Mike internal alert only | No consumer email/SMS; exclude KPIs | PASS — Form 3 QA |
| Duplicate | Prior approved owner | Preserve master linkage | PASS in tests; production QA reconciliation open |
| No eligible recipient | Unassigned + admin visibility | Never silently drop | Automated tests pass |

Assignment reason, score factors, source, campaign, duplicate/master linkage,
delivery status, and audit history are persisted by the canonical system.
