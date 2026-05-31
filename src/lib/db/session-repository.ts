import type { DbSession } from "./types";
import { isDev, requireSupabase } from "./types";

export interface CreateSessionInput {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  referrerUrl?: string | null;
  referrerType?: string | null;
  landingPage?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  deviceType?: string | null;
  initialQuestion?: string | null;
  initialAddress?: string | null;
}

export async function createSession(input: CreateSessionInput): Promise<DbSession> {
  requireSupabase();

  if (isDev()) {
    const stubId = crypto.randomUUID();
    return {
      id: stubId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: "active",
      stepReached: 1,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      referrerType: input.referrerType ?? null,
      landingPage: input.landingPage ?? null,
      deviceType: input.deviceType ?? null,
      initialQuestion: input.initialQuestion ?? null,
      initialAddress: input.initialAddress ?? null,
    };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const client = createAdminClient();

  const { data, error } = await client
    .from("sessions")
    .insert({
      utm_source: input.utmSource,
      utm_medium: input.utmMedium,
      utm_campaign: input.utmCampaign,
      utm_content: input.utmContent,
      utm_term: input.utmTerm,
      referrer_url: input.referrerUrl,
      referrer_type: input.referrerType,
      landing_page: input.landingPage,
      user_agent: input.userAgent,
      ip_address: input.ipAddress,
      device_type: input.deviceType,
      initial_question: input.initialQuestion,
      initial_address: input.initialAddress,
    })
    .select("id, created_at, expires_at, status, step_reached, utm_source, utm_medium, utm_campaign, referrer_type, landing_page, device_type, initial_question, initial_address")
    .single();

  if (error) throw new Error(`[session-repository] createSession: ${error.message}`);

  return mapSession(data);
}

export async function advanceSessionStep(sessionId: string, step: number): Promise<void> {
  if (isDev()) return;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  await createAdminClient()
    .from("sessions")
    .update({ step_reached: step })
    .eq("id", sessionId);
}

export async function completeSession(sessionId: string): Promise<void> {
  if (isDev()) return;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  await createAdminClient()
    .from("sessions")
    .update({ status: "completed" })
    .eq("id", sessionId);
}

function mapSession(row: Record<string, unknown>): DbSession {
  return {
    id:              row.id as string,
    createdAt:       row.created_at as string,
    expiresAt:       row.expires_at as string,
    status:          row.status as DbSession["status"],
    stepReached:     (row.step_reached as number) ?? 1,
    utmSource:       (row.utm_source as string | null) ?? null,
    utmMedium:       (row.utm_medium as string | null) ?? null,
    utmCampaign:     (row.utm_campaign as string | null) ?? null,
    referrerType:    (row.referrer_type as string | null) ?? null,
    landingPage:     (row.landing_page as string | null) ?? null,
    deviceType:      (row.device_type as string | null) ?? null,
    initialQuestion: (row.initial_question as string | null) ?? null,
    initialAddress:  (row.initial_address as string | null) ?? null,
  };
}
