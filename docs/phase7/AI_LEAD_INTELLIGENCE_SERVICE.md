# AI lead intelligence service

The service is advisory, asynchronous, and optional. `POST /api/admin/copilot/jobs` creates a durable job after RBAC and object-scope checks. The hourly worker atomically claims one queued job, checks the daily cost ceiling, loads minimized lead facts, calls the Responses API, validates strict JSON, records intelligence/usage, and completes or retries the job.

Provider failures return deterministic summaries. AI never sits in the capture, assignment, internal-alert, or Lead Center critical path. `AI_EMERGENCY_DISABLED=true` immediately forces fallback. The existing encrypted OpenAI key is reused in Vercel; it is never exported.

