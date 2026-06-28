export const dynamic = "force-dynamic";
export const revalidate = 0;

import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { loadLeadDetail } from "@/lib/admin/lead-detail";
import { AdminLeadActions } from "@/components/admin/admin-lead-actions";
import { buildNextBestAction } from "@/lib/admin/next-best-action";
import { AdminShell } from "@/components/admin/admin-shell";

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

  const rawTemperature = String(lead.temperature ?? "");
  const tempBadgeClass =
    rawTemperature === "urgent"  ? "bg-ruby-400/[0.14] text-ruby-300 border-ruby-400/30" :
    rawTemperature === "hot"     ? "bg-gold-400/20 text-gold-300 border-gold-400/30" :
    rawTemperature === "warm"    ? "bg-amber-500/10 text-amber-300 border-amber-500/30" :
    rawTemperature === "nurture" ? "bg-blue-500/10 text-blue-300 border-blue-500/20" :
    rawTemperature === "low"     ? "bg-slate-600/30 text-slate-400 border-slate-600/30" :
    null;

  const nba = buildNextBestAction({
    leadType:    String(lead.lead_type ?? ""),
    status:      String(lead.status ?? ""),
    temperature: String(lead.temperature ?? ""),
    score:       typeof lead.score === "number" ? lead.score : null,
    source:      String(lead.source ?? ""),
    utmMedium:   detail.attribution ? String(detail.attribution.utm_medium ?? "") : null,
    utmCampaign: detail.attribution ? String(detail.attribution.utm_campaign ?? "") : null,
    firstName:   lead.first_name ? String(lead.first_name) : null,
    hasEmail:    !!lead.email,
    hasPhone:    !!lead.phone,
    hasAddress:  !!(lead.address_raw ?? lead.address_line1),
    email:       lead.email ? String(lead.email) : null,
    phone:       lead.phone ? String(lead.phone) : null,
    addressRaw:  lead.address_raw ? String(lead.address_raw) : null,
    consentSms:  !!lead.consent_sms,
    consentEmail: !!lead.consent_email,
    isSynthetic: false,
  });

  return (
    <AdminShell
      title={name}
      eyebrow={`${String(lead.lead_type ?? "unknown")} · grade ${String(lead.lead_grade ?? "—")}`}
      backHref="/admin/leads"
      backLabel="← inbox"
    >
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
            <div className="rounded-md border border-amber-400/30 bg-amber-400/[0.08] px-3 py-2 text-sm text-amber-200">
              Supabase not connected — showing empty detail.
            </div>
          )}

          {/* Next Best Action card */}
          <div
            data-testid="next-best-action-card"
            className={`rounded-xl border p-4 ${
              nba.isSynthetic
                ? "border-ruby-400/30 bg-ruby-400/[0.04]"
                : nba.doNotContact
                ? "border-amber-400/30 bg-amber-400/[0.04]"
                : "border-white/[0.09] bg-white/[0.025]"
            }`}
          >
            <p className="text-[10.5px] tracking-label uppercase text-gold-300/85 mb-3">
              Conversation Summary · Next Best Action
            </p>

            {nba.isSynthetic && (
              <div
                data-testid="nba-synthetic-warning"
                className="mb-3 flex items-center gap-2 rounded-lg border border-ruby-400/30 bg-ruby-400/[0.08] px-3 py-2 text-sm text-ruby-300 font-semibold"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Synthetic / test lead — do not contact.
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mb-3">
              <Field label="Source path"   value={nba.sourcePath} />
              <Field label="Score"         value={nba.scoreLabel} />
              <div className="text-sm mb-1">
                <span className="text-slate-400 mr-2">Temperature:</span>
                {tempBadgeClass ? (
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tempBadgeClass}`}>
                    {nba.temperatureLabel}
                  </span>
                ) : (
                  <span className="text-cream">{nba.temperatureLabel}</span>
                )}
              </div>
              <Field label="Intent"        value={nba.intentSummary} />
            </div>

            {nba.missingInfo.length > 0 && (
              <div className="mb-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-label text-amber-400/80 mb-1">
                  Missing info
                </p>
                <ul className="flex flex-wrap gap-2">
                  {nba.missingInfo.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-amber-400/25 bg-amber-400/[0.06] px-2.5 py-0.5 text-[11px] text-amber-300"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-label text-slate-400 mb-1">
                Suggested follow-up angle
              </p>
              <p
                data-testid="nba-follow-up-angle"
                className={`text-sm leading-relaxed ${
                  nba.isSynthetic || nba.doNotContact
                    ? "text-ruby-300"
                    : "text-cream"
                }`}
              >
                {nba.followUpAngle}
              </p>
            </div>

            <p className="mt-3 text-[10px] text-slate-600">
              Read-only. No outbound messaging is sent from this page.
            </p>
          </div>

          <Card title="Profile">
            <Field label="Email" value={String(lead.email ?? "—")} />
            <Field label="Phone" value={String(lead.phone ?? "—")} />
            <Field label="Address" value={String(lead.address_raw ?? lead.address_line1 ?? "—")} />
            <Field label="City / State / Zip" value={`${lead.city ?? "—"}, ${lead.state ?? "—"} ${lead.zip ?? ""}`.trim()} />
            <Field label="Source" value={String(lead.source ?? "—")} />
            <Field label="Spam score" value={String(lead.spam_score ?? 0)} />
            <Field label="Created" value={new Date(String(lead.created_at)).toLocaleString()} />
            <Field
              label="Last Contacted"
              value={lead.last_contacted_at ? new Date(String(lead.last_contacted_at)).toLocaleString() : "Never"}
            />
            <Field
              label="Next Follow-up"
              value={lead.next_follow_up_at ? new Date(String(lead.next_follow_up_at)).toLocaleString() : "Not set"}
            />
          </Card>

          <Card title="Attribution">
            {detail.attribution ? (
              <>
                <Field label="Referrer Type"  value={String(detail.attribution.referrer_type ?? "—")} />
                <Field label="Paid Traffic"   value={detail.attribution.is_paid ? "yes" : "no"} />
                <Field label="UTM Source"     value={String(detail.attribution.utm_source ?? "—")} />
                <Field label="UTM Medium"     value={String(detail.attribution.utm_medium ?? "—")} />
                <Field label="UTM Campaign"   value={String(detail.attribution.utm_campaign ?? "—")} />
                <Field label="Referring URL"  value={String(detail.attribution.referrer_url ?? "—")} />
                <Field label="Landing Page"   value={String(detail.attribution.landing_page ?? "—")} />
              </>
            ) : (
              <p className="text-sm text-slate-400">No attribution row.</p>
            )}
          </Card>

          <Card title={`Listing matches (${detail.listingMatches.length})`}>
            {detail.listingMatches.length === 0 ? (
              <p className="text-sm text-slate-400">No matches yet.</p>
            ) : (
              <ul className="space-y-2">
                {detail.listingMatches.map((m: Record<string, unknown>) => (
                  <li key={String(m.id)} className="text-sm text-slate-200">
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
            <ul className="space-y-1.5 text-sm">
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
            <ul className="space-y-2 text-sm">
              {detail.messages.slice(0, 20).map((m: Record<string, unknown>) => (
                <li key={String(m.id)} className="text-slate-200">
                  <span className="text-[10.5px] tracking-label uppercase text-slate-400 mr-2">
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
            <ul className="space-y-1.5 text-sm">
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
            <ul className="space-y-1.5 text-sm">
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
    </AdminShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.09] bg-white/[0.025] p-4">
      <p className="text-[10.5px] tracking-label uppercase text-gold-300/85 mb-2">
        {title}
      </p>
      <div>{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm mb-1">
      <span className="text-slate-400 mr-2">{label}:</span>
      <span className="text-cream">{value}</span>
    </p>
  );
}
