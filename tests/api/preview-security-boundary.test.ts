import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as slaSweepGET } from "../../src/app/api/admin/sla/sweep/route";
import { createAdminClient } from "../../src/lib/supabase/admin";
import {
  assertDatabaseMutationAllowed,
  isPreviewDataDisabled,
  previewDataMode,
} from "../../src/lib/preview-security";

afterEach(() => {
  delete (process.env as Record<string, string | undefined>).ADMIN_SECRET;
  delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
  delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
  delete (process.env as Record<string, string | undefined>).VERCEL_ENV;
  delete (process.env as Record<string, string | undefined>).DATABASE_ENV;
  delete (process.env as Record<string, string | undefined>).PREVIEW_DATA_MODE;
  delete (process.env as Record<string, string | undefined>).ALLOW_PREVIEW_DB_MUTATION;
});

describe("Preview security boundary", () => {
  it("fails closed for Preview when PREVIEW_DATA_MODE is disabled or absent", () => {
    const disabledEnv = {
      VERCEL_ENV: "preview",
      DATABASE_ENV: "preview",
      PREVIEW_DATA_MODE: "disabled",
      ALLOW_PREVIEW_DB_MUTATION: "false",
    };
    expect(previewDataMode(disabledEnv)).toBe("disabled");
    expect(isPreviewDataDisabled(disabledEnv)).toBe(true);
    expect(assertDatabaseMutationAllowed(disabledEnv)).toMatchObject({
      ok: false,
      statusCode: 503,
      error: "preview_data_disabled",
    });

    const absentEnv = {
      VERCEL_ENV: "preview",
      DATABASE_ENV: "preview",
      ALLOW_PREVIEW_DB_MUTATION: "true",
    };
    expect(previewDataMode(absentEnv)).toBe("unknown");
    expect(isPreviewDataDisabled(absentEnv)).toBe(true);
  });

  it("allows local or production code paths to use their existing guards outside Preview", () => {
    expect(assertDatabaseMutationAllowed({ DATABASE_ENV: "development" })).toEqual({ ok: true });
    expect(assertDatabaseMutationAllowed({ VERCEL_ENV: "production", DATABASE_ENV: "production" })).toEqual({ ok: true });
  });

  it("blocks Supabase admin client construction in Preview read-only mode even when a key is present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://production-ref.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = ["production", "service", "role"].join("-");
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.PREVIEW_DATA_MODE = "disabled";
    process.env.ALLOW_PREVIEW_DB_MUTATION = "false";

    expect(() => createAdminClient()).toThrow(/data-disabled mode blocks/i);
  });

  it("refuses persistent cron writes in Preview read-only mode", async () => {
    process.env.ADMIN_SECRET = "test-secret";
    process.env.VERCEL_ENV = "preview";
    process.env.DATABASE_ENV = "preview";
    process.env.PREVIEW_DATA_MODE = "disabled";
    process.env.ALLOW_PREVIEW_DB_MUTATION = "false";

    const res = await slaSweepGET(new NextRequest("http://localhost/api/admin/sla/sweep?persist=true", {
      headers: { "x-admin-secret": "test-secret" },
    }));

    expect(res.status).toBe(503);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: false,
      error: "preview_data_disabled",
    });

  });
});
