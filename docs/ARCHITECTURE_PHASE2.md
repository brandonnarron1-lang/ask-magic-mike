# Ask Magic Mike Phase 2 Architecture

```mermaid
flowchart LR
  OTP[OurTownProperties.com\nWordPress + Gravity Forms] -->|HMAC bridge; allowlisted forms| API[AskMagicMike.com\nCanonical Next.js API]
  APP[AskMagicMike.com\nPublic app + widget] --> API
  API --> NEON[(Neon production\nbitter-star-20214385)]
  NEON --> QUEUE[Notification outbox]
  QUEUE --> EMAIL[Resend internal email\nMike + hidden audit BCC]
  QUEUE -. gated .-> PUSH[Web Push\nno devices enrolled]
  HUB[Lead Center\nBasic current / RBAC staged] --> NEON
  NELLY[NellySelly] -. isolated; no shared project, DB, or domain .- API
```

WordPress preserves SEO and local entries. It is not a competing canonical CRM. Form 3 is the only allowlisted production bridge form. The RBAC tables use `lead_center_*` names so they cannot collide with lead-attribution sessions.
