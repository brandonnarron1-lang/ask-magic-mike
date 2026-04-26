import { NextResponse } from "next/server";
import { getTenantBySlug, saveContactEvent } from "@/lib/tenant-store";
import { routeContactEvent } from "@/lib/routing";

type Payload = {
  tenantSlug: string;
  name: string;
  email: string;
  phone?: string;
  generalIntent: string;
  marketArea: string;
  message: string;
  consentAt: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as Payload;

  if (!payload.tenantSlug || !payload.name || !payload.email || !payload.generalIntent || !payload.marketArea || !payload.message || !payload.consentAt) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const tenant = await getTenantBySlug(payload.tenantSlug);
  if (!tenant) return NextResponse.json({ error: "Tenant not found." }, { status: 404 });

  const event = await saveContactEvent(payload);
  await routeContactEvent(tenant, event);

  return NextResponse.json({
    message: "Inquiry received. A licensed broker will follow up for transaction-specific support.",
    eventId: event.id,
  });
}
