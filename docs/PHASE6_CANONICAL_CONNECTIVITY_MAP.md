# Phase 6 Canonical Connectivity Map

```text
AskMagicMike public forms/widget ─┐
                                 ├─> canonical /api/leads -> Neon capture function -> leads
OurTown WordPress Form 3 bridge ─┘                              |
                                                                +-> deterministic score/routing/assignment
                                                                +-> durable lead_notifications outbox
                                                                +-> approved genuine internal email/push
                                                                +-> authenticated Lead Center

Lead Center facts -> protected copilot -> redaction/guardrails -> optional Responses API -> read-only suggestions

Consent/test/suppression -> permission engine -> template/sequence preview -> human approval
                                                     |-> Resend QA: Brandon allowlist only
                                                     |-> SMS mock: no carrier send
                                                     `-> consumer automation: disabled
```

Invariants: storage precedes messaging; messaging failure never deletes a lead; replay/idempotency prevent duplicate communication; test/suppressed records never receive consumer messaging; ambiguous consent blocks; provider state remains reviewable; administrative changes are audited. NellySelly, Supabase runtime, and legacy Vercel deployments are not connected.
