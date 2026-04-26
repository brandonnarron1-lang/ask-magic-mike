import { notFound } from "next/navigation";
import { TenantAssistant } from "@/components/tenant/tenant-assistant";
import { getTenantBySlug } from "@/lib/tenant-store";

export default async function TenantPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-6">
      <h1 className="text-3xl font-bold">{tenant.companyName}</h1>
      <p className="mt-2 text-slate-600">Powered by Ask B-Nelly multi-tenant SaaS.</p>
      <div className="mt-6">
        <TenantAssistant
          tenantSlug={tenant.slug}
          assistantName={tenant.brand.assistantName}
          brokerName={tenant.brand.brokerName}
          marketAreas={tenant.marketAreas}
          primaryColor={tenant.brand.primaryColor}
          accentColor={tenant.brand.accentColor}
          disclaimer={tenant.brand.disclaimer}
        />
      </div>
    </main>
  );
}
