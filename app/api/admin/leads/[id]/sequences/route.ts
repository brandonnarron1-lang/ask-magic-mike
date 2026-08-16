import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { messagingFeatureFlags } from "@/lib/messaging/feature-flags";
import { createLeadSequence, loadLeadSequences, transitionLeadSequence } from "@/lib/messaging/neon-sequence-repository";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const bodySchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), sequenceId: z.string().min(1).max(100) }),
  z.object({
    operation: z.literal("transition"),
    sequenceInstanceId: z.string().uuid(),
    action: z.enum(["request_approval", "begin_test", "approve", "activate", "pause", "resume", "complete", "cancel", "block", "fail"]),
  }),
]);

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireLeadCenterApiPermission(request, "lead:view_assigned");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ ok: false, error: "invalid_lead_id" }, { status: 400, headers: NO_STORE });
  const result = await loadLeadSequences(id, auth.principal);
  return NextResponse.json(result, { status: result.ok ? 200 : result.statusCode, headers: NO_STORE });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403, headers: NO_STORE });
  const auth = await requireLeadCenterApiPermission(request, "notification:manage");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ ok: false, error: "invalid_lead_id" }, { status: 400, headers: NO_STORE });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400, headers: NO_STORE });
  const result = parsed.data.operation === "create"
    ? await createLeadSequence({ leadId: id, sequenceId: parsed.data.sequenceId, principal: auth.principal })
    : await transitionLeadSequence({
      leadId: id,
      sequenceInstanceId: parsed.data.sequenceInstanceId,
      action: parsed.data.action,
      principal: auth.principal,
      schedulerEnabled: messagingFeatureFlags().sequenceScheduler,
    });
  return NextResponse.json(result, { status: result.ok ? 200 : result.statusCode, headers: NO_STORE });
}
