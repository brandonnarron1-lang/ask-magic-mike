import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Pool, type PoolClient } from "pg";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { secretsMatch } from "../../../../../src/lib/admin/auth";
import { assertDatabaseMutationAllowed } from "../../../../../src/lib/preview-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const roles = [
  "administrator",
  "primary_lead_owner",
  "approved_agent",
  "read_only_analyst",
] as const;

const userSchema = z.object({
  key: z.enum(["administrator", "primary", "agent", "analyst", "disabled"]),
  name: z.string().min(8).max(80).refine((value) => value.includes("INTERNAL QA")),
  email: z.string().email().max(160).refine((value) => value.endsWith("@example.test")),
  password: z.string().min(20).max(128),
  role: z.enum(roles),
  banned: z.boolean().default(false),
});

const bodySchema = z.object({
  users: z.array(userSchema).length(5).superRefine((users, context) => {
    const keys = new Set(users.map((user) => user.key));
    const required = ["administrator", "primary", "agent", "analyst", "disabled"] as const;
    for (const key of required) {
      if (!keys.has(key)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `missing_${key}` });
      }
    }
    if (!users.find((user) => user.key === "disabled")?.banned) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "disabled_user_must_be_banned" });
    }
  }),
});

export function previewRbacBootstrapAvailable(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env.VERCEL_ENV === "preview" &&
    env.DATABASE_ENV === "preview" &&
    env.PREVIEW_DATA_MODE === "enabled" &&
    env.ALLOW_PREVIEW_DB_MUTATION === "true" &&
    env.LEAD_CENTER_RBAC_ENABLED === "true" &&
    Boolean(env.DATABASE_URL) &&
    Boolean(env.RBAC_PREVIEW_BOOTSTRAP_TOKEN)
  );
}

async function upsertAcceptanceUser(
  client: PoolClient,
  input: z.infer<typeof userSchema>,
  agentId: string | null,
) {
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM public.lead_center_users WHERE email = $1 LIMIT 1`,
    [input.email],
  );
  const userId = existing.rows[0]?.id || randomUUID();
  const password = await hashPassword(input.password);

  await client.query(
    `INSERT INTO public.lead_center_users
      (id, name, email, "emailVerified", role, banned, "banReason", "agentId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, TRUE, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       banned = EXCLUDED.banned,
       "banReason" = EXCLUDED."banReason",
       "agentId" = EXCLUDED."agentId",
       "emailVerified" = TRUE,
       "updatedAt" = NOW()`,
    [
      userId,
      input.name,
      input.email,
      input.role,
      input.banned,
      input.banned ? "INTERNAL QA disabled-account acceptance" : null,
      agentId,
    ],
  );

  const resolved = await client.query<{ id: string }>(
    `SELECT id FROM public.lead_center_users WHERE email = $1 LIMIT 1`,
    [input.email],
  );
  const resolvedId = resolved.rows[0].id;
  await client.query(
    `INSERT INTO public.lead_center_accounts
      (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, 'credential', $2, $3, NOW(), NOW())
     ON CONFLICT ("providerId", "accountId") DO UPDATE SET
       password = EXCLUDED.password,
       "updatedAt" = NOW()`,
    [randomUUID(), resolvedId, password],
  );
  await client.query(
    `INSERT INTO public.lead_center_auth_audit
      (user_id, actor, action, outcome, resource_type, resource_id, metadata)
     VALUES ($1, 'preview_acceptance_bootstrap', 'acceptance_user_upsert', 'success',
       'lead_center_user', $1, jsonb_build_object('role', $2::text, 'is_test', true))`,
    [resolvedId, input.role],
  );
}

export async function POST(request: NextRequest) {
  if (!previewRbacBootstrapAvailable()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!secretsMatch(
    process.env.RBAC_PREVIEW_BOOTSTRAP_TOKEN,
    request.headers.get("x-preview-bootstrap-token"),
  )) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return NextResponse.json({ ok: false, error: mutation.error }, { status: mutation.statusCode });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_acceptance_roster" }, { status: 400 });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const agents = await client.query<{ id: string; role: string }>(
      `SELECT id::text, role FROM public.agents WHERE is_active = TRUE
       ORDER BY CASE WHEN role = 'primary' THEN 0 ELSE 1 END, created_at ASC LIMIT 2`,
    );
    const primaryAgentId = agents.rows[0]?.id || null;
    const approvedAgentId = agents.rows[1]?.id || primaryAgentId;

    for (const user of parsed.data.users) {
      const agentId = user.key === "primary"
        ? primaryAgentId
        : user.key === "agent" || user.key === "disabled"
          ? approvedAgentId
          : null;
      await upsertAcceptanceUser(client, user, agentId);
    }

    const testLeads = await client.query<{ id: string }>(
      `SELECT id::text FROM public.leads
       WHERE is_test = TRUE AND communication_suppressed = TRUE
       ORDER BY created_at ASC LIMIT 2`,
    );
    const assignments = [
      { row: testLeads.rows[0], agentId: primaryAgentId, firstName: "INTERNAL QA PRIMARY" },
      { row: testLeads.rows[1], agentId: approvedAgentId, firstName: "INTERNAL QA AGENT" },
    ];
    for (const assignment of assignments) {
      if (!assignment.row || !assignment.agentId) continue;
      await client.query(
        `UPDATE public.leads SET
           first_name = $2,
           last_name = 'DO NOT CONTACT',
           email = NULL,
           phone = NULL,
           phone_normalized = NULL,
           question_raw = 'INTERNAL QA — DO NOT CONTACT — RBAC assignment acceptance',
           assigned_agent_id = $3::uuid,
           assignment_status = 'assigned',
           is_test = TRUE,
           communication_suppressed = TRUE,
           updated_at = NOW()
         WHERE id = $1::uuid AND is_test = TRUE AND communication_suppressed = TRUE`,
        [assignment.row.id, assignment.firstName, assignment.agentId],
      );
    }
    await client.query("COMMIT");
    return NextResponse.json({
      ok: true,
      users: parsed.data.users.length,
      roles: [...new Set(parsed.data.users.map((user) => user.role))],
      disabled_user: true,
      assigned_test_leads: assignments.filter((assignment) => assignment.row && assignment.agentId).length,
      environment: "preview",
    });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ ok: false, error: "bootstrap_failed" }, { status: 500 });
  } finally {
    client.release();
    await pool.end();
  }
}
