import Link from "next/link";
import { Card } from "@/components/ui/card";
import { listTenants } from "@/lib/tenant-store";

export default async function AdminPage() {
  const tenants = await listTenants();

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-6">
      <h1 className="text-3xl font-bold">Ask B-Nelly Admin</h1>
      <p className="mt-2 text-slate-600">Manage tenant configuration and account lifecycle for Brandon/B-Nelly.</p>
      <div className="mt-6 space-y-4">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="p-4">
            <h2 className="font-semibold">{tenant.companyName}</h2>
            <p className="text-sm text-slate-600">/{tenant.slug} · {tenant.status}</p>
            <p className="text-sm text-slate-600">Routing: {tenant.routing.destinationEmail}</p>
            <Link className="text-sm text-blue-700" href={`/${tenant.slug}`}>Open tenant page →</Link>
          </Card>
        ))}
      </div>
    </main>
  );
}
