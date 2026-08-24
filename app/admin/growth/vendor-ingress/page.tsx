import Link from "next/link";
import { requireLeadCenterPermission } from "../../../../src/lib/admin/rbac-session";
import { listVendorIngressContractSummaries } from "../../../lib/growth/vendor-ingress-contracts";
import { VendorIngressContractLab } from "./vendor-ingress-lab";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VendorIngressContractLabPage() {
  await requireLeadCenterPermission("growth:manage");
  const contracts = listVendorIngressContractSummaries();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_75%_0%,rgba(145,19,50,.17),transparent_34%),radial-gradient(circle_at_15%_15%,rgba(205,162,74,.11),transparent_30%),#040404] px-4 py-7 text-[#f4ead4] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-[#cda24a33] bg-[linear-gradient(135deg,rgba(18,18,18,.96),rgba(5,5,5,.98))] p-5 shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#d1aa53]">
            Ask Magic Mike · Growth Intelligence
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-4xl">
              <h1 className="font-serif text-4xl leading-tight text-[#f4ead4] sm:text-6xl">
                Vendor ingress contract lab
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#c9bdab] sm:text-base">
                Exercise the existing vendor-neutral lead contract against fixed, unmistakably synthetic portal,
                CRM, Meta, and Google profiles. The lab verifies security and field-shape assumptions without
                retaining raw payloads, calling a provider, writing Neon, or creating a lead.
              </p>
            </div>
            <Link
              href="/admin/growth"
              className="rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-bold uppercase tracking-[0.11em] text-[#d9ceb8] transition hover:border-[#cda24a66] hover:text-[#f0cf79]"
            >
              Back to Growth
            </Link>
          </div>
          <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
            {[
              ["Authority", "Administrator or primary lead owner"],
              ["Data", "Built-in synthetic fixtures only"],
              ["Actions", "Zero writes · zero provider calls"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/[.08] bg-black/30 p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#746d62]">{label}</p>
                <p className="mt-2 text-sm text-[#d8c9aa]">{value}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="mt-5 rounded-xl border border-[#4baab866] bg-[#06171b] px-5 py-4 text-sm leading-6 text-[#d9f5f8]">
          <strong className="text-[#7ee7f1]">Contract evidence, not provider activation.</strong>{" "}
          Every run is synthetic and no-send. Zillow remains contract-gated; Follow Up Boss and Meta require a
          verified follow-up fetch; Google can be structurally normalized but channel consent remains review-only.
        </div>

        <div className="mt-5">
          <VendorIngressContractLab contracts={contracts} />
        </div>
      </div>
    </main>
  );
}
