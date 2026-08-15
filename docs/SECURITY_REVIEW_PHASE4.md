# Security Review — Phase 4

Scope: first-live monitoring, cron authentication, operator activation evidence,
UTM/QR assets, and related runbooks. This is an engineering security review,
not a penetration test or legal opinion.

## Result

**PASS for release**, with one isolated upstream crawler warning that does not
affect authentication, persistence, or notification delivery.

## Controls verified

- Production remains Neon-only; no Supabase production fallback was re-enabled.
- Ask Magic Mike and NellySelly project identifiers remain isolated.
- The new cron route requires the existing bearer secret and returns `no-store`.
- The immediate detector runs only for non-test leads and fails independently of
  durable lead storage.
- The audit index enforces one detection and one escalation event per lead.
- Monitor metadata contains only booleans/status labels and the canonical lead
  UUID; no names, email addresses, phones, messages, source URLs, consent text,
  provider payloads, or credentials.
- No automatic consumer contact was added.
- Existing server-side RBAC remains fail-closed; anonymous `/admin` access is
  redirected to login.
- Passwords, reset URLs/tokens, hidden BCC value, session cookies, database
  strings, and Push endpoints are absent from committed artifacts.
- Reset links are one-use, 60-minute, same-origin HTTPS links; password reset
  revokes sessions and is database-rate-limited.
- Public UTM/QR assets contain no private parameter or credential.
- Carrier SMS remains disabled.
- Release safety passed 14/14 and tracked-history Gitleaks found 0 secrets.

## Threat considerations

| Threat | Mitigation |
| --- | --- |
| Duplicate monitor events | Partial unique index plus `ON CONFLICT DO NOTHING` |
| PII in observability | Aggregate response and minimized audit metadata |
| Cron spoofing | Existing constant-time bearer-secret check |
| Monitor failure blocking capture | Error is contained after durable capture and notification attempt |
| Missing notification outbox | `internal_email_missing` escalation state |
| Test contamination | Query requires `is_test=false` and non-suppressed record |
| URL tracking leakage | Public campaign labels only; no contact or session data |
| Cross-project contamination | Canonical Vercel project and code-identifier isolation test |

## Known warning

Facebook's crawler is blocked on two public Our Town pages by host-managed
ModSecurity. No broad user-agent bypass or domain firewall disablement was
applied. The remaining remediation is exact-rule, exact-path, GET/HEAD-only and
must preserve protected WordPress endpoints.
