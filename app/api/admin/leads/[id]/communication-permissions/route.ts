import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { approvedQaRecipientConfigured, messagingFeatureFlags } from "@/lib/messaging/feature-flags";
import { loadLeadPermissionContext, evaluateAndRecordPermission } from "@/lib/messaging/neon-communication-repository";
import { MESSAGE_PURPOSES } from "@/lib/messaging/permission-engine";
import { evaluateLeadCommunicationPermission, type LeadPermissionFacts, type StoredPermission } from "@/lib/messaging/permission-service";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const schema = z.object({
  channel: z.enum(["email", "sms", "push", "phone"]),
  purpose: z.enum(MESSAGE_PURPOSES),
  humanApproved: z.boolean().optional().default(false),
});

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireLeadCenterApiPermission(request, "lead:view_assigned");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ ok: false, error: "invalid_lead_id" }, { status: 400, headers: NO_STORE });
  }
  const context = await loadLeadPermissionContext(id, auth.principal);
  if (!context.ok) {
    return NextResponse.json(context, { status: context.error === "lead_not_found" ? 404 : 503, headers: NO_STORE });
  }
  const flags = messagingFeatureFlags();
  const reviewMatrix = [
    { channel: "email" as const, purpose: "internal_alert" as const },
    { channel: "email" as const, purpose: "qa_test" as const },
    { channel: "email" as const, purpose: "transactional_acknowledgment" as const },
    { channel: "email" as const, purpose: "requested_service_response" as const },
    { channel: "email" as const, purpose: "marketing_nurture" as const },
    { channel: "sms" as const, purpose: "transactional_acknowledgment" as const },
    { channel: "sms" as const, purpose: "requested_service_response" as const },
    { channel: "phone" as const, purpose: "manual_one_to_one" as const },
  ].map((item) => ({
    ...item,
    decision: evaluateAndRecordPermissionPreview(context.lead, context.permissions, item, flags),
  }));
  return NextResponse.json({
    ok: true,
    lead: { isTest: context.lead.isTest, suppressed: context.lead.suppressed },
    permissions: context.permissions,
    reviewMatrix,
    release: { consumerEmail: flags.consumerAcknowledgment, consumerSms: flags.consumerSms, autoSend: flags.autoSend },
  }, { headers: NO_STORE });
}

function evaluateAndRecordPermissionPreview(
  lead: LeadPermissionFacts,
  permissions: StoredPermission[],
  item: { channel: "email" | "sms" | "push" | "phone"; purpose: (typeof MESSAGE_PURPOSES)[number] },
  flags: ReturnType<typeof messagingFeatureFlags>,
) {
  return evaluateLeadCommunicationPermission(lead, permissions, {
    ...item,
    recipientIsApprovedQa: approvedQaRecipientConfigured(),
    autoSendEnabled: flags.autoSend,
    humanApproved: false,
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403, headers: NO_STORE });
  const auth = await requireLeadCenterApiPermission(request, "notification:manage");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ ok: false, error: "invalid_lead_id" }, { status: 400, headers: NO_STORE });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400, headers: NO_STORE });
  const flags = messagingFeatureFlags();
  const result = await evaluateAndRecordPermission({
    leadId: id,
    principal: auth.principal,
    request: {
      ...parsed.data,
      recipientIsApprovedQa: approvedQaRecipientConfigured(),
      autoSendEnabled: flags.autoSend,
    },
  });
  if (!result.ok) return NextResponse.json(result, { status: result.error === "lead_not_found" ? 404 : 503, headers: NO_STORE });
  return NextResponse.json(result, { headers: NO_STORE });
}
