import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl p-6">
      <h1 className="text-4xl font-bold">Ask B-Nelly</h1>
      <p className="mt-3 max-w-3xl text-slate-600">
        A multi-tenant SaaS for broker-branded education assistants, compliant lead intake, and webhook-first routing.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Tenant Experience</h2>
          <p className="mt-2 text-sm text-slate-600">Every tenant is powered by one codebase and tenant config only.</p>
          <Link href="/ask-magic-mike" className="mt-3 inline-block text-sm font-semibold text-blue-700">Open Ask Magic Mike tenant →</Link>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Operations</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
            <li><Link href="/onboarding" className="text-blue-700">Onboarding wizard</Link></li>
            <li><Link href="/dashboard" className="text-blue-700">Tenant dashboard</Link></li>
            <li><Link href="/admin" className="text-blue-700">B-Nelly admin dashboard</Link></li>
          </ul>
        </Card>
      </div>
    </main>
  );
}
