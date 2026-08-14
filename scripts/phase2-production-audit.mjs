#!/usr/bin/env node

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(2);
}

const sql = neon(databaseUrl);

const [leadCounts, queueCounts, pushCounts, latestLead] = await Promise.all([
  sql`
    SELECT
      COUNT(*) FILTER (WHERE is_test = TRUE)::int AS test_leads,
      COUNT(*) FILTER (WHERE is_test = FALSE)::int AS live_leads,
      COUNT(*) FILTER (
        WHERE is_test = TRUE
          AND (
            communication_suppressed = FALSE
            OR email_suppressed = FALSE
            OR sms_suppressed = FALSE
          )
      )::int AS unsuppressed_test_leads
    FROM public.leads
  `,
  sql`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('queued', 'retrying'))::int AS pending,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COUNT(*) FILTER (WHERE status = 'sent')::int AS sent
    FROM public.lead_notifications
  `,
  sql`
    SELECT
      COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_devices,
      COUNT(*) FILTER (WHERE is_active = TRUE AND recipient_role = 'primary')::int AS primary_devices,
      COUNT(*) FILTER (WHERE is_active = TRUE AND recipient_role = 'copy')::int AS copy_devices
    FROM public.staff_push_subscriptions
  `,
  sql`
    SELECT created_at, is_test, communication_suppressed
    FROM public.leads
    ORDER BY created_at DESC
    LIMIT 1
  `,
]);

console.log(JSON.stringify({
  checked_at: new Date().toISOString(),
  database: "neondb",
  branch: "production",
  leads: leadCounts[0],
  notification_queue: queueCounts[0],
  web_push: pushCounts[0],
  latest_lead: latestLead[0] ?? null,
}, null, 2));
