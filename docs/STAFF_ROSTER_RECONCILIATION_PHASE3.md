# Staff Roster Reconciliation — Phase 3

Date: 2026-08-14

## Decision

The available sources are sufficient to identify Mike as the primary lead owner, but they are not sufficient to provision the complete Production RBAC roster. Production Basic Auth must remain active until the exact administrator identity and permissions are approved. No account was created from a public agent page alone.

## Verified sources

- Authenticated WordPress Users list
- Authenticated Neon `agents` routing table (read-only query)
- Public Our Town Properties agent directory and individual agent pages
- Existing notification recipient configuration and Phase 2 operating documents
- Existing RBAC role/permission code

## Proposed users

| Person / identity | Evidence | Proposed role | State | Reason / missing action |
| --- | --- | --- | --- | --- |
| Mike Eatmon | WordPress administrator with verified brokerage-domain mailbox; public broker/agent page; active canonical Neon `primary` agent | `primary_lead_owner` | `VERIFIED — READY TO PROVISION` | Provision only after Preview acceptance; keep administrative user management separate unless the owner explicitly grants it |
| Brandon Narron | Authenticated WordPress administrator and documented system owner; current address is personal email | `administrator` or system-owner administrator | `INCOMPLETE IDENTITY` | Owner must approve the exact role and either approve the personal address or provide a verified work address through a secure interface |
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

## Consolidated owner action

Provide one approved Production roster through the secure roster workbook/interface with:

1. Brandon’s approved login address and whether his role is `administrator`.
2. Confirmation that Mike is `primary_lead_owner` and whether he has any administrator permissions.
3. Any additional approved agent, including exact work email, linked canonical agent row, territory, assigned-lead scope, export permission, and active state.
4. Any optional read-only analyst and approved reporting scope.

Until that single roster action is complete, do not invent users and do not enable Production RBAC.

