# Attribution Field Dictionary

| Canonical field | Meaning | Rules |
|---|---|---|
| `first_touch` | Earliest known acquisition context | Immutable once established |
| `last_touch` | Submission-time acquisition context | Updated at durable lead capture |
| `utm_source/medium/campaign/content/term` | Campaign taxonomy | Preserve exact values; no PII |
| `landing_page` | First recorded page | Canonical URL without contact PII |
| `referrer_url` | Previous page when available | Minimize and sanitize |
| `placement_id` | Form/widget placement | Stable approved label |
| `click_ids` | gclid/fbclid/gbraid/wbraid/msclkid | Server-side record; never expose in email subjects |
| `consent_source` | Surface/version producing permission evidence | Exact form/widget version |
| `lead_type` | Deterministic business intent | Never inferred from protected-class data |
| `assigned_agent_id` | Current approved recipient | Store assignment reason and audit |
| outcomes | Appointment, signed client, closing, revenue | Actual business outcomes only |

Form 3 passed every implemented acceptance field. Other forms remain pending or blocked as recorded in the attribution workbook.
