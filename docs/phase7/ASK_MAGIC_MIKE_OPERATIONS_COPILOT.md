# Ask Magic Mike operations copilot

The Lead Center copilot presents four visibly separate layers: recorded facts, deterministic controls, AI recommendations, and human actions. It shows source, score, test/suppression, consent booleans, stored communication permissions, recent notification states, drafts, and cost/mode.

The endpoint enforces RBAC and lead assignment scope. It returns a role-filtered tool register. Production send, assignment, score mutation, consent mutation, and autonomous scheduling are absent. Preview generation and sequence controls require the operator to invoke an explicit audited action.

The authorized lead context now includes first/last-touch attribution, UTMs, click IDs, placement, current assignment and routing reason, normalized notification/provider lifecycle fields, the latest prior AI result and usage record, and the current daily AI cost total. Raw provider payloads, credentials, and hidden recipients are excluded. All controlled-action tools are marked human-approval-required and `productionSendAllowed=false`.
