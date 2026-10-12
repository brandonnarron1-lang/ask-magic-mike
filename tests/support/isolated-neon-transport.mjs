// Test-only wire adapter: the built app executes its unchanged Neon SQL against
// real isolated PostgreSQL. No query/result mock and no runtime auth bypass.
// Loaded only by the opt-in loopback acceptance runner, never by application code.
import { Pool } from "pg";
import { appendFileSync } from "node:fs";
import path from "node:path";
const artifactDirectory = process.env.AMM_SESSION_ARTIFACT_DIR && path.resolve(process.env.AMM_SESSION_ARTIFACT_DIR);
if (artifactDirectory && !artifactDirectory.startsWith(`${path.resolve(".amm-run")}${path.sep}`)) throw new Error("private_session_artifact_directory_required");
const diagnosticPath = artifactDirectory ? path.join(artifactDirectory, "transport.log") : process.env.AMM_LEAD_READABILITY_ACCEPTANCE === "1"
  ? ".amm-run/lead-alert-readability-20261009/real-session/transport.log"
  : ".amm-run/reference-session-acceptance/transport.log";
const diagnostic = value => appendFileSync(diagnosticPath, `${JSON.stringify(value)}\n`, { mode: 0o600 });
const url = new URL(process.env.DATABASE_URL || "http://invalid");
if (process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1" || process.env.VERCEL_ENV !== "development" ||
    url.hostname !== "localhost" || url.pathname !== "/amm_qa_upgrade" || url.username !== "postgres") {
  throw new Error("isolated_transport_refuses_non_test_database");
}
const pool = new Pool({ connectionString: url.href, max: 4 });
const originalFetch = globalThis.fetch;
diagnostic({ stage: "transport_loaded", pid: process.pid });
globalThis.fetch = async (input, init) => {
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  const connection = headers.get("Neon-Connection-String");
  // Neon rewrites numeric loopback hosts into a non-URL API host. Route by the
  // exact connection header before parsing the unused transport URL.
  diagnostic({ stage: "fetch", sql: Boolean(connection), rssBytes:process.memoryUsage().rss });
  if (!connection) {
    const target = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (!["127.0.0.1", "localhost"].includes(target.hostname)) throw new Error("isolated_acceptance_external_fetch_denied");
    return originalFetch(input, init);
  }
  if (connection !== process.env.DATABASE_URL) throw new Error("isolated_transport_connection_mismatch");
  const client = await pool.connect();
  try {
    const rawBody = typeof init?.body === "string" ? init.body : input instanceof Request ? await input.clone().text() : "";
    const body = JSON.parse(rawBody);
    const execute = async ({ query, params }) => {
      const result = await client.query({ text: query, values: params, rowMode: "array", types: { getTypeParser: () => value => value } });
      return { rows: result.rows, fields: result.fields.map(field => ({ name: field.name, dataTypeID: field.dataTypeID })), rowCount: result.rowCount, command: result.command };
    };
    if (body.queries) {
      await client.query("BEGIN");
      const results = [];
      for (const query of body.queries) results.push(await execute(query));
      await client.query("COMMIT");
      return Response.json({ results });
    }
    return Response.json(await execute(body));
  } catch (error) {
    await client.query("ROLLBACK");
    diagnostic({ stage: "sql_failure", code: error.code, message: error.message });
    return Response.json({ message: "isolated_sql_failed", code: error.code }, { status: 400 });
  } finally { client.release(); }
};
