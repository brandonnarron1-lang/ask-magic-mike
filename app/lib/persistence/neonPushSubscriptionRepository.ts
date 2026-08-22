import { neon } from "@neondatabase/serverless";

export type StaffPushRecipientRole = "primary" | "copy";

export type StaffPushSubscription = {
  id: string;
  recipientRole: StaffPushRecipientRole;
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceLabel: string | null;
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
    deviceLabel: typeof value.device_label === "string" ? value.device_label : null,
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
      this.schemaReady = (async () => {
        // Schema changes belong to reviewed migrations, never a public/runtime
        // request. The production role intentionally has no CREATE privilege.
        const result = (await this.sql.query(
          `SELECT to_regclass('public.staff_push_subscriptions') IS NOT NULL AS ready`,
        )) as Array<Record<string, unknown>>;
        if (result[0]?.ready !== true) {
          throw new Error("push_subscription_schema_missing");
        }
      })().catch((error) => {
        this.schemaReady = null;
        throw error;
      });
    }
    return this.schemaReady;
  }

  async listActive() {
    await this.ensureSchema();
    const rows = await this.sql.query(
      `SELECT id, recipient_role, endpoint, p256dh, auth, device_label, user_agent, is_active
       FROM public.staff_push_subscriptions
       WHERE is_active = TRUE ORDER BY created_at ASC`,
    );
    return (rows as Array<Record<string, unknown>>).map(row);
  }

  async findActiveById(id: string) {
    await this.ensureSchema();
    const rows = await this.sql.query(
      `SELECT id, recipient_role, endpoint, p256dh, auth, device_label, user_agent, is_active
       FROM public.staff_push_subscriptions
       WHERE id = $1::uuid AND is_active = TRUE LIMIT 1`,
      [id],
    );
    return rows[0] ? row(rows[0] as Record<string, unknown>) : null;
  }

  private async save(
    role: StaffPushRecipientRole,
    input: PushSubscriptionInput,
    userAgent?: string | null,
    deviceLabel?: string | null,
    allowRoleChange = true,
  ) {
    if (!validEndpoint(input.endpoint) || !validKey(input.keys.p256dh) || !validKey(input.keys.auth)) {
      throw new Error("invalid_push_subscription");
    }
    await this.ensureSchema();
    const rows = await this.sql.query(
      `INSERT INTO public.staff_push_subscriptions AS existing
         (recipient_role, endpoint, p256dh, auth, user_agent, device_label, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (endpoint) DO UPDATE SET
         recipient_role = CASE
           WHEN $7::boolean THEN EXCLUDED.recipient_role
           ELSE existing.recipient_role
         END,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         user_agent = EXCLUDED.user_agent,
         device_label = EXCLUDED.device_label,
         is_active = TRUE,
         updated_at = NOW(),
         last_error = NULL
       WHERE $7::boolean OR existing.recipient_role = EXCLUDED.recipient_role
       RETURNING id, recipient_role, endpoint, p256dh, auth, device_label, user_agent, is_active`,
      [
        role,
        input.endpoint,
        input.keys.p256dh,
        input.keys.auth,
        (userAgent || "").slice(0, 300) || null,
        (deviceLabel || "").trim().slice(0, 64) || null,
        allowRoleChange,
      ],
    );
    if (!rows[0]) throw new Error("push_subscription_role_conflict");
    return row(rows[0] as Record<string, unknown>);
  }

  /** Admin-only enrollment may deliberately reassign a known device role. */
  async upsert(role: StaffPushRecipientRole, input: PushSubscriptionInput, userAgent?: string | null, deviceLabel?: string | null) {
    return this.save(role, input, userAgent, deviceLabel, true);
  }

  /**
   * A bearer-scoped Brandon setup session must never relabel an existing
   * Mike/primary Push endpoint as a copy destination.
   */
  async upsertCopy(input: PushSubscriptionInput, userAgent?: string | null, deviceLabel?: string | null) {
    return this.save("copy", input, userAgent, deviceLabel, false);
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
