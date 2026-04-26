import { NextResponse } from "next/server";
import { getTenantBySlug, upsertTenant } from "@/lib/tenant-store";

export async function GET(_: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ tenant });
}

export async function POST(request: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const body = await request.json();

  const tenant = await upsertTenant({
    id: `tnt_${tenantSlug}`,
    slug: tenantSlug,
    status: "trial",
    companyName: body.companyName,
    marketAreas: body.marketAreas,
    promptInstructions:
      "You are a broker-branded educational assistant. Do not provide transaction-specific advice or legal guidance.",
    brand: {
      primaryColor: body.primaryColor,
      accentColor: body.accentColor,
      assistantName: body.assistantName,
      brokerName: body.brokerName,
      brokerLicense: body.brokerLicense,
      disclaimer: body.disclaimer,
      buyerAgreementUrl: body.buyerAgreementUrl,
    },
    routing: {
      destinationEmail: body.destinationEmail,
      webhookUrl: body.webhookUrl,
    },
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ tenant });
}
