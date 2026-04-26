# Ask B-Nelly (Ask Magic Mike Tenant)

Multi-tenant SaaS for:
- Broker-branded real estate educational assistant
- Lead intake and inquiry routing
- Compliance guardrails and escalation
- Usage-based software billing

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS + shadcn-style UI components
- Supabase-ready data/auth/storage architecture (in-memory demo store included)
- Stripe checkout + webhook placeholders
- Provider-agnostic LLM adapter (OpenAI + mock)
- Webhook-first CRM routing with email fallback

## Routes
- `/` marketing + navigation
- `/[tenantSlug]` tenant-branded public assistant page
- `/onboarding` onboarding wizard
- `/dashboard` tenant operations dashboard
- `/admin` B-Nelly admin dashboard

## API routes
- `POST /api/chat`
- `POST /api/contact-events`
- `POST /api/billing/checkout`
- `POST /api/webhooks/stripe`
- `GET|POST /api/tenants/[tenantSlug]`

## Compliance
The assistant blocks transaction-specific requests and legal/negotiation/valuation prompts, then routes users to licensed broker follow-up via contact capture.

## Local dev
```bash
npm install
npm run dev
```

Set `OPENAI_API_KEY` to enable OpenAI responses; otherwise the mock LLM adapter is used.
