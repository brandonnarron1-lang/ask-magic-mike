# AI Prompt Registry

| Prompt | Location | Purpose | Tools | Send authority |
| --- | --- | --- | --- | --- |
| Lead intelligence system instruction | `src/lib/ai/openai-responses.ts` | Read-only lead review and drafts | None | None |
| Public chat Responses instruction | `app/api/chat/route.ts` | Approved public real-estate guidance | None in Phase 6 | None |

The lead prompt declares deterministic facts authoritative; treats delimited lead text as untrusted; prohibits protected-trait inference, invented property facts, valuations, offers, listings, commissions, legal/lending conclusions, appointments, prior conversations, consent, and availability; and requires human review. Prompt changes require code review and schema/guardrail tests.
