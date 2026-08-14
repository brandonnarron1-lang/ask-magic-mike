#!/usr/bin/env node

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for SLA reconciliation.");
  process.exit(2);
}

const assignmentSeconds = Math.max(30, Number(process.env.LEAD_ASSIGNMENT_SLA_SECONDS || 120));
const contactSeconds = Math.max(60, Number(process.env.LEAD_FIRST_CONTACT_SLA_SECONDS || 300));
const sql = neon(process.env.DATABASE_URL);

const [summary] = await sql.query(
  `SELECT
     COUNT(*) FILTER (
       WHERE is_test = FALSE
         AND created_at < NOW() - ($1::int * INTERVAL '1 second')
         AND COALESCE(assignment_status, 'unassigned') <> 'assigned'
     )::int AS unaccepted_assignment_breaches,
     COUNT(*) FILTER (
       WHERE is_test = FALSE
         AND created_at < NOW() - ($2::int * INTERVAL '1 second')
         AND last_contacted_at IS NULL
         AND status NOT IN ('spam', 'dead', 'converted')
     )::int AS first_contact_breaches,
     COUNT(*) FILTER (WHERE is_test = FALSE AND assigned_agent_id IS NULL)::int AS unassigned_live_leads,
     COUNT(*) FILTER (WHERE is_test = TRUE AND communication_suppressed = FALSE)::int AS unsuppressed_tests,
     COUNT(*) FILTER (WHERE is_test = FALSE AND is_duplicate = TRUE)::int AS live_duplicate_suspicions
   FROM public.leads`,
  [assignmentSeconds, contactSeconds],
);

const failures = Object.entries(summary).filter(([, value]) => Number(value) > 0);
console.log(JSON.stringify({
  checked_at: new Date().toISOString(),
  thresholds: { assignment_seconds: assignmentSeconds, first_contact_seconds: contactSeconds },
  summary,
  alert: failures.length > 0,
  failure_states: failures.map(([name, count]) => ({ name, count: Number(count) })),
}, null, 2));
if (failures.length) process.exitCode = 1;
