import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { trackEventNoWait } from "@/lib/analytics/ledger";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkAdminAuth(req);
  if (!auth.ok)
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: NO_STORE }
    );
  const { id } = await params;
  if (!UUID.test(id))
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400, headers: NO_STORE });

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    due_at?: string;
    priority?: "low" | "normal" | "high" | "urgent";
    category?: string;
    agent_id?: string;
  };
  const title = (body.title ?? "").trim();
  if (!title)
    return NextResponse.json(
      { ok: false, error: "title_required" },
      { status: 400, headers: NO_STORE }
    );

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { ok: true, note: "mock_mode", title },
      { headers: NO_STORE }
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  const { data, error } = await client
    .from("tasks")
    .insert({
      lead_id: id,
      agent_id: body.agent_id ?? null,
      created_by: auth.actor,
      title,
      body: body.body ?? null,
      due_at: body.due_at ?? null,
      priority: body.priority ?? "normal",
      category: body.category ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: NO_STORE }
    );
  }

  trackEventNoWait({
    eventName: "task_created",
    leadId: id,
    properties: { taskId: data.id, priority: body.priority ?? "normal" },
  });

  return NextResponse.json({ ok: true, task_id: data.id }, { headers: NO_STORE });
}
