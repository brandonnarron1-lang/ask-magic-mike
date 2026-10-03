import Link from "next/link";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import {
  ADMIN_ACTIVITY_SOURCES,
  loadAdminActivity,
  parseAdminActivitySource,
  type AdminActivitySource,
} from "../../lib/adminActivityView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOURCE_LABELS: Record<AdminActivitySource, string> = {
  audit: "Audit",
  communication: "Communication",
  notification: "Notification",
  outcome: "Outcome",
  ai_review: "AI review",
};

function parseOffset(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 5_000) : 0;
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(date);
}

function pageUrl(offset: number, source: AdminActivitySource | null) {
  const params = new URLSearchParams();
  if (offset > 0) params.set("offset", String(offset));
  if (source) params.set("source", source);
  const query = params.toString();
  return `/admin/activity${query ? `?${query}` : ""}`;
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams?: Promise<{ offset?: string; source?: string }>;
}) {
  const principal = await requireLeadCenterPermission("lead:view_assigned");
  const params = searchParams ? await searchParams : {};
  const offset = parseOffset(params.offset);
  const source = parseAdminActivitySource(params.source);
  const result = await loadAdminActivity({ principal, offset, limit: 40, source });

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-[#f4ead4]">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-[#cda24a33] pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e2c06f]">Command Center</p>
          <h1 className="mt-3 font-serif text-4xl">Authorized activity</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b9ae9d]">
            A stable, server-scoped operating history. Open a lead workspace for its complete timeline and immutable evidence snapshots.
          </p>
          <nav className="mt-5 flex flex-wrap gap-2" aria-label="Activity source filters">
            <Link href="/admin/activity" className="rounded-full border border-[#cda24a44] px-3 py-2 text-xs text-[#f0cf79]">All sources</Link>
            {ADMIN_ACTIVITY_SOURCES.map((item) => (
              <Link key={item} href={pageUrl(0, item)} className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#b9ae9d]">
                {SOURCE_LABELS[item]}
              </Link>
            ))}
          </nav>
        </header>

        {result.incompleteSources.length ? (
          <div role="status" className="mt-5 rounded-lg border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-sm text-amber-100">
            Partial history: {result.incompleteSources.map((item) => SOURCE_LABELS[item]).join(", ")} unavailable. Available sources remain visible.
          </div>
        ) : null}

        <section className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]" aria-label="Activity history">
          {result.events.length ? result.events.map((event) => (
            <article key={event.id} className="grid gap-3 border-b border-white/10 px-5 py-4 last:border-b-0 md:grid-cols-[11rem_minmax(0,1fr)_auto]">
              <div>
                <p className="text-xs text-[#8f8778]">{formatTime(event.occurredAt)}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#cda24a]">{SOURCE_LABELS[event.source]}</p>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[#f4ead4]">{event.summary}</p>
                <p className="mt-1 truncate text-sm text-[#b9ae9d]">{event.leadLabel} · {event.actor}</p>
                {event.detail ? <p className="mt-1 text-xs text-[#8f8778]">{event.detail}</p> : null}
                <p className="mt-2 font-mono text-[10px] text-[#716b61]">{event.reference}</p>
              </div>
              <Link href={`/admin/leads/${event.leadId}#activity`} className="self-center rounded-md border border-[#cda24a44] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#f0cf79]">
                Open lead
              </Link>
            </article>
          )) : (
            <p className="px-5 py-12 text-center text-sm text-[#8f8778]">{result.error || "No authorized activity in this view."}</p>
          )}
        </section>

        <nav className="mt-5 flex items-center justify-between" aria-label="Activity pagination">
          {offset > 0 ? <Link href={pageUrl(Math.max(0, offset - result.limit), source)} className="text-sm text-[#f0cf79]">Newer activity</Link> : <span />}
          {result.hasMore ? <Link href={pageUrl(offset + result.limit, source)} className="text-sm text-[#f0cf79]">Older activity</Link> : <span />}
        </nav>
      </div>
    </main>
  );
}
