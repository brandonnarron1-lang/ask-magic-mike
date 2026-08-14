# Final Canonical System Map

```text
OurTownProperties.com (WordPress / Gravity Forms)
  └─ Form 3 only → HMAC-signed POST /api/leads
                      ├─ durable Neon lead + attribution + consent + audit
                      ├─ deterministic score and Mike routing
                      ├─ notification outbox → Resend → Mike + hidden audit BCC
                      └─ authenticated Lead Center

AskMagicMike.com (Next.js public funnel and widget)
  └─ same /api/leads → same Neon database → same outbox and Lead Center
```

- Canonical application: `eyes-up-industries/ask-magic-mike`
- Canonical database: Neon `bitter-star-20214385`
- Brokerage/SEO authority: Our Town Properties WordPress
- NellySelly: separate accounts, projects, domains, and databases
- Legacy deployments: retained for rollback; not reconnected to Git
