# Ask Magic Mike

**www.askmagicmike.com** — Real estate AI lead operating system for Mike Eatmon / Our Town Properties, Wilson, NC.

## What This Is

Ask Magic Mike is a production-grade intake and lead management system. It is not a chatbot. It is not a landing page. It is a full pipeline that takes a real estate question from a visitor and routes a scored, attributed, and consented lead to Mike Eatmon within minutes.

## Stack

- **Framework**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Validation**: Zod throughout — every API boundary
- **Scoring**: Deterministic, versioned, no AI required
- **CRM**: Adapter pattern — FollowUpBoss or kvCORE (null adapter if unconfigured)
- **AVM**: Mock provider default; ATTOM / HouseCanary stubs ready
- **AI**: Optional intent enrichment (Anthropic → OpenAI fallback)
- **Tests**: Vitest

## Local Setup

```bash
# 1. Clone / open the project
cd /path/to/ask-magic-mike

# 2. Install dependencies
pnpm install

# 3. Copy env template
cp .env.example .env.local
# Edit .env.local — minimum required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Without Supabase, the app runs in dev mode with console logging

# 4. Run dev server
pnpm dev

# 5. Open http://localhost:3000
```

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # ESLint
pnpm typecheck    # TypeScript type check (no emit)
pnpm test         # Run all tests
pnpm test:watch   # Watch mode
pnpm test:coverage  # Coverage report
```

## Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize (already done)
supabase init

# Apply migrations to your Supabase project
supabase db push

# Or run locally
supabase start
supabase db reset

# Generate TypeScript types
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

## Project Structure

```
src/
  app/              # Next.js App Router pages and API routes
  components/       # React components (landing, intake, admin, ui, shared)
  lib/              # Core business logic
    scoring/        # Deterministic lead scorer
    attribution/    # UTM parser + referrer classifier
    analytics/      # Event ledger
    routing/        # Agent assignment + SLA monitor
    crm/            # CRM adapter (FUB, kvCORE, null)
    valuation/      # AVM provider interface + mock
    ai/             # AI provider abstraction
    supabase/       # Supabase clients (browser, server, admin)
  schemas/          # Zod schemas (source of truth for validation)
  types/            # TypeScript domain types
  hooks/            # React hooks (session, analytics, intake flow)
supabase/
  migrations/       # 10 SQL migration files
docs/               # Documentation
tests/              # Vitest tests
```

## Brand

- Agent: Mike Eatmon
- Brokerage: Our Town Properties
- Market: Wilson, NC (Eastern NC)
- Colors: black #0A0A0A, gold #D4A017, ruby #C1272D, cream #F5F0E8
- Typography: Playfair Display (headers), Inter (body)
- Tone: Premium, local, professional — not cartoon or fantasy
