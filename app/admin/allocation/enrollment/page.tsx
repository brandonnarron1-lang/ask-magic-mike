import { requireLeadCenterPermission } from "../../../../src/lib/admin/rbac-session";
import { StaffAllocationEnrollment } from "../../../components/admin/StaffAllocationEnrollment";
import Link from "next/link";
export const dynamic="force-dynamic";
export default async function StaffEnrollmentPage() {
 const principal=await requireLeadCenterPermission("lead:view_assigned");
 return <main className="min-h-screen bg-[#080A0B] px-4 py-8 text-[#F5EAD1]"><div className="mx-auto max-w-3xl"><Link href="/admin/leads" className="inline-block min-h-11 py-3 text-sm text-[#D9AF52]">Lead Center</Link><h1 className="my-5 font-serif text-3xl">Staff allocation preferences</h1><StaffAllocationEnrollment administrator={principal?.role==="administrator"}/></div></main>;
}
