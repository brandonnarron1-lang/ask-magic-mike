import type { ReactNode } from "react";
import Link from "next/link";
import {
  isNotificationRetryEligible,
  loadAdminLeadNotificationSummary,
} from "../../lib/adminLeadNotificationView";
import type { LeadNotificationRecord } from "../../lib/leadNotificationTypes";
import { retryLeadNotificationAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function shortDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#cda24a24] bg-[#0b0b0b] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8f8778]">{label}</p>
      <p className="mt-3 font-serif text-3xl text-[#f4ead4]">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[#cda24a33] bg-[#cda24a14] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#e2c06f]">
      {children}
    </span>
  );
}

function RetryControl({ notification }: { notification: LeadNotificationRecord }) {
  if (!isNotificationRetryEligible(notification)) return null;

  return (
    <form action={retryLeadNotificationAction} className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
      <input type="hidden" name="notification_id" value={notification.id} />
      <label className="flex items-start gap-2 text-[11px] leading-4 text-[#d9ceb8]">
        <input
          required
          type="checkbox"
          name="confirm"
          value="yes"
          className="mt-0.5"
          aria-label="Confirm retry for one notification"
        />
        <span>Retry this one notification only</span>
      </label>
      <button
        type="submit"
        className="mt-3 rounded-md border border-[#cda24a] bg-[#cda24a] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black"
      >
        Retry
      </button>
    </form>
  );
}

function NotificationCard({ notification }: { notification: LeadNotificationRecord }) {
  return (
    <article className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#e2c06f]">
            {notification.notification_type} / {notification.channel}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[#f4ead4]">{notification.status}</h2>
          <p className="mt-2 break-all text-xs text-[#8f8778]">Lead {notification.lead_id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{notification.provider || "no provider"}</Badge>
          <Badge>
            {notification.attempt_count}/{notification.max_attempts} attempts
          </Badge>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Recipient</dt>
          <dd className="mt-1 text-[#f4ead4]">{notification.recipient_type}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Template</dt>
          <dd className="mt-1 text-[#f4ead4]">{notification.template_version}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Sent</dt>
          <dd className="mt-1 text-[#f4ead4]">{shortDate(notification.sent_at)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Next retry</dt>
          <dd className="mt-1 text-[#f4ead4]">{shortDate(notification.next_attempt_at)}</dd>
        </div>
      </dl>

      {notification.error_code || notification.error_summary ? (
        <div className="mt-4 rounded-md border border-[#6e162680] bg-[#6e16261f] p-3 text-sm text-[#ffcabd]">
          <p className="font-semibold">{notification.error_code || "notification_error"}</p>
          <p className="mt-1">{notification.error_summary || "No safe failure summary recorded."}</p>
        </div>
      ) : null}

      <RetryControl notification={notification} />
    </article>
  );
}

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ notification_action?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const summary = await loadAdminLeadNotificationSummary();

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-[#f4ead4]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 border-b border-[#cda24a33] pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e2c06f]">AdminOps</p>
              <h1 className="mt-3 font-serif text-4xl">Lead notifications</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#d9ceb8]">
                Protected notification outbox status for assignment notifications, provider attempts, failures, and safe one-record retries.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Admin navigation">
              <Link href="/admin/leads" className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]">
                Lead inbox
              </Link>
              <Link href="/admin/allocation" className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]">
                Agent allocation
              </Link>
            </nav>
          </div>
          {params.notification_action ? (
            <p className="mt-4 rounded-md border border-[#cda24a33] bg-[#cda24a14] p-3 text-sm text-[#f4ead4]">
              Notification action result: {params.notification_action.replaceAll("_", " ")}
            </p>
          ) : null}
        </header>

        {!summary.configured || summary.error ? (
          <section className="mb-6 rounded-lg border border-[#cda24a33] bg-[#0d0d0d] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">Notification status</p>
            <h2 className="mt-3 font-serif text-3xl text-[#f4ead4]">
              {summary.configured ? "Notification data unavailable" : "Notification store not configured"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d9ceb8]">
              {summary.error || "The protected notification surface renders empty until the lead_notifications table and service role configuration are available."}
            </p>
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Total" value={summary.kpis.total} />
          <MetricCard label="Pending" value={summary.kpis.pending} />
          <MetricCard label="Sent" value={summary.kpis.sent} />
          <MetricCard label="Failed" value={summary.kpis.failed} />
          <MetricCard label="Skipped" value={summary.kpis.skipped} />
          <MetricCard label="Retry" value={summary.kpis.retryScheduled} />
        </div>

        <section className="mt-8 grid gap-4">
          {summary.notifications.length ? (
            summary.notifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          ) : (
            <p className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5 text-sm text-[#8f8778]">
              No lead notification records returned.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
