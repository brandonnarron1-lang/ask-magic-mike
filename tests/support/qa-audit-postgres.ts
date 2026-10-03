import { execFileSync, spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

// No URL, credentials, exposed port, network, remote link or provider required.
export const container = `amm-qa-audit-${randomUUID()}`;
export const migration = "20261003203000_atomic_qa_capture_evidence.sql";
export const acceptedMigration = "20260716043829_infra_02_atomic_lifecycle.sql";
export const database = "amm_qa_upgrade";
export const statements: Array<{ sql: string; params: unknown[] }> = [];
let containerStarted = false;

export function psql(sql: string, db = database): string {
  if (!/^amm_qa_(upgrade|fresh)$/.test(db)) throw new Error("isolated_database_required");
  return execFileSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-d", db,
    "-v", "ON_ERROR_STOP=1", "-A", "-t", "-q"], { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024 }).trim();
}

export function literal(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return `ARRAY[${value.map(literal).join(",")}]`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function bind(sql: string, params: unknown[] = []): string {
  return sql.replace(/\$(\d+)\b/g, (_, index: string) => literal(params[Number(index) - 1]));
}

export const localQuery = {
  async query(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
    statements.push({ sql, params });
    const bound = bind(sql.replace(/;\s*$/, ""), params);
    const write = /^\s*(INSERT|UPDATE|DELETE)\b/i.test(bound);
    if (write && !/\bRETURNING\b/i.test(bound)) {
      psql(`SET ROLE service_role; ${bound};`);
      return [];
    }
    const query = write ? `WITH amm_rows AS (${bound}) SELECT COALESCE(jsonb_agg(amm_rows), '[]') FROM amm_rows`
      : `SELECT COALESCE(jsonb_agg(amm_rows), '[]') FROM (${bound}) amm_rows`;
    let output: string;
    try { output = psql(`SET ROLE service_role; ${query};`); }
    catch (error) {
      console.warn("isolated SQL diagnostic", String((error as { stderr?: Buffer }).stderr || "").split("\n")[0].slice(0, 180));
      throw error;
    }
    const parsed = JSON.parse(output);
    return parsed;
  },
};

export function acceptedFunction(): string {
  const source = readFileSync(`supabase/migrations/${acceptedMigration}`, "utf8");
  const match = source.match(/CREATE OR REPLACE FUNCTION public\.capture_public_lead_v1\([\s\S]+?\n\$\$;/);
  if (!match) throw new Error("accepted_function_missing");
  return match[0];
}

export async function startDatabase(): Promise<void> {
  if (process.env.AMM_QA_POSTGRES_TEST !== "1") throw new Error("explicit_isolated_test_required");
  execFileSync("docker", ["run", "-d", "--name", container, "--network", "none", "--memory", "512m",
    "--label", "com.askmagicmike.purpose=qa-audit-isolated", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine"]);
  containerStarted = true;
  const identity = JSON.parse(execFileSync("docker", ["inspect", container], { encoding: "utf8" }))[0];
  if (identity.HostConfig.NetworkMode !== "none" || Object.keys(identity.HostConfig.PortBindings || {}).length ||
    identity.Config.Labels["com.askmagicmike.purpose"] !== "qa-audit-isolated") throw new Error("container_isolation_failed");
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      execFileSync("docker", ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], { stdio: "ignore" });
      ready = true;
      break;
    } catch { await new Promise((resolve) => setTimeout(resolve, 250)); }
  }
  if (!ready) throw new Error("isolated_postgres_readiness_timeout");
  execFileSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], {
    input: "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE DATABASE amm_qa_upgrade; CREATE DATABASE amm_qa_fresh;",
    stdio: ["pipe", "ignore", "pipe"],
  });
}

export function install(db: "amm_qa_upgrade" | "amm_qa_fresh", includeRepair: boolean): void {
  psql("CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;", db);
  for (const file of readdirSync("supabase/migrations").filter((file) => file.endsWith(".sql")).sort()) {
    if (!includeRepair && file === migration) continue;
    psql(readFileSync(`supabase/migrations/${file}`, "utf8"), db);
  }
  // Emulate server-role table access; browser roles receive no table grants.
  psql("GRANT USAGE ON SCHEMA public, extensions TO service_role; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role; UPDATE public.agents SET is_active=false; INSERT INTO public.agents(id,name,email,role,is_active,max_daily_leads,priority_score,notification_email) VALUES ('00000000-0000-4000-8000-000000009901','SYNTHETIC QA AGENT','agent@example.test','primary',true,0,100,true);", db);
}

export async function concurrent(sql: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-A", "-t", "-q"]);
    let output = ""; let error = "";
    child.stdout.on("data", (value) => { output += String(value); });
    child.stderr.on("data", (value) => { error += String(value); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
    child.stdin.end(sql);
  });
}

export function stopDatabase(): void {
  // Exact UUID-named test container only; no unrelated stack or volume removed.
  if (!containerStarted) return;
  execFileSync("docker", ["rm", "-f", "-v", container], { stdio: "ignore" });
  containerStarted = false;
}
