import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { loadAdminLeadInbox } from "../../../../lib/adminLeadView";

const schema = z.object({
  search: z.string().trim().min(2).max(120),
  filter: z.enum(["active", "working", "qualified", "closed", "all"]).default("all"),
  sort: z.enum(["newest", "oldest", "priority", "followup"]).default("newest"),
  offset: z.number().int().min(0).max(5_000).default(0),
});
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403, headers: NO_STORE });
  const auth = await requireLeadCenterApiPermission(request, "lead:view_assigned");
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_search" }, { status: 400, headers: NO_STORE });
  const result = await loadAdminLeadInbox({ ...parsed.data, limit: 20 }, auth.principal);
  return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
}
