# Staff Roster Reconciliation — Phase 3

Date: 2026-08-14

## Decision

The final authenticated source set and the owner's full-access authorization
approved the initial two-person Production roster. Brandon is administrator;
Mike is the linked primary lead owner. No account was created from a public
agent page alone, and all other people remain unprovisioned.

## Verified sources

- Authenticated WordPress Users list
- Authenticated Neon `agents` routing table (read-only query)
- Public Our Town Properties agent directory and individual agent pages
- Existing notification recipient configuration and Phase 2 operating documents
- Existing RBAC role/permission code

## Proposed users

| Person / identity | Evidence | Proposed role | State | Reason / missing action |
| --- | --- | --- | --- | --- |
| Mike Eatmon | WordPress administrator with verified brokerage-domain mailbox; public broker/agent page; active canonical Neon `primary` agent | `primary_lead_owner` | `PROVISIONED — DORMANT` | Linked to the canonical primary routing row; no credential/session and no activation email until Mike is ready |
| Brandon Narron | Authenticated WordPress administrator, authenticated Neon owner/audit identity, documented system owner, and explicit full-access authorization | `administrator` | `PROVISIONED — ACCEPTED` | Production login, role access, logout, and session revocation passed; permanent password choice remains in the newest owner reset email |
| Admin Escalation routing row | Active canonical routing identity; not proven to represent an individual login | none | `NOT A LEAD CENTER USER` | Keep as a routing/escalation record; never convert it into a human account |
| Regency Interactive WordPress administrators | Authenticated WordPress maintenance accounts | none | `NOT A LEAD CENTER USER` | Site-maintenance access is not brokerage lead access; no Lead Center provisioning authorized |
| Public Our Town agent directory entries | Public name/profile and, for some agents, public contact address | possible `approved_agent` | `PENDING OWNER APPROVAL` | Public presence does not prove Lead Center authorization, territory, export rights, or active assignment eligibility |
| Read-only analyst | No verified person identified | `read_only_analyst` | `INCOMPLETE IDENTITY` | Optional role; owner must name and approve a person before provisioning |

## Canonical routing roster

The Production Neon `agents` table currently contains two active routing rows:

- Mike Eatmon — role `primary`, priority 100, email notifications enabled, SMS disabled.
- Admin Escalation — role `admin`, fallback capacity, email notifications enabled, SMS disabled.

This routing roster is not an authentication roster. RBAC users and routing agents are linked only through an explicitly approved `agentId`.

## Public agent directory

The public directory lists multiple agents, including Kimberly Burris, Linda Godwin, Richard Evans, Lynn Davis, Damon Pope, Morgan Kennedy, Courtney Houston, Cindy Temple, Beth Helms, Bradley Eagles, Jordan Lamm, Debbie Reason, Nick Ellison, Spencer Lyndon, Daniel Harrell, Jane Evans, Cynthia Bannen, Brooke Dawson, and Mike Eatmon. These names remain unprovisioned until the owner approves each person’s access, territory, lead scope, exports, and administrative permissions.

## Future roster action

For any additional user, approve the exact work/login email, role, canonical
agent link, territory, assigned-lead scope, export permission, and active state.
Do not derive access from the public agent directory.
