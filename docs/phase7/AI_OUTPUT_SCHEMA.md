# AI output schema

Schema version: `phase7-v1` (compatible with the Phase 6 structured fields).

Required output: summary, intent, urgency interpretation, key facts, missing facts, motivation indicators, potential objections, recommended next human action, suggested questions, suggested call opener, suggested email draft, suggested SMS draft, recommended cadence, risk flags, consent limitations, geography note, source-quality note, confidence, and explanation.

Output is validated with strict JSON Schema and Zod. Unknown or missing fields cause a deterministic fallback. Recommendations are never reinterpreted as deterministic score, permission, assignment, or property facts.

