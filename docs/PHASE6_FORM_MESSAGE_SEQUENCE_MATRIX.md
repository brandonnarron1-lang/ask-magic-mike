# Phase 6 Form and Message Sequence Matrix

All consumer sends remain disabled. “Ready” below means mapped and reviewable, not activated.

| Form | Purpose | Consent evidence | Canonical mapping | Routing | Email sequence | SMS permission | AI mapping | QA state | Activation | Approval / rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 General Contact | General real-estate request | Existing Form 1 language must be captured exactly before bridge activation | `general` / requested service | Mike unless approved mapping exists | `general_requested_service_v1` | Only explicit SMS permission; otherwise none | General intent, source, question, missing facts | Mapping review only | Not activated by Phase 6 | BIC/Regency field mapping; remove bridge form ID to roll back |
| 2 Seller Options | Listing/as-is options review | Requested-service contact; no blanket marketing | `seller_options` | Mike | `seller_options_human_review_v1` | Explicit SMS only | Seller-options facts; no offer/value | Mapping review only | Not activated by Phase 6 | BIC language approval; remove bridge form ID |
| 3 Home Value | Broker-reviewed property conversation | Existing accepted Form 3 bridge evidence | `home_value` | Mike | `home_value_review_v1` | Existing SMS state remains authoritative | Home-value facts; no appraisal/value | Existing controlled bridge baseline preserved | Existing bridge preserved; no Phase 6 resend | Disable bridge forwarding; Gravity Forms entry remains durable |
| 4 Recruiting | Employment/agent inquiry | Purpose-specific recruiting language required | Specialist/unassigned review | Mike/admin review until approved owner | No Phase 6 consumer sequence | None | No Phase 6 AI personalization | Audit only | Not activated | Separate HR/BIC approval required |
| 5 Rental Search | Rental request | Requested-service contact; no availability claim | `rental` | Mike/admin review | `rental_request_v1` | Explicit SMS only | Area/timing/request; no inventory claim | Mapping review only | Not activated | Property-management/BIC mapping; remove bridge form ID |
| 6 Short-Term Rentals | Requested short-term service review | Requested-service purpose | `short_term_rental` | Mike/admin review | `short_term_rental_request_v1` | No default SMS sequence | Location/dates/request; service-area review | Mapping review only | Not activated | Service-scope approval; remove bridge form ID |
| 7 Property Alerts | Separate alert subscription | Separate property-alert permission and frequency | `property_alerts` | Mike until approved mapping | `property_alert_confirmation_v1` | Requires alerts permission plus SMS permission | Preferences only; no inventory promise | Entry 1550 remains protected and unchanged | Not activated | BIC/legal/provider approval; disable alerts flag/bridge mapping |

## Shared stop conditions

Reply, recorded contact, appointment, signed-client state, won/lost state, invalid contact, opt-out, legal/BIC hold, manual pause, duplicate consolidation, and test/suppressed state.

## Non-negotiable rollback rule

The WordPress bridge allowlist is the activation boundary. Remove a form ID from the bridge configuration to stop new forwarding without deleting Gravity Forms entries or changing the canonical Neon records already created.

