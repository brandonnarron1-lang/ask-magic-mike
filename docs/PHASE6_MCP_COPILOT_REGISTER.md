# Phase 6 Copilot and Tool Register

## Implemented copilot

The Lead Center lead-detail page includes a human-review copilot. `POST /api/admin/copilot` requires Lead Center RBAC, validates same-origin requests, scopes agents to assigned leads, reads approved fields from Neon, redacts free-text PII, and returns strict structured output. It has no send, assignment, stage, task, calendar, or database-mutation tool.

## Tool register

| Tool | State | Permission | Side effect |
| --- | --- | --- | --- |
| Read assigned lead facts | Implemented | `lead:view_assigned` | None |
| Read all lead facts | Admin path only | `lead:view_all` | None |
| Generate advisory summary/drafts | Implemented | Same as lead read | Optional AI audit persistence only when enabled |
| Preview message templates | Implemented | `notification:manage` | None |
| Send email/SMS | Not exposed | N/A | Prohibited in copilot |
| Assign or change stage | Not exposed | N/A | Prohibited in copilot |
| Schedule appointment | Not exposed | N/A | Prohibited in copilot |

## MCP decision

A network-published MCP server was not added to the production attack surface. The protected application copilot is the smallest useful implementation. A future private MCP adapter may wrap the same read-only functions only after OAuth, RBAC propagation, audit logging, tool-specific rate limits, and revocation are accepted. It must never hold or reveal Vercel, Neon, email, SMS, or OpenAI credentials to an agent or browser client.
