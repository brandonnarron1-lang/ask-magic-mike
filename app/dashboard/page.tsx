import { Card } from "@/components/ui/card";
import { getBillingSnapshot } from "@/lib/billing";
import {
  getTenantBySlug,
  listAIRunsByTenant,
  listContactEventsByTenant,
  listConversationsByTenant,
  listRoutingLogsByTenant,
} from "@/lib/tenant-store";

export default async function DashboardPage() {
  const tenantSlug = "ask-magic-mike";
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return <main className="p-6">Tenant not found.</main>;

  const [conversations, events, routingLogs, aiRuns, billing] = await Promise.all([
    listConversationsByTenant(tenantSlug),
    listContactEventsByTenant(tenantSlug),
    listRoutingLogsByTenant(tenantSlug),
    listAIRunsByTenant(tenantSlug),
    getBillingSnapshot(tenantSlug),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-6">
      <h1 className="text-3xl font-bold">Tenant Dashboard · {tenant.companyName}</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Metric label="Conversations" value={String(conversations.length)} />
        <Metric label="Contact events" value={String(events.length)} />
        <Metric label="Routing logs" value={String(routingLogs.length)} />
        <Metric label="AI runs" value={String(aiRuns.length)} />
      </div>

      <Card className="mt-6 p-4">
        <h2 className="font-semibold">Billing + usage metering</h2>
        <p className="text-sm text-slate-600">{billing.setupFee} · {billing.subscription} · {billing.usageRate}</p>
        <p className="mt-2 text-sm text-slate-600">{billing.usage.basis}</p>
      </Card>

      <Card className="mt-6 p-4">
        <h2 className="font-semibold">Recent contact events</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {events.slice(0, 5).map((event) => (
            <li key={event.id} className="rounded border p-2">{event.name} · {event.generalIntent} · {event.routingStatus}</li>
          ))}
          {events.length === 0 ? <li className="text-slate-500">No events yet.</li> : null}
        </ul>
      </Card>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </Card>
  );
}
