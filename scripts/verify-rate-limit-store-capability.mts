#!/usr/bin/env node

import { neon } from "@neondatabase/serverless";
import {
  evaluateRateLimitStoreCapability,
  RATE_LIMIT_STORE_CAPABILITY_SELECT,
} from "../src/lib/security/rate-limit-readiness.ts";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.log(JSON.stringify({ ok: false, error: "database_not_configured" }));
  process.exitCode = 1;
} else {
  try {
    const sql = neon(databaseUrl);
    const rows = await sql.query(
      `SELECT ${RATE_LIMIT_STORE_CAPABILITY_SELECT}`,
      [],
    ) as Array<Record<string, unknown>>;
    const capability = evaluateRateLimitStoreCapability(rows[0]);
    console.log(JSON.stringify({ ok: capability.ready, ...capability }));
    if (!capability.ready) process.exitCode = 1;
  } catch {
    console.log(JSON.stringify({ ok: false, error: "capability_query_failed" }));
    process.exitCode = 1;
  }
}
