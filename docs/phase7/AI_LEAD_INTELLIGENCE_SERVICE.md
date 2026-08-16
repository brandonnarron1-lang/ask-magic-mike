# AI lead intelligence service

The service is advisory, asynchronous, and optional. `POST /api/admin/copilot/jobs` creates a durable job after RBAC and object-scope checks. The hourly worker atomically claims one queued job, checks the daily cost ceiling, loads minimized lead facts, calls the Responses API, validates strict JSON, records intelligence/usage, and completes or retries the job.

Provider failures return deterministic summaries. AI never sits in the capture, assignment, internal-alert, or Lead Center critical path. `AI_EMERGENCY_DISABLED=true` immediately forces fallback. The existing encrypted OpenAI key is reused in Vercel; it is never exported.

Provider attempts are bounded to two through `AI_PROVIDER_MAX_ATTEMPTS`; only transient network, rate-limit, or server failures retry. The service checks the daily estimated-cost ceiling before a provider request, maintains the per-request timeout and output-token ceiling, sends `store:false`, redacts lead text, blocks detected prompt injection, and validates strict structured output before persistence. Invalid output, exhausted retries, disabled AI, unavailable credentials, and cost-cap exhaustion all return a deterministic advisory result without changing routing, consent, priority, or assignment.
