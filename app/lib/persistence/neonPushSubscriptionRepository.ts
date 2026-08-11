import { neon } from "@neondatabase/serverless";

export type StaffPushRecipientRole = "primary" | "copy";

export type StaffPushSubscription = {
  id: string;
  recipientRole: StaffPushRecipientRole;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  isActive: boolean;
};

type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function validEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && value.length <= 2048;
  } catch {
    return false;
  }
}

function validKey(value: string) {
  return /^[A-Za-z0-9_-]{16,256}$/.test(value);
}

function row(value: Record<string, unknown>): StaffPushSubscription {
  return {
    id: String(value.id),
    recipientRole: value.recipient_role === "copy" ? "copy" : "primary",
    endpoint: String(value.endpoint),
    p256dh: String(value.p256dh),
    auth: String(value.auth),
    userAgent: typeof value.user_agent === "string" ? value.user_agent : null,
    isActive: value.is_active === true,
  };
}

export class NeonPushSubscriptionRepository {
  private readonly sql;
  private schemaReady: Promise<void> | null = null;

  constructor(databaseUrl = process.env.DATABASE_URL) {
    if (!databaseUrl) throw new Error("database_not_configured");
    this.sql = neon(databaseUrl);
  }

  private ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = this.sql.query(`
        DO $amm_push$
        BEGIN
          PERFORM pg_advisory_xact_lock(2026081119);
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'lead_notifications_channel_check'
              AND pg_get_constraintdef(oid) ILIKE '%push%'
          ) THEN
            ALTER TABLE public.lead_notifications
              DROP CONSTRAINT IF EXISTS lead_notifications_channel_check;
            ALTER TABLE public.lead_notifications
              ADD CONSTRAINT lead_notifications_channel_check
              CHECK (channel IN ('email', 'sms', 'push'));
          END IF;

          CREATE TABLE IF NOT EXISTS public.staff_push_subscriptions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            recipient_role TEXT NOT NULL CHECK (recipient_role IN ('primary', 'copy')),
            endpoint TEXT NOT NULL UNIQUE,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            user_agent TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_sent_at TIMESTAMPTZ,
            last_error TEXT
          );
          ALTER TABLE public.staff_push_subscriptions ENABLE ROW LEVEL SECURITY;
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'staff_push_subscriptions'
              AND policyname = 'staff_push_subscriptions_deny_public'
          ) THEN
            CREATE POLICY staff_push_subscriptions_deny_public
              ON public.staff_push_subscriptions
              FOR ALL TO PUBLIC USING (FALSE) WITH CHECK (FALSE);
          END IF;
        END $amm_push$;
        CREATE INDEX IF NOT EXISTS staff_push_subscriptions_active_role_idx
          ON public.staff_push_subscriptions(recipient_role)
          WHERE is_active = TRUE;
      `).then(() => undefined).catch((error) => {
        this.schemaReady = null;
        throw error;
      });
    }
    return this.schemaReady;
  }

  async listActive() {
    await this.ensureSchema();
    const rows = await this.sql.query(
      `SELECT id, recipient_role, endpoint, p256dh, auth, user_agent, is_active
       FROM public.staff_push_subscriptions
       WHERE is_active = TRUE ORDER BY created_at ASC`,
    );
    return (rows as Array<Record<string, unknown>>).map(row);
  }

  async findActiveById(id: string) {
    await this.ensureSchema();
    const rows = await this.sql.query(
      `SELECT id, recipient_role, endpoint, p256dh, auth, user_agent, is_active
       FROM public.staff_push_subscriptions
       WHERE id = $1::uuid AND is_active = TRUE LIMIT 1`,
      [id],
    );
    return rows[0] ? row(rows[0] as Record<string, unknown>) : null;
  }

  async upsert(role: StaffPushRecipientRole, input: PushSubscriptionInput, userAgent?: string | null) {
    if (!validEndpoint(input.endpoint) || !validKey(input.keys.p256dh) || !validKey(input.keys.auth)) {
      throw new Error("invalid_push_subscription");
    }
    await this.ensureSchema();
    const rows = await this.sql.query(
      `INSERT INTO public.staff_push_subscriptions
         (recipient_role, endpoint, p256dh, auth, user_agent, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (endpoint) DO UPDATE SET
         recipient_role = EXCLUDED.recipient_role,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         user_agent = EXCLUDED.user_agent,
         is_active = TRUE,
         updated_at = NOW(),
         last_error = NULL
       RETURNING id, recipient_role, endpoint, p256dh, auth, user_agent, is_active`,
      [role, input.endpoint, input.keys.p256dh, input.keys.auth, (userAgent || "").slice(0, 300) || null],
    );
    return row(rows[0] as Record<string, unknown>);
  }

  async deactivate(id: string) {
    await this.ensureSchema();
    await this.sql.query(
      `UPDATE public.staff_push_subscriptions
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1::uuid`,
      [id],
    );
  }

  async markSent(id: string) {
    await this.ensureSchema();
    await this.sql.query(
      `UPDATE public.staff_push_subscriptions
       SET last_sent_at = NOW(), last_error = NULL, updated_at = NOW()
       WHERE id = $1::uuid`,
      [id],
    );
  }

  async markFailure(id: string, summary: string, deactivate = false) {
    await this.ensureSchema();
    await this.sql.query(
      `UPDATE public.staff_push_subscriptions
       SET last_error = $2, is_active = CASE WHEN $3 THEN FALSE ELSE is_active END, updated_at = NOW()
       WHERE id = $1::uuid`,
      [id, summary.slice(0, 220), deactivate],
    );
  }
}
