import type { ReactNode } from "react";
import Link from "next/link";
import { isPreviewDataDisabled } from "../../src/lib/preview-security";
import { requireLeadCenterAuthenticated } from "../../src/lib/admin/rbac-session";
import { hasLeadCenterPermission, type LeadCenterPermission } from "../../src/lib/admin/rbac-policy";

// Identity may be configured after build. Redirect aliases also inherit this
// authenticated layout: never prerender/prefetch it as a static, shared shell.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRIMARY_NAVIGATION: Array<[string, string, LeadCenterPermission]> = [
  ["Today", "/admin/today", "lead:view_assigned"],
  ["Leads", "/admin/leads", "lead:view_assigned"],
  ["Activity", "/admin/activity", "lead:view_assigned"],
  ["Reports", "/admin/reporting", "report:view"],
];

const REVIVAL_NAVIGATION = ["Revival", "/admin/revival"] as const;

const ADMIN_NAVIGATION: Array<[string, string, LeadCenterPermission]> = [
  ["Allocation", "/admin/allocation", "lead:assign"],
  ["Growth", "/admin/growth", "growth:manage"],
  [...REVIVAL_NAVIGATION, "growth:manage"],
  ["Owned demand", "/admin/distribution", "growth:manage"],
  ["Experiments", "/admin/experiments", "growth:manage"],
  ["Notifications", "/admin/notifications", "notification:manage"],
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const principal = await requireLeadCenterAuthenticated();
  const previewReadOnly = isPreviewDataDisabled();
  const can = (permission: LeadCenterPermission) => !principal || hasLeadCenterPermission(principal.role, permission);

  return (
    <>
      {previewReadOnly ? (
        <div className="border-b border-amber-300/30 bg-black px-4 py-3 text-sm text-amber-100">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <strong className="font-semibold text-amber-200">Preview read-only mode</strong>
            <span className="text-amber-100/85">
              Database mutations, notification processing, and provider delivery are disabled for this Preview.
            </span>
          </div>
        </div>
      ) : null}
      <div className="border-b border-white/10 bg-[#050505] px-4 py-3 text-[#d9ceb8]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <Link href="/admin/today" className="text-xs font-bold uppercase tracking-[0.19em] text-[#e2c06f]">
            Ask Magic Mike · Lead Center
            <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-[#d9ceb8]">Our Town Properties, Inc.</span>
          </Link>
          <nav className="flex flex-wrap gap-1.5" aria-label="Command Center navigation">
            {PRIMARY_NAVIGATION.filter(([, , permission]) => can(permission)).map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[#b9ae9d] transition hover:border-[#cda24a66] hover:text-[#f0cf79]"
              >
                {label}
              </Link>
            ))}
            {ADMIN_NAVIGATION.some(([, , permission]) => can(permission)) ? <details className="min-w-0">
              <summary className="cursor-pointer rounded-full border border-[#cda24a24] px-3 py-1.5 text-xs text-[#e2c06f] focus-visible:outline-2 focus-visible:outline-cyan-300">More tools</summary>
              <div className="mt-2 flex max-w-md flex-wrap gap-2">
            {ADMIN_NAVIGATION.filter(([, , permission]) => can(permission)).map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-[#cda24a24] bg-[#cda24a08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[#a99b82] transition hover:border-[#cda24a66] hover:text-[#f0cf79]"
              >
                {label}
              </Link>
            ))}</div></details> : null}
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
