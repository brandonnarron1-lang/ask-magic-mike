# Minimum Incident Response

## Trigger

Treat suspected credential exposure, unauthorized Lead Center access, missing
leads, duplicate notifications, provider abuse, PII in logs/analytics, or
AskMagicMike/NellySelly resource crossover as an incident.

## First 30 minutes

1. Record time, reporter, affected surface, correlation/lead IDs, and observed
   facts without copying PII or secrets.
2. Preserve Vercel, Neon, provider, WordPress, and audit logs. Do not delete data.
3. Contain the narrow channel: disable notification/customer toggles, disable the
   WordPress bridge, or roll back the app. Keep durable lead capture available
   when safe.
4. Rotate only the proven affected credential through secure provider interfaces;
   never paste the replacement into chat or a ticket.
5. Compare lead rows, outbox rows, provider IDs, and audit events by correlation
   ID. Distinguish queued from delivered.

## Recovery

Use the recorded Vercel rollback deployment, additive migration rollback notes,
and WordPress enable flag. Re-run health, route, auth, dedupe, notification mock,
and isolation checks before restoring traffic. A provider 200/queued state alone
is not recovery proof.

## Notification and review

The broker/owner decides legal, consumer, regulator, insurer, or vendor notice.
Document scope, decisions, timestamps, records affected, credential rotations,
and preventive actions. Within one business day, add a regression test or release
gate for the root cause.
