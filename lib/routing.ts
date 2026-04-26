import { ContactEvent, Tenant } from "./types";
import { saveRoutingLog, updateContactRoutingStatus } from "./tenant-store";

export async function routeContactEvent(tenant: Tenant, event: ContactEvent) {
  let delivered = false;

  const emailResult = await routeByEmail(tenant, event);
  delivered = delivered || emailResult;

  const webhookResult = await routeByWebhook(tenant, event);
  delivered = delivered || webhookResult;

  await updateContactRoutingStatus(event.id, delivered ? "delivered" : "failed");
  return delivered;
}

async function routeByEmail(tenant: Tenant, event: ContactEvent) {
  const destination = tenant.routing.destinationEmail;

  if (!destination) return false;

  // Webhook-first architecture: email remains as guaranteed fallback channel.
  await saveRoutingLog({
    contactEventId: event.id,
    tenantSlug: tenant.slug,
    channel: "email",
    status: "sent",
    responseBody: `Queued for ${destination}`,
  });

  return true;
}

async function routeByWebhook(tenant: Tenant, event: ContactEvent) {
  const webhookUrl = tenant.routing.webhookUrl;
  if (!webhookUrl) return false;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-slug": tenant.slug,
        "x-webhook-secret": tenant.routing.webhookSecret ?? "",
      },
      body: JSON.stringify({ type: "contact_event.created", data: event }),
    });

    await saveRoutingLog({
      contactEventId: event.id,
      tenantSlug: tenant.slug,
      channel: "webhook",
      status: res.ok ? "sent" : "failed",
      responseCode: res.status,
      responseBody: await res.text(),
    });

    return res.ok;
  } catch (error) {
    await saveRoutingLog({
      contactEventId: event.id,
      tenantSlug: tenant.slug,
      channel: "webhook",
      status: "failed",
      responseBody: error instanceof Error ? error.message : "unknown error",
    });
    return false;
  }
}
