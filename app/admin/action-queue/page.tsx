import type { ReactNode } from "react";
import Link from "next/link";
import {
  loadAdminActionQueue,
  type AdminActionQueueItem,
} from "../../lib/adminAppointmentFollowupOps";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function shortDate(value: string | null) {
  if (!value) return "No due time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function Badge({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "ruby" | "cyan" }) {
  const styles = {
    gold: "border-[#cda24a33] bg-[#cda24a14] text-[#e2c06f]",
    ruby: "border-[#7f1d1d] bg-[#2a0909] text-[#ffd7d7]",
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${styles[tone]}`}>
      {children}
    </span>
  );
}

function priorityTone(priority: number): "gold" | "ruby" | "cyan" {
  if (priority <= 1) return "ruby";
  if (priority <= 3) return "gold";
  return "cyan";
}

function QueueCard({ item }: { item: AdminActionQueueItem }) {
  return (
    <article className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#e2c06f]">
            {item.type.replaceAll("_", " ")}
          </p>
          <Link href={`/admin/leads/${item.lead_id}`} className="mt-2 block font-serif text-2xl text-[#f4ead4] hover:text-[#e2c06f]">
            {item.lead_label}
          </Link>
          <p className="mt-2 text-sm leading-6 text-[#d9ceb8]">{item.recommended_action}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={priorityTone(item.priority)}>P{item.priority}</Badge>
          <Badge>{item.status}</Badge>
        </div>
      </div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Owner</dt>
          <dd className="mt-1 break-words text-[#f4ead4]">{item.owner}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Due / occurred</dt>
          <dd className="mt-1 text-[#f4ead4]">{shortDate(item.due_at)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Lead</dt>
          <dd className="mt-1 font-mono text-xs text-[#8f8778]">{item.lead_id}</dd>
        </div>
      </dl>
    </article>
  );
}

export default async function AdminActionQueuePage() {
  const queue = await loadAdminActionQueue();
  const urgent = queue.items.filter((item) => item.priority <= 2).length;

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-[#f4ead4]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 border-b border-[#cda24a33] pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e2c06f]">AdminOps</p>
              <h1 className="mt-3 font-serif text-4xl">Daily action queue</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#d9ceb8]">
                Overdue follow-ups, appointment requests, today&apos;s appointments, stalled leads, and retry review in one ordered queue.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Admin navigation">
              <Link href="/admin/leads" className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]">
                Lead inbox
              </Link>
              <Link href="/admin/reporting" className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]">
                Reporting
              </Link>
            </nav>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[#cda24a24] bg-[#0b0b0b] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8f8778]">Open actions</p>
            <p className="mt-3 font-serif text-3xl">{queue.items.length}</p>
          </div>
          <div className="rounded-lg border border-[#7f1d1d] bg-[#2a0909] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ffd7d7]">Urgent</p>
            <p className="mt-3 font-serif text-3xl">{urgent}</p>
          </div>
          <div className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200">Generated</p>
            <p className="mt-3 text-sm text-[#f4ead4]">{shortDate(queue.generatedAt)}</p>
          </div>
        </div>

        {queue.error ? (
          <section className="mt-5 rounded-lg border border-[#7f1d1d] bg-[#2a0909] p-5 text-sm text-[#ffd7d7]">
            {queue.error}
          </section>
        ) : null}

        <section className="mt-6 space-y-4" aria-label="Daily action queue items">
          {queue.items.length ? queue.items.map((item) => (
            <QueueCard key={item.id} item={item} />
          )) : (
            <div className="rounded-lg border border-[#cda24a33] bg-[#0d0d0d] p-6">
              <h2 className="font-serif text-3xl">No open actions</h2>
              <p className="mt-3 text-sm text-[#d9ceb8]">
                {queue.configured
                  ? "No overdue follow-ups, appointment requests, stalled leads, or retry-scheduled notifications were returned."
                  : "Supabase is not configured in this environment."}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
