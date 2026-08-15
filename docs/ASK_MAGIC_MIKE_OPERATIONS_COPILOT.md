# Ask Magic Mike Operations Copilot

The initial copilot is a protected, read-only Lead Center capability for Brandon. It summarizes recorded facts, restrictions, suggested next human action, questions, call opener, and email/SMS drafts. Facts and suggestions are visually separated.

Authorization: same-origin request, authenticated Lead Center session, role/permission check, and lead-level assignment scope. Contact fields are not sent to the model. The copilot cannot send, schedule, assign, change status, activate Mike, or override deterministic controls.

Implementation: `POST /api/admin/copilot`, `src/components/admin/phase6-copilot-panel.tsx`, `src/lib/ai/`, and `PHASE6_MCP_COPILOT_REGISTER.md`. A remote MCP/Workspace Agent was evaluated but not published; the app-local surface avoids creating a second authorization system.
