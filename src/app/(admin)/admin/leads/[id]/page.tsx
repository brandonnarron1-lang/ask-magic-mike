export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";
import { loadLeadDetail } from "@/lib/admin/lead-detail";
import { AdminLeadActions } from "@/components/admin/admin-lead-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await loadLeadDetail(id);
  if (!detail) notFound();

  const lead = (detail.lead ?? {}) as Record<string, unknown>;
  const name = [lead.first_name, lead.last_name]
    .filter(Boolean)
    .join(" ") || "(unnamed)";

  return (
    <div className="min-h-screen bg-[#05070A] text-[#F4F4F4]">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10.5px] tracking-[0.18em] uppercase text-gold-300/85">
            Ask Magic Mike · cockpit
          </p>
          <h1 className="font-display text-[22px] font-semibold">{name}</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {String(lead.lead_type ?? "unknown")} · {String(lead.status ?? "new")} ·{" "}
            grade {String(lead.lead_grade ?? "—")}
          </p>
        </div>
        <Link
          href="/admin/leads"
          className="text-[12px] text-slate-300 hover:text-gold-300"
        >
          ← inbox
        </Link>
      </header>

      <main className="px-6 py-6 max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Cockpit actions (spans full width on small screens) */}
        <section className="md:col-span-3">
          <AdminLeadActions
            leadId={id}
            currentStatus={String(lead.status ?? "")}
            currentLeadType={String(lead.lead_type ?? "")}
            consentSms={!!lead.consent_sms}
            consentEmail={!!lead.consent_email}
            smsOptOut={detail.complianceFlags.some(
              (f) => (f as Record<string, unknown>).flag_type === "opt_out_sms"
            )}
            emailOptOut={detail.complianceFlags.some(
              (f) => (f as Record<string, unknown>).flag_type === "opt_out_email"
            )}
            smsEnabled={
              (process.env.NEXT_PUBLIC_ENABLE_SMS ?? "false").toLowerCase() === "true"
            }
            emailEnabled={
              (process.env.NEXT_PUBLIC_ENABLE_EMAIL ?? "false").toLowerCase() === "true"
            }
          />
        </section>

        {/* Left column: profile + attribution + listing matches */}
        <section className="md:col-span-2 space-y-5">
          {!detail.configured && (
            <div className="rounded-md border border-amber-400/30 bg-amber-400/[0.08] px-3 py-2 text-[12px] text-amber-200">
              Supabase not connected — showing empty detail.
            </div>
          )}

          <Card title="Profile">
            <Field label="Email" value={String(lead.email ?? "—")} />
            <Field label="Phone" value={String(lead.phone ?? "—")} />
            <Field label="Address" value={String(lead.address_raw ?? lead.address_line1 ?? "—")} />
            <Field label="City / State / Zip" value={`${lead.city ?? "—"}, ${lead.state ?? "—"} ${lead.zip ?? ""}`.trim()} />
            <Field label="Source" value={String(lead.source ?? "—")} />
            <Field label="Spam score" value={String(lead.spam_score ?? 0)} />
            <Field label="Created" value={new Date(String(lead.created_at)).toLocaleString()} />
          </Card>

          <Card title="Attribution">
            {detail.attribution ? (
              <>
                <Field label="utm_source" value={String(detail.attribution.utm_source ?? "—")} />
                <Field label="utm_medium" value={String(detail.attribution.utm_medium ?? "—")} />
                <Field label="utm_campaign" value={String(detail.attribution.utm_campaign ?? "—")} />
                <Field label="referrer" value={String(detail.attribution.referrer_url ?? "—")} />
                <Field label="landing page" value={String(detail.attribution.landing_page ?? "—")} />
              </>
            ) : (
              <p className="text-[12.5px] text-slate-400">No attribution row.</p>
            )}
          </Card>

          <Card title={`Listing matches (${detail.listingMatches.length})`}>
            {detail.listingMatches.length === 0 ? (
              <p className="text-[12.5px] text-slate-400">No matches yet.</p>
            ) : (
              <ul className="space-y-2">
                {detail.listingMatches.map((m: Record<string, unknown>) => (
                  <li key={String(m.id)} className="text-[12.5px] text-slate-200">
                    <span className="font-semibold">{String(m.listing_id)}</span> · score {String(m.match_score)}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* Right column: events, messages, tasks, compliance */}
        <section className="space-y-5">
          <Card title={`Events (${detail.events.length})`}>
            <ul className="space-y-1.5 text-[12px]">
              {detail.events.slice(0, 20).map((e: Record<string, unknown>) => (
                <li key={String(e.id)} className="text-slate-200">
                  <span className="font-semibold text-gold-300">
                    {String(e.event_name)}
                  </span>{" "}
                  <span className="text-slate-500">
                    {new Date(String(e.occurred_at)).toLocaleString()}
                  </span>
                </li>
              ))}
              {detail.events.length === 0 && (
                <li className="text-slate-400">No events yet.</li>
              )}
            </ul>
          </Card>

          <Card title={`Messages (${detail.messages.length})`}>
            <ul className="space-y-2 text-[12.5px]">
              {detail.messages.slice(0, 20).map((m: Record<string, unknown>) => (
                <li key={String(m.id)} className="text-slate-200">
                  <span className="text-[10.5px] tracking-[0.16em] uppercase text-slate-400 mr-2">
                    {String(m.role)}
                  </span>
                  {String(m.content)}
                </li>
              ))}
              {detail.messages.length === 0 && (
                <li className="text-slate-400">No messages yet.</li>
              )}
            </ul>
          </Card>

          <Card title={`Tasks (${detail.tasks.length})`}>
            <ul className="space-y-1.5 text-[12.5px]">
              {detail.tasks.slice(0, 20).map((t: Record<string, unknown>) => (
                <li key={String(t.id)} className="text-slate-200">
                  <span className="font-semibold">{String(t.title)}</span> ·{" "}
                  <span className="text-slate-400">{String(t.status)}</span>
                </li>
              ))}
              {detail.tasks.length === 0 && (
                <li className="text-slate-400">No tasks yet.</li>
              )}
            </ul>
          </Card>

          <Card title={`Compliance flags (${detail.complianceFlags.length})`}>
            <ul className="space-y-1.5 text-[12.5px]">
              {detail.complianceFlags.slice(0, 20).map((f: Record<string, unknown>) => (
                <li key={String(f.id)} className="text-slate-200">
                  <span className="font-semibold text-ruby-300">
                    {String(f.flag_type)}
                  </span>{" "}
                  <span className="text-slate-400">{String(f.severity)}</span>
                </li>
              ))}
              {detail.complianceFlags.length === 0 && (
                <li className="text-slate-400">Clean.</li>
              )}
            </ul>
          </Card>
        </section>
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.09] bg-white/[0.025] p-4">
      <p className="text-[10.5px] tracking-[0.18em] uppercase text-gold-300/85 mb-2">
        {title}
      </p>
      <div>{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[12.5px] mb-1">
      <span className="text-slate-400 mr-2">{label}:</span>
      <span className="text-[#F4F4F4]">{value}</span>
    </p>
  );
}
