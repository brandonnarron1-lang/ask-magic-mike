import { notFound } from "next/navigation";
import { requireLeadCenterPermission } from "../../../../../src/lib/admin/rbac-session";
import { allocationQuery,loadAllocationOffer } from "../../../../lib/leadAllocation";
import { ReferenceLeadCard } from "../../../../components/admin/ReferenceLeadCard";
import { OfferDecision } from "../../../../components/admin/OfferDecision";
export const dynamic="force-dynamic";
export default async function OfferPage({params}:{params:Promise<{id:string}>}) {
  const principal=await requireLeadCenterPermission("lead:view_assigned");const sql=allocationQuery();
  if(!principal||!sql)return <main className="min-h-screen bg-[#080A0B] p-8 text-[#F5EAD1]">Authenticated offer access is not configured. No action is available.</main>;
  const {id}=await params;let view;try{view=await loadAllocationOffer(sql,id,principal);}catch{return <main className="min-h-screen bg-[#080A0B] p-8 text-[#F5EAD1]">Offer state could not be read. No action is available.</main>;}
  if(!view)notFound();
  return <main className="min-h-screen bg-[#080A0B] px-4 py-8"><div className="mx-auto max-w-2xl"><ReferenceLeadCard view={view}/><OfferDecision id={id} version={view.offer!.version} active={view.offer?.state==="offered"&&process.env.LEAD_ALLOCATION_ENABLED==="true"}/></div></main>;
}
