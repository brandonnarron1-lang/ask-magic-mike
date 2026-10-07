import { execFileSync, spawn } from "node:child_process";
import { readFileSync, readdirSync, mkdtempSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";

// No URL, credentials, exposed port, network, remote link or provider required.
export const container = `amm-qa-audit-${randomUUID()}`;
export const migration = "20261003203000_atomic_qa_capture_evidence.sql";
export const reliabilityMigration = "20261004020000_public_lead_notification_reliability.sql";
export const acceptedMigration = "20260716043829_infra_02_atomic_lifecycle.sql";
export const database = "amm_qa_upgrade";
export const statements: Array<{ sql: string; params: unknown[] }> = [];
let containerStarted = false;
const nativeBin = "/opt/homebrew/opt/postgresql@17/bin";
let nativeDirectory: string | undefined;
let nativePort = 5432;
function connectionArgs(db: string) {
  if (!nativeDirectory) throw new Error("isolated_native_database_required");
  return ["-h", nativeDirectory, "-p", String(nativePort), "-U", "postgres", "-d", db];
}
function databaseCommand(db: string, args: string[]) {
  return nativeDirectory
    ? { binary: join(nativeBin, "psql"), args: [...connectionArgs(db), ...args] }
    : { binary: "docker", args: ["exec", "-i", container, "psql", "-U", "postgres", "-d", db, ...args] };
}

export function psql(sql: string, db = database): string {
  if (!/^amm_qa_(upgrade|fresh)$/.test(db)) throw new Error("isolated_database_required");
  const command = databaseCommand(db, ["-X", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-q"]);
  return execFileSync(command.binary, command.args, { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024, timeout: 30_000 }).trim();
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

// Data-modifying WITH statements must remain top-level. psql CSV lets the
// actual webhook transaction execute intact instead of wrapping/mocking it.
function topLevelRows(sql: string): Array<Record<string, unknown>> {
  const command = databaseCommand(database, ["-X", "-v", "ON_ERROR_STOP=1", "--csv", "-q"]);
  const output = execFileSync(command.binary, command.args, { input: `SET ROLE service_role; ${sql};`, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 30_000 });
  const records: string[][] = []; let record: string[] = []; let field = ""; let quoted = false;
  for (let i = 0; i < output.length; i++) {
    const c = output[i];
    if (c === '"') {
      if (quoted && output[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n")) {
      record.push(field); field = "";
      if (c === "\n") { records.push(record); record = []; }
    } else field += c;
  }
  if (field || record.length) { record.push(field); records.push(record); }
  const [columns, ...rows] = records;
  return rows.filter((row) => row.length === columns.length).map((row) => Object.fromEntries(columns.map((column, index) => {
    const value = row[index];
    const typed = value === "t" ? true : value === "f" ? false : value === "" ? null
      : /^-?\d+$/.test(value) ? Number(value) : value;
    return [column, typed];
  })));
}

export const localQuery = {
  async query(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
    statements.push({ sql, params });
    const bound = bind(sql.replace(/;\s*$/, ""), params);
    if (/^\s*WITH\b/i.test(bound) && /\b(INSERT|UPDATE|DELETE)\b/i.test(bound)) return topLevelRows(bound);
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

export async function startDatabase(options: { loopbackTcp?: boolean } = {}): Promise<string | undefined> {
  if (process.env.AMM_QA_POSTGRES_TEST !== "1") throw new Error("explicit_isolated_test_required");
  // Explicit local-only alternative when Docker Desktop is unavailable. Never
  // connect to a configured app database or start/stop a shared Homebrew service.
  if (process.env.AMM_QA_NATIVE_POSTGRES_TEST === "1") {
    nativeDirectory = mkdtempSync(join(tmpdir(), "amm-qa-native-"));
    chmodSync(nativeDirectory, 0o700);
    execFileSync(join(nativeBin, "initdb"), ["-D", join(nativeDirectory, "data"), "-U", "postgres", "-A", "trust", "--no-locale"], { stdio: "pipe", timeout: 30_000 });
    if (options.loopbackTcp) {
      const portServer = createServer();
      await new Promise<void>((resolve, reject) => { portServer.once("error", reject); portServer.listen(0, "127.0.0.1", resolve); });
      nativePort = (portServer.address() as { port: number }).port;
      await new Promise<void>((resolve, reject) => portServer.close((error) => error ? reject(error) : resolve()));
    }
    execFileSync(join(nativeBin, "pg_ctl"), ["-D", join(nativeDirectory, "data"), "-l", join(nativeDirectory, "server.log"), "-o", `-k ${nativeDirectory} -p ${nativePort} -h '${options.loopbackTcp ? "127.0.0.1" : ""}' -c shared_buffers=32MB -c max_connections=20`, "-w", "start"], { stdio: "pipe", timeout: 30_000 });
    const setup = databaseCommand("postgres", ["-X", "-v", "ON_ERROR_STOP=1"]);
    execFileSync(setup.binary, setup.args, { input: "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE DATABASE amm_qa_upgrade; CREATE DATABASE amm_qa_fresh;", stdio: "pipe", timeout: 30_000 });
    return options.loopbackTcp ? `postgresql://postgres@127.0.0.1:${nativePort}/${database}` : undefined;
  }
  // Docker Desktop does not publish ports for internal-only networks. Opt-in
  // real-session tests use a disposable bridge with strictly loopback binding;
  // their built-app transport refuses nonlocal DBs and all external fetches.
  execFileSync("docker", ["run", "-d", "--name", container, "--network", options.loopbackTcp ? "bridge" : "none", "--memory", "512m",
    ...(options.loopbackTcp ? ["-p", "127.0.0.1::5432"] : []),
    "--label", "com.askmagicmike.purpose=qa-audit-isolated", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine"]);
  containerStarted = true;
  const identity = JSON.parse(execFileSync("docker", ["inspect", container], { encoding: "utf8" }))[0];
  const ports = identity.HostConfig.PortBindings || {};
  const networkOk = options.loopbackTcp
    ? identity.HostConfig.NetworkMode === "bridge" &&
      Object.keys(ports).length === 1 && ports["5432/tcp"]?.every((binding: { HostIp: string }) => binding.HostIp === "127.0.0.1")
    : identity.HostConfig.NetworkMode === "none" && Object.keys(ports).length === 0;
  if (!networkOk || identity.Config.Labels["com.askmagicmike.purpose"] !== "qa-audit-isolated") throw new Error("container_isolation_failed");
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
  if (options.loopbackTcp) {
    const port = JSON.parse(execFileSync("docker", ["inspect", container], { encoding: "utf8" }))[0].NetworkSettings.Ports["5432/tcp"][0].HostPort;
    return `postgresql://postgres@127.0.0.1:${port}/${database}`;
  }
}

export function install(db: "amm_qa_upgrade" | "amm_qa_fresh", includeRepair: boolean, excluded: ReadonlySet<string> = new Set()): void {
  psql("CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;", db);
  for (const file of readdirSync("supabase/migrations").filter((file) => file.endsWith(".sql")).sort()) {
    if (excluded.has(file)) continue;
    if (!includeRepair && file === migration) continue;
    if (!includeRepair && file === reliabilityMigration) continue;
    psql(readFileSync(`supabase/migrations/${file}`, "utf8"), db);
  }
  // Emulate server-role table access; browser roles receive no table grants.
  psql("GRANT USAGE ON SCHEMA public, extensions TO service_role; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role; UPDATE public.agents SET is_active=false; INSERT INTO public.agents(id,name,email,role,is_active,max_daily_leads,priority_score,notification_email) VALUES ('00000000-0000-4000-8000-000000009901','SYNTHETIC QA AGENT','agent@example.test','primary',true,0,100,true);", db);
}

export async function concurrent(sql: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = databaseCommand(database, ["-X", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-q"]);
    const child = spawn(command.binary, command.args);
    let output = ""; let error = "";
    child.stdout.on("data", (value) => { output += String(value); });
    child.stderr.on("data", (value) => { error += String(value); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
    child.stdin.end(sql);
  });
}

// Same real pg_dump/pg_restore rehearsal in either existing isolated venue.
// The fixed source/destination are synthetic databases owned by this fixture;
// never accept app credentials, another database name, or a configured URL.
export function dumpAndRestoreSyntheticDatabase(): Buffer {
  if (process.env.AMM_QA_POSTGRES_TEST !== "1") throw new Error("explicit_isolated_test_required");
  if (nativeDirectory) {
    const dump = execFileSync(join(nativeBin, "pg_dump"), [...connectionArgs("amm_qa_upgrade"), "-Fc"], { maxBuffer: 32 * 1024 * 1024, timeout: 30_000 });
    execFileSync(join(nativeBin, "pg_restore"), [...connectionArgs("amm_qa_fresh"), "--exit-on-error"], { input: dump, stdio: ["pipe", "ignore", "pipe"], timeout: 30_000 });
    return dump;
  }
  if (!containerStarted) throw new Error("owned_fixture_required");
  const dump = execFileSync("docker", ["exec", container, "pg_dump", "-U", "postgres", "-d", "amm_qa_upgrade", "-Fc"], { maxBuffer: 32 * 1024 * 1024, timeout: 30_000 });
  execFileSync("docker", ["exec", "-i", container, "pg_restore", "-U", "postgres", "-d", "amm_qa_fresh", "--exit-on-error"], { input: dump, stdio: ["pipe", "ignore", "pipe"], timeout: 30_000 });
  return dump;
}

export function stopDatabase(): void {
  if (nativeDirectory) {
    const owned = nativeDirectory;
    execFileSync(join(nativeBin, "pg_ctl"), ["-D", join(owned, "data"), "-m", "fast", "-w", "stop"], { stdio: "pipe", timeout: 20_000 });
    nativeDirectory = undefined;
    if (!owned.startsWith(join(tmpdir(), "amm-qa-native-"))) throw new Error("native_cleanup_identity_failed");
    rmSync(owned, { recursive: true });
    return;
  }
  // Exact UUID-named test container only; no unrelated stack or volume removed.
  if (!containerStarted) return;
  execFileSync("docker", ["rm", "-f", "-v", container], { stdio: "ignore" });
  containerStarted = false;
}
