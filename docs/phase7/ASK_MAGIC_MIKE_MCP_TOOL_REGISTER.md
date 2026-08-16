# Ask Magic Mike tool register

Canonical code: `src/lib/ai/copilot-tool-register.ts`.

Read tools: get lead, timeline, consent, communication permission, attribution, notification state, and system health. Controlled preview/actions: generate email preview, generate SMS preview, pause/cancel a test sequence, and request human review.

Every tool has a required Lead Center permission, object-scope enforcement, explicit `humanApprovalRequired`, and `productionSendAllowed=false`. No public MCP endpoint is exposed and no tool receives deployment secrets.

