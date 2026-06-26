"use server";

/**
 * Server actions for the admin lead detail page.
 *
 * These run only on the server (Next.js server actions), so
 * `ADMIN_SECRET` never reaches the browser. Each action wraps the
 * corresponding REST endpoint by reading the secret out of env and
 * forwarding the call with the `x-admin-secret` header.
 *
 * Why call the REST routes instead of the DB directly?
 *   - One canonical mutation path. Every audit log, every analytics
 *     event, every consent gate already lives in those routes.
 *   - Same code path the future admin mobile / Slack / Make.com
 *     automations will use.
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  LEAD_STATUSES,
  LEAD_TYPES,
  type LeadStatus,
} from "@/lib/leads/lead-types";

interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

function siteOrigin(req: Headers): string {
  const proto = req.get("x-forwarded-proto") ?? "https";
  const host = req.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function call(
  path: string,
  init: RequestInit & { jsonBody?: unknown }
): Promise<{ status: number; body: unknown }> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return { status: 503, body: { ok: false, error: "admin_secret_not_configured" } };
  }
  const hdrs = await headers();
  const origin = siteOrigin(hdrs);
  const res = await fetch(`${origin}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": secret,
      ...(init.headers as Record<string, string> | undefined),
    },
    body: init.jsonBody ? JSON.stringify(init.jsonBody) : init.body,
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function assignLeadAction(formData: FormData): Promise<ActionResult> {
  const leadId = String(formData.get("lead_id") ?? "");
  const agentId = String(formData.get("agent_id") ?? "");
  const reason = String(formData.get("reason") ?? "") || undefined;
  if (!leadId || !agentId) return { ok: false, error: "lead_id_and_agent_id_required" };

  const r = await call(`/api/admin/leads/${leadId}/assign`, {
    method: "POST",
    jsonBody: { agent_id: agentId, reason },
  });
  if (r.status >= 300) {
    return { ok: false, error: `assign_failed_${r.status}` };
  }
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: "Lead assigned." };
}

export async function updateStatusAction(formData: FormData): Promise<ActionResult> {
  const leadId = String(formData.get("lead_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!leadId) return { ok: false, error: "lead_id_required" };
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "invalid_status" };
  }
  const r = await call(`/api/admin/leads/${leadId}`, {
    method: "PATCH",
    jsonBody: { status: status as LeadStatus },
  });
  if (r.status >= 300) return { ok: false, error: `status_update_failed_${r.status}` };
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: `Status set to ${status}.` };
}

export async function updateLeadTypeAction(formData: FormData): Promise<ActionResult> {
  const leadId = String(formData.get("lead_id") ?? "");
  const leadType = String(formData.get("lead_type") ?? "");
  if (!leadId) return { ok: false, error: "lead_id_required" };
  if (!(LEAD_TYPES as readonly string[]).includes(leadType))
    return { ok: false, error: "invalid_lead_type" };

  const r = await call(`/api/admin/leads/${leadId}`, {
    method: "PATCH",
    jsonBody: { lead_type: leadType },
  });
  if (r.status >= 300) return { ok: false, error: `lead_type_update_failed_${r.status}` };
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: `Lead type set to ${leadType}.` };
}

export async function markSpamAction(formData: FormData): Promise<ActionResult> {
  const leadId = String(formData.get("lead_id") ?? "");
  const spam = String(formData.get("spam") ?? "true") === "true";
  if (!leadId) return { ok: false, error: "lead_id_required" };
  const r = await call(`/api/admin/leads/${leadId}`, {
    method: "PATCH",
    jsonBody: { mark_spam: spam },
  });
  if (r.status >= 300) return { ok: false, error: `mark_spam_failed_${r.status}` };
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: spam ? "Marked as spam." : "Cleared spam flag." };
}

export async function addNoteAction(formData: FormData): Promise<ActionResult> {
  const leadId = String(formData.get("lead_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!leadId) return { ok: false, error: "lead_id_required" };
  if (!note) return { ok: false, error: "note_required" };
  const r = await call(`/api/admin/leads/${leadId}/notes`, {
    method: "POST",
    jsonBody: { note },
  });
  if (r.status >= 300) return { ok: false, error: `note_failed_${r.status}` };
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: "Note added." };
}

export async function createTaskAction(formData: FormData): Promise<ActionResult> {
  const leadId = String(formData.get("lead_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "") || undefined;
  const dueAt = String(formData.get("due_at") ?? "") || undefined;
  const priority = String(formData.get("priority") ?? "normal");
  if (!leadId) return { ok: false, error: "lead_id_required" };
  if (!title) return { ok: false, error: "title_required" };
  const r = await call(`/api/admin/leads/${leadId}/tasks`, {
    method: "POST",
    jsonBody: { title, body, due_at: dueAt, priority },
  });
  if (r.status >= 300) return { ok: false, error: `task_failed_${r.status}` };
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: "Task created." };
}

export async function sendMessageAction(formData: FormData): Promise<ActionResult> {
  const leadId = String(formData.get("lead_id") ?? "");
  const channel = String(formData.get("channel") ?? "");
  const templateSlug = String(formData.get("template_slug") ?? "");
  if (!leadId) return { ok: false, error: "lead_id_required" };
  if (channel !== "sms" && channel !== "email")
    return { ok: false, error: "invalid_channel" };
  if (!templateSlug) return { ok: false, error: "template_slug_required" };

  const r = await call(`/api/admin/leads/${leadId}/messages`, {
    method: "POST",
    jsonBody: { channel, template_slug: templateSlug },
  });
  if (r.status >= 300) {
    const body = r.body as { error?: string } | null;
    const errCode = body?.error ?? `send_failed_${r.status}`;
    return { ok: false, error: errCode };
  }
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: `Sent ${channel} (${templateSlug}).` };
}

export async function runListingMatchAction(formData: FormData): Promise<ActionResult> {
  const leadId = String(formData.get("lead_id") ?? "");
  if (!leadId) return { ok: false, error: "lead_id_required" };
  const r = await call(`/api/admin/leads/${leadId}/match-listings`, {
    method: "POST",
    jsonBody: {},
  });
  if (r.status >= 300) return { ok: false, error: `match_failed_${r.status}` };
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: "Listing match run complete." };
}

export async function runSellerOfferReviewAction(
  formData: FormData
): Promise<ActionResult> {
  const leadId = String(formData.get("lead_id") ?? "");
  if (!leadId) return { ok: false, error: "lead_id_required" };
  const r = await call(`/api/admin/leads/${leadId}/seller-offer-review`, {
    method: "POST",
    jsonBody: {},
  });
  if (r.status >= 300) return { ok: false, error: `seller_review_failed_${r.status}` };
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: "Seller-offer review generated." };
}

export async function markContactedAction(formData: FormData): Promise<ActionResult> {
  const leadId = String(formData.get("lead_id") ?? "");
  if (!leadId) return { ok: false, error: "lead_id_required" };
  const r = await call(`/api/admin/leads/${leadId}`, {
    method: "PATCH",
    jsonBody: { last_contacted_at: new Date().toISOString() },
  });
  if (r.status >= 300) return { ok: false, error: `mark_contacted_failed_${r.status}` };
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin");
  return { ok: true, message: "Marked as contacted." };
}

export async function setFollowUpAction(formData: FormData): Promise<ActionResult> {
  const leadId = String(formData.get("lead_id") ?? "");
  const followUpAt = String(formData.get("follow_up_at") ?? "").trim();
  if (!leadId) return { ok: false, error: "lead_id_required" };

  const r = await call(`/api/admin/leads/${leadId}`, {
    method: "PATCH",
    jsonBody: { next_follow_up_at: followUpAt || null },
  });
  if (r.status >= 300) return { ok: false, error: `follow_up_failed_${r.status}` };
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin");
  return { ok: true, message: followUpAt ? "Follow-up date set." : "Follow-up cleared." };
}
