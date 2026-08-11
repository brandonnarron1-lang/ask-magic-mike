# Lead Routing Rules

Routing is deterministic and explainable. AI may summarize a lead but never assigns
or prioritizes it.

| Lead context | Initial owner |
|---|---|
| Seller, home value, sell-soon, direct-purchase-options, urgent, or high score | Mike / approved default recipient |
| Buyer or listing inquiry | Approved listing agent only when an explicit mapping exists; otherwise Mike |
| Open house | Configured host/listing agent; otherwise Mike |
| Renter, land, property management, recruiting, or specialist | Mike or admin review |
| Duplicate | Preserve prior owner; create a duplicate audit event |
| No eligible recipient | `unassigned` plus Mike/admin alert |

Every decision records the reason, previous owner, new owner, actor/source, and
timestamp. BCC is an audit copy only and never controls assignment.

The existing atomic RPC uses capacity locking and priority/load ordering. The
consolidated implementation makes the Mike fallback explicit and keeps any future
agent mapping opt-in and auditable.

## Score

The score is a deterministic 0–100 value derived from intent, timeline, contact
completeness, property context, financing/preapproval when relevant, and message
specificity. Protected-class data, neighborhood proxies, and demographic inference
are never inputs. Factor labels and weights are stored with the lead.

## Test leads

QA records use `is_test=true`, `[TEST]` subject priority, and the exact marker
`INTERNAL QA — DO NOT CONTACT` in name or message. They are suppressed and excluded
from production KPI totals; they are not presented as live prospects.
