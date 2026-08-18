import type { ReactNode } from "react";
import Link from "next/link";
import { isPreviewDataDisabled } from "../../src/lib/preview-security";
import { requireLeadCenterAuthenticated } from "../../src/lib/admin/rbac-session";

const ADMIN_NAVIGATION = [
  ["Leads", "/admin/leads"],
  ["Action queue", "/admin/action-queue"],
  ["Allocation", "/admin/allocation"],
  ["Reporting", "/admin/reporting"],
  ["Growth", "/admin/growth"],
  ["Notifications", "/admin/notifications"],
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireLeadCenterAuthenticated();
  const previewReadOnly = isPreviewDataDisabled();

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
          <Link href="/admin/leads" className="text-xs font-bold uppercase tracking-[0.19em] text-[#e2c06f]">
            Ask Magic Mike · Lead Center
          </Link>
          <nav className="flex flex-wrap gap-1.5" aria-label="Lead Center command navigation">
            {ADMIN_NAVIGATION.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[#b9ae9d] transition hover:border-[#cda24a66] hover:text-[#f0cf79]"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
