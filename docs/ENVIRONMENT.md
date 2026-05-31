# Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

## Required for Database

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — server-only, never exposed to browser |

If these are absent, the app runs in **dev mode**: sessions and leads are logged to the console rather than saved to a database.

## Required for Production

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Full URL of the app |
| `NEXT_PUBLIC_AGENT_NAME` | `Mike Eatmon` | Agent's display name |
| `NEXT_PUBLIC_BROKERAGE_NAME` | `Our Town Properties` | Brokerage name |
| `NEXT_PUBLIC_AGENT_PHONE` | — | Agent's phone in E.164 format |
| `NEXT_PUBLIC_MARKET_AREA` | `Gainesville, FL` | Market area displayed in UI |
| `ADMIN_SECRET` | `changeme-local` | Password for `/admin` route (basic auth) |
| `SLA_ACCEPT_MS` | `120000` | Accept SLA in milliseconds (2 min) |
| `SLA_CONTACT_MS` | `300000` | Contact SLA in milliseconds (5 min) |

## Optional: AI Providers

If absent, AI-augmented features (intent enrichment, valuation narrative) are disabled.

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key — checked first |
| `OPENAI_API_KEY` | OpenAI API key — fallback if no Anthropic key |

## Optional: CRM

If absent, the **null adapter** is used — all CRM operations are logged as `skipped` in `crm_sync_log`. No external writes occur.

### Follow Up Boss

| Variable | Default | Description |
|----------|---------|-------------|
| `FUB_API_KEY` | — | FUB API key (enables FUB adapter) |
| `FUB_BASE_URL` | `https://api.followupboss.com/v1` | FUB API base URL |

### kvCORE

| Variable | Description |
|----------|-------------|
| `KVCORE_API_KEY` | kvCORE API key (enables kvCORE adapter) |
| `KVCORE_BASE_URL` | kvCORE API base URL |

## Optional: Notifications

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key for transactional email |
| `TWILIO_ACCOUNT_SID` | Twilio account SID for SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_PHONE` | Twilio sender phone (E.164 format) |

## Optional: AVM Providers

If absent, the **mock provider** is used — deterministic estimates, no external API calls.

| Variable | Description |
|----------|-------------|
| `ATTOM_API_KEY` | ATTOM Data API key |
| `HOUSECANARY_API_KEY` | HouseCanary API key |
| `HOUSECANARY_API_SECRET` | HouseCanary API secret |

## Adapter Priority

### CRM
1. `FUB_API_KEY` → FollowUpBoss adapter
2. `KVCORE_API_KEY` → kvCORE adapter
3. No keys → null adapter (safe default)

### AI
1. `ANTHROPIC_API_KEY` → Claude
2. `OPENAI_API_KEY` → OpenAI
3. No keys → AI features disabled (scoring still works — it's deterministic)

### AVM
1. `ATTOM_API_KEY` → ATTOM (stub, requires implementation)
2. `HOUSECANARY_API_KEY` → HouseCanary (stub, requires implementation)
3. No keys → mock provider
