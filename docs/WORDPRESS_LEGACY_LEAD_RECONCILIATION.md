# WordPress legacy lead reconciliation

Status: implemented as a read-only operator tool; no historical lead import is authorized.

## Purpose

The existing WordPress `amm_leads` table is a temporary historical/audit store.
Neon remains the canonical lead database. This workflow compares a reviewed local
WordPress CSV export with canonical identity candidates without importing,
merging, suppressing, deleting, assigning, or messaging any lead.

It upgrades the existing `pnpm reconcile-wordpress-leads` command instead of
creating another database, dashboard, capture route, or notification engine.

## Privacy and safety contract

- The input CSV stays on the operator's machine and is never uploaded by the tool.
- Only the WordPress row ID plus normalized email, phone, and optional property
  address are retained in memory. Names, messages, notes, and other columns are
  ignored immediately.
- Property address is corroboration only. It never establishes person identity.
- Output contains WordPress row IDs, canonical lead IDs, match reasons, confidence,
  duplicate state, and aggregate counts. It contains no raw or normalized contact
  values.
- The PostgreSQL session starts with `BEGIN TRANSACTION READ ONLY`, then applies
  bounded lock and statement timeouts.
- Legacy mode requires `DATABASE_ENV=production` and an exact
  `PRODUCTION_NEON_ENDPOINT_ID` match. A pooled endpoint suffix is normalized, but
  a different endpoint is refused.
- The command has no execute/import option and refuses unknown arguments.
- `private-reconciliation/` and `*.amm-wordpress-leads.csv` are ignored by Git.

## Required secure inputs

Set these only through the existing secure shell or secret interface:

```bash
DATABASE_URL=
DATABASE_ENV=production
PRODUCTION_NEON_ENDPOINT_ID=
WORDPRESS_CANONICAL_FORM_IDS=3
```

Never pass the connection string on the command line, paste it into chat, place it
in the CSV, or save it in a committed file.

## Operator sequence

1. Obtain separate approval to export historical WordPress lead data. Exporting
   is not an import or deletion, but the file contains private consumer data.
2. Save the file outside the repository, preferably under a mode-700 temporary
   directory, and set the file to mode 600. The tool refuses relative paths,
   symlinks, non-regular files, and group/world-readable inputs. A supported
   filename is `legacy.amm-wordpress-leads.csv`.
3. Confirm the CSV has a numeric row-ID column plus an email or phone column.
   Supported aliases include `id`, `lead_id`, `email`, `lead_email`, `phone`,
   `lead_phone`, `address`, and `property_address`.
4. Run:

```bash
chmod 600 /absolute/private/path/legacy.amm-wordpress-leads.csv
pnpm reconcile-wordpress-leads -- --legacy-csv /absolute/private/path/legacy.amm-wordpress-leads.csv
```

5. Review only the PII-free JSON output. Any `operator_review`,
   `unmatched_import_candidate`, `split_identity_conflict`,
   `ambiguous_canonical_match`, `insufficient_identity`, or local duplicate keeps
   `alert=true`.
6. Preserve the report in the protected operating evidence store. Do not commit
   the source CSV.
7. Obtain a separate, row-specific owner approval before any future import,
   merge, suppression, status change, assignment, or deletion.

## Classification

| Classification | Meaning | Permitted action |
|---|---|---|
| `matched_candidate` | One canonical lead is supported by at least two identity signals | Human review only |
| `operator_review` | One email or phone signal points to one canonical lead | Human review only |
| `unmatched_import_candidate` | No canonical email/phone candidate exists | Prepare a future import packet; do not import |
| `split_identity_conflict` | Email and phone resolve to different canonical leads | Stop and investigate |
| `ambiguous_canonical_match` | More than one canonical lead owns the candidate identity | Stop and investigate |
| `insufficient_identity` | Neither a usable email nor phone is present | Manual review; address alone is not identity |

This workflow deliberately ends at a decision packet. The production data gate
remains separate and destructive reconciliation is never inferred from a dry-run.
