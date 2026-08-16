import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import {
  MESSAGE_TEMPLATE_REGISTRY,
  renderMessageTemplate,
  templateVariables,
  templateVersionHistory,
} from "@/lib/messaging/template-registry";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const renderSchema = z.object({
  templateId: z.string().min(1).max(120),
  variables: z.record(z.union([z.string().max(500), z.number().finite()])).default({}),
});

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const auth = await requireLeadCenterApiPermission(request, "notification:manage");
  if (!auth.ok) return auth.response;
  const requested = new URL(request.url).searchParams.get("template_id");
  if (requested) {
    const history = templateVersionHistory(requested);
    return NextResponse.json(history.length ? { ok: true, history } : { ok: false, error: "template_not_found" }, {
      status: history.length ? 200 : 404,
      headers: NO_STORE,
    });
  }
  return NextResponse.json({
    ok: true,
    templates: MESSAGE_TEMPLATE_REGISTRY.map((template) => ({
      ...template,
      variables: templateVariables(template),
      versionCount: templateVersionHistory(template.id).length,
    })),
    sendEnabled: false,
  }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403, headers: NO_STORE });
  const auth = await requireLeadCenterApiPermission(request, "notification:manage");
  if (!auth.ok) return auth.response;
  const parsed = renderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400, headers: NO_STORE });
  const result = renderMessageTemplate(parsed.data.templateId, parsed.data.variables);
  return NextResponse.json(result, { status: result.ok ? 200 : result.error === "template_not_found" ? 404 : 400, headers: NO_STORE });
}

