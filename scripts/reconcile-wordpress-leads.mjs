#!/usr/bin/env node

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for WordPress-to-Neon reconciliation.");
  process.exit(2);
}

const allowed = (process.env.WORDPRESS_CANONICAL_FORM_IDS || "3")
  .split(",")
  .map((value) => value.trim())
  .filter((value) => /^\d+$/.test(value));
const sql = neon(process.env.DATABASE_URL);

const [summary] = await sql.query(
  `WITH wordpress_leads AS (
     SELECT l.id, l.is_test, l.consent_source, l.request_idempotency_key,
            substring(l.consent_source FROM 'gravity_forms_([0-9]+)') AS form_id
       FROM public.leads l
      WHERE l.consent_source LIKE 'gravity_forms_%'
         OR l.source ILIKE '%ourtown%'
   )
   SELECT
     COUNT(*)::int AS canonical_wordpress_leads,
     COUNT(*) FILTER (WHERE form_id IS NULL)::int AS missing_form_identity,
     COUNT(*) FILTER (WHERE form_id IS NOT NULL AND NOT (form_id = ANY($1::text[])))::int AS unauthorized_form_forwards,
     COUNT(*) FILTER (WHERE request_idempotency_key IS NULL)::int AS missing_idempotency_keys,
     COUNT(*) FILTER (WHERE is_test = TRUE)::int AS test_records
   FROM wordpress_leads`,
  [allowed],
);

const [queue] = await sql.query(
  `SELECT
     COUNT(*) FILTER (WHERE status IN ('queued', 'retrying'))::int AS pending,
     COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
   FROM public.lead_notifications`,
);
const failures = Number(summary.unauthorized_form_forwards) + Number(summary.missing_form_identity) + Number(queue.failed);
console.log(JSON.stringify({
  checked_at: new Date().toISOString(),
  reconciliation_scope: "canonical_database_side",
  allowed_form_ids: allowed,
  summary,
  notification_queue: queue,
  alert: failures > 0,
  note: "Gravity entry-count comparison requires the authenticated WordPress bridge health panel.",
}, null, 2));
if (failures) process.exitCode = 1;
