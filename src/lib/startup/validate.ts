import { createLogger } from "@/lib/observability/logger";

const log = createLogger("startup:validate");

export interface StartupCheck {
  name: string;
  status: "ok" | "fail" | "warn";
  message: string;
}

export interface StartupValidationResult {
  ok: boolean;
  checks: StartupCheck[];
  fatal: StartupCheck[];
  warnings: StartupCheck[];
}

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_SECRET",
] as const;

const RECOMMENDED_ENV = [
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

const CRITICAL_TABLES = [
  "leads",
  "sessions",
  "agents",
  "compliance_flags",
  "consents",
] as const;

export async function validateStartup(): Promise<StartupValidationResult> {
  const checks: StartupCheck[] = [];

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      checks.push({ name: `env:${key}`, status: "fail", message: `Required env var ${key} is not set` });
    } else {
      checks.push({ name: `env:${key}`, status: "ok", message: `${key} is configured` });
    }
  }

  for (const key of RECOMMENDED_ENV) {
    if (!process.env[key]) {
      checks.push({ name: `env:${key}`, status: "warn", message: `Recommended env var ${key} is not set` });
    } else {
      checks.push({ name: `env:${key}`, status: "ok", message: `${key} is configured` });
    }
  }

  const supabaseReady = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!supabaseReady) {
    checks.push({
      name: "db:connectivity",
      status: "fail",
      message: "Supabase env vars missing — cannot probe DB",
    });
    checks.push({
      name: "db:tables",
      status: "fail",
      message: "Supabase env vars missing — cannot probe tables",
    });
  } else {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = createAdminClient() as any;
      const { error } = await client.from("sessions").select("id").limit(1);
      if (error) {
        checks.push({
          name: "db:connectivity",
          status: "fail",
          message: `Supabase unreachable: ${error.message as string}`,
        });
      } else {
        checks.push({ name: "db:connectivity", status: "ok", message: "Supabase reachable" });

        for (const table of CRITICAL_TABLES) {
          const { error: tErr } = await client
            .from(table)
            .select("*", { head: true, count: "exact" });
          if (tErr) {
            checks.push({
              name: `db:table:${table}`,
              status: "fail",
              message: `Table ${table} not accessible: ${tErr.message as string}`,
            });
          } else {
            checks.push({ name: `db:table:${table}`, status: "ok", message: `Table ${table} accessible` });
          }
        }
      }
    } catch (err) {
      checks.push({
        name: "db:connectivity",
        status: "fail",
        message: `Supabase client error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const fatal = checks.filter((c) => c.status === "fail");
  const warnings = checks.filter((c) => c.status === "warn");

  if (fatal.length > 0) {
    log.error("startup.validation_failed", {
      fatalCount: fatal.length,
      failed: fatal.map((c) => c.name).join(", "),
    });
  } else if (warnings.length > 0) {
    log.warn("startup.validation_warnings", {
      warnCount: warnings.length,
      warned: warnings.map((c) => c.name).join(", "),
    });
  }

  return { ok: fatal.length === 0, checks, fatal, warnings };
}
