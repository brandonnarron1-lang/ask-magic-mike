import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLeadNotificationRepository,
  loadAgentForNotification,
  loadLeadForNotification,
} from "../../app/lib/leadNotificationRepository";
import { createDefaultPersistence } from "../../app/lib/persistence/defaultPersistence";
import { loadAdminLeadInbox } from "../../app/lib/adminLeadView";
import { loadAdminReportingSummary } from "../../app/lib/adminReportingView";

const originalFetch = globalThis.fetch;
const originalNodeEnv = process.env.NODE_ENV;
const originalVercelEnv = process.env.VERCEL_ENV;
const mutableEnv = process.env as Record<string, string | undefined>;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mutableEnv.NODE_ENV = originalNodeEnv;
  mutableEnv.VERCEL_ENV = originalVercelEnv;
  delete mutableEnv.DATABASE_URL;
  delete mutableEnv.ALLOW_LEGACY_SUPABASE_FALLBACK;
  delete mutableEnv.NEXT_PUBLIC_SUPABASE_URL;
  delete mutableEnv.SUPABASE_SERVICE_ROLE_KEY;
});

describe("production Neon-only persistence boundary", () => {
  it("does not construct canonical or notification persistence from legacy Supabase variables", async () => {
    const env = {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://legacy.example.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-key",
      ALLOW_LEGACY_SUPABASE_FALLBACK: "true",
    };
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    expect(createDefaultPersistence(env)).toBeNull();
    expect(createLeadNotificationRepository(env)).toBeNull();
    await expect(loadLeadForNotification("11111111-1111-4111-8111-111111111111", env)).resolves.toBeNull();
    await expect(loadAgentForNotification("22222222-2222-4222-8222-222222222222", env)).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps active Lead Center reads safely empty when production DATABASE_URL is absent", async () => {
    mutableEnv.NODE_ENV = "production";
    mutableEnv.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://legacy.example.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-key";
    process.env.ALLOW_LEGACY_SUPABASE_FALLBACK = "true";
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await expect(loadAdminLeadInbox()).resolves.toEqual({ configured: false, leads: [] });
    const reporting = await loadAdminReportingSummary();
    expect(reporting.configured).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
