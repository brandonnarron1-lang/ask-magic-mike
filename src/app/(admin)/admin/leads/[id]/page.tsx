export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { loadLeadDetail } from "@/lib/admin/lead-detail";
import { AdminLeadActions } from "@/components/admin/admin-lead-actions";
import { buildNextBestAction } from "@/lib/admin/next-best-action";
import { AdminShell } from "@/components/admin/admin-shell";
import { buildLeadIntelligence } from "@/lib/leads/lead-intelligence";
import { buildConversionPrediction } from "@/lib/leads/conversion-prediction";
import { buildFollowUpCalendar } from "@/lib/leads/followup-calendar";

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

  const leadInput = {
    leadType:    String(lead.lead_type ?? ""),
    status:      String(lead.status ?? ""),
    temperature: String(lead.temperature ?? ""),
    score:       typeof lead.score === "number" ? lead.score : (typeof lead.composite_score === "number" ? lead.composite_score : null),
    grade:       String(lead.lead_grade ?? ""),
    source:      String(lead.source ?? ""),
    utmSource:   detail.attribution ? String(detail.attribution.utm_source ?? "") : null,
    utmMedium:   detail.attribution ? String(detail.attribution.utm_medium ?? "") : null,
    utmCampaign: detail.attribution ? String(detail.attribution.utm_campaign ?? "") : null,
    referrerType: detail.attribution ? String(detail.attribution.referrer_type ?? "") : null,
    firstName:   lead.first_name ? String(lead.first_name) : null,
    hasEmail:    !!lead.email,
    hasPhone:    !!lead.phone,
    hasAddress:  !!(lead.address_raw ?? lead.address_line1),
    email:       lead.email ? String(lead.email) : null,
    phone:       lead.phone ? String(lead.phone) : null,
    addressRaw:  lead.address_raw ? String(lead.address_raw) : null,
    consentSms:  !!lead.consent_sms,
    consentEmail: !!lead.consent_email,
    consentCall: !!lead.consent_call,
    isSynthetic: false,
    questionRaw: lead.question_raw ? String(lead.question_raw) : null,
    createdAt:   lead.created_at ? String(lead.created_at) : null,
    lastContactedAt: lead.last_contacted_at ? String(lead.last_contacted_at) : null,
    assignedAgentId: lead.assigned_agent_id ? String(lead.assigned_agent_id) : null,
    spamScore:   typeof lead.spam_score === "number" ? lead.spam_score : null,
  };

  const nba       = buildNextBestAction(leadInput);
  const intel     = buildLeadIntelligence(leadInput);
  const convPred  = buildConversionPrediction(leadInput);
  const followUp  = buildFollowUpCalendar(leadInput);

  return (
    <AdminShell
      title={name}
      eyebrow={`${String(lead.lead_type ?? "unknown")} · grade ${String(lead.lead_grade ?? "—")}`}
      backHref="/admin/leads"
      backLabel="← inbox"
    >
      <main className="px-6 py-6 max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
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
            className={`relative overflow-hidden rounded-xl border backdrop-blur-sm p-5 ${
              nba.isSynthetic
                ? "border-ruby-400/25 bg-[#0D0606]/80"
                : nba.doNotContact
                ? "border-amber-400/25 bg-[#0C0A06]/80"
                : "border-white/[0.08] bg-[#0D0D0D]/60"
            }`}
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-400/35 to-transparent" />
            <p className="text-[9.5px] tracking-label uppercase font-bold text-gold-300/75 mb-4">
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

            {!nba.isSynthetic && (
              <div className="mt-4 grid sm:grid-cols-3 gap-3 border-t border-white/[0.07] pt-3">
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
                  <p className="text-[9.5px] tracking-label uppercase text-slate-500 mb-0.5">Why it matters</p>
                  <p className="text-xs text-slate-200 leading-relaxed">{nba.whyItMatters}</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
                  <p className="text-[9.5px] tracking-label uppercase text-slate-500 mb-0.5">Why now</p>
                  <p className="text-xs text-slate-200 leading-relaxed">{nba.whyNow}</p>
                </div>
                <div className="rounded-lg bg-ruby-400/[0.06] border border-ruby-400/20 p-2.5">
                  <p className="text-[9.5px] tracking-label uppercase text-ruby-400/70 mb-0.5">Risk if ignored</p>
                  <p className="text-xs text-ruby-200 leading-relaxed">{nba.riskIfIgnored}</p>
                </div>
              </div>
            )}

            {!nba.isSynthetic && (nba.suggestedSms || nba.phoneOpener) && (
              <div className="mt-3 space-y-2 border-t border-white/[0.07] pt-3">
                {nba.phoneOpener && (
                  <div>
                    <p className="text-[9.5px] tracking-label uppercase text-emerald-400/70 mb-1">Phone opener</p>
                    <p className="text-xs text-emerald-200 font-mono leading-relaxed bg-emerald-500/[0.06] border border-emerald-500/20 rounded-lg px-3 py-2">{nba.phoneOpener}</p>
                  </div>
                )}
                {nba.suggestedSms && (
                  <div>
                    <p className="text-[9.5px] tracking-label uppercase text-blue-400/70 mb-1">SMS template</p>
                    <p className="text-xs text-blue-100 leading-relaxed bg-blue-500/[0.06] border border-blue-500/20 rounded-lg px-3 py-2">{nba.suggestedSms}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center gap-4 border-t border-white/[0.07] pt-3">
              <div>
                <p className="text-[9.5px] tracking-label uppercase text-slate-500">Appointment CTA</p>
                <p className="text-xs text-gold-300 mt-0.5">{nba.appointmentCTA}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[9.5px] tracking-label uppercase text-slate-500">Success probability</p>
                <p className="text-lg font-bold text-cream font-bebas leading-none mt-0.5">{nba.successProbabilityLabel}</p>
              </div>
            </div>

            <p className="mt-3 text-[10px] text-slate-600">
              Read-only. No outbound messaging is sent from this page.
            </p>
          </div>

          {/* Conversion Prediction panel */}
          <div className={`relative overflow-hidden rounded-xl border backdrop-blur-sm p-5 ${convPred.colorClass}`}>
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-400/30 to-transparent" />
            <div className="flex items-start justify-between mb-3">
              <p className="text-[9.5px] tracking-label uppercase font-bold text-gold-300/75">
                Conversion Prediction
              </p>
              <div className="text-right">
                <span className="font-bebas text-5xl leading-none text-cream">{convPred.score}</span>
                <span className="text-sm text-slate-500 ml-0.5">/100</span>
              </div>
            </div>
            <div className="mb-3 h-1.5 w-full rounded-full bg-white/[0.07] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  convPred.score >= 70 ? "bg-emerald-400" : convPred.score >= 40 ? "bg-gold-400" : "bg-ruby-400"
                }`}
                style={{ width: `${convPred.score}%` }}
              />
            </div>
            <p className="text-xs text-slate-300 mb-3">{convPred.primaryReason}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {convPred.positiveSignals.length > 0 && (
                <div>
                  <p className="text-[9.5px] tracking-label uppercase text-emerald-400/70 mb-1.5">Positive signals</p>
                  <ul className="space-y-1">
                    {convPred.positiveSignals.map((s) => (
                      <li key={s} className="text-[11px] text-emerald-200 flex gap-1.5 items-start">
                        <span className="mt-0.5 text-emerald-400">+</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {convPred.negativeSignals.length > 0 && (
                <div>
                  <p className="text-[9.5px] tracking-label uppercase text-ruby-400/70 mb-1.5">Negative signals</p>
                  <ul className="space-y-1">
                    {convPred.negativeSignals.map((s) => (
                      <li key={s} className="text-[11px] text-ruby-200 flex gap-1.5 items-start">
                        <span className="mt-0.5 text-ruby-400">−</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Sales Intelligence panel */}
          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0D0D0D]/60 backdrop-blur-sm p-5">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-400/30 to-transparent" />
            <p className="text-[9.5px] tracking-label uppercase font-bold text-gold-300/75 mb-4">Sales Intelligence</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <IntentGauge label="Selling intent" value={intel.sellingIntent} tier={intel.sellingIntentLabel} />
              <IntentGauge label="Buying intent" value={intel.buyingIntent} tier={intel.buyingIntentLabel} />
              <IntentGauge label="Urgency" value={intel.urgencyScore} tier={intel.urgencyScore >= 70 ? "high" : intel.urgencyScore >= 40 ? "moderate" : "low"} />
              <IntentGauge label="Conv. likelihood" value={intel.likelyToConvert} tier={intel.likelyToConvert >= 50 ? "high" : intel.likelyToConvert >= 25 ? "moderate" : "low"} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-3 border-t border-white/[0.07] pt-3">
              <div>
                <p className="text-[9.5px] tracking-label uppercase text-slate-500 mb-0.5">Est. commission</p>
                <p className="text-sm font-semibold text-gold-300">{intel.commissionRange.label}</p>
                <p className="text-[10px] text-slate-500">Wilson NC market avg</p>
              </div>
              <div>
                <p className="text-[9.5px] tracking-label uppercase text-slate-500 mb-0.5">Motivation</p>
                <p className="text-sm text-cream capitalize">{intel.motivationStrength}</p>
                <p className="text-[10px] text-slate-500">Follow up in {intel.recommendedFollowUpLabel}</p>
              </div>
            </div>
            <div className="border-t border-white/[0.07] pt-3">
              <p className="text-[9.5px] tracking-label uppercase text-slate-500 mb-1">Suggested script</p>
              <p className="text-xs text-slate-200 font-mono leading-relaxed bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">{intel.suggestedScript}</p>
            </div>
            <div className="mt-2 border-t border-white/[0.07] pt-2">
              <p className="text-[9.5px] tracking-label uppercase text-slate-500 mb-1">Objection handling</p>
              <p className="text-xs text-slate-300 leading-relaxed">{intel.objectionHandling}</p>
            </div>
          </div>

          {/* Follow-up Calendar panel */}
          {followUp.touchpoints.length > 0 && (
            <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0D0D0D]/60 backdrop-blur-sm p-5">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold-400/25 to-transparent" />
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9.5px] tracking-label uppercase font-bold text-gold-300/75">Follow-up Calendar</p>
                <span className="text-[10.5px] text-slate-400 capitalize">{followUp.urgencyLevel.replace("-", " ")} · {followUp.totalTouchpoints} touchpoints</span>
              </div>
              <div className="space-y-2">
                {followUp.touchpoints.map((tp) => (
                  <div key={tp.templateId} className="flex items-start gap-3 rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2">
                    <div className="w-20 shrink-0">
                      <p className="text-[10px] font-semibold text-gold-300">{tp.delayLabel}</p>
                      <p className={`text-[9px] tracking-label uppercase mt-0.5 ${
                        tp.priority === "critical" ? "text-ruby-300" :
                        tp.priority === "high"     ? "text-amber-300" :
                        tp.priority === "medium"   ? "text-blue-300" : "text-slate-400"
                      }`}>{tp.priority}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10.5px] text-slate-300 capitalize">{tp.channel} · <span className="text-slate-500 text-[10px]">{tp.reason}</span></p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{tp.messageTemplate}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-600">Planning only — no messages are sent automatically.</p>
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

        {/* ── Quick links ── */}
        <div className="md:col-span-3 flex flex-wrap gap-3 pt-2">
          {[
            { href: "/admin/ops",     label: "← Ops Queue" },
            { href: "/admin/routing", label: "Agent Routing →" },
            { href: "/admin/leads",   label: "← All Leads" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-[11px] text-slate-500 hover:text-gold-300 transition-colors border border-white/[0.06] rounded-lg px-3.5 py-2 hover:border-gold-400/25"
            >
              {label}
            </Link>
          ))}
        </div>
      </main>
    </AdminShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0E0E0E]/55 backdrop-blur-sm p-4">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <p className="text-[9.5px] tracking-label uppercase font-bold text-gold-300/65 mb-3">
        {title}
      </p>
      <div>{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[10px] tracking-wide uppercase text-slate-500 font-medium shrink-0 w-28 mt-px">{label}</span>
      <span className="text-[12px] text-cream/90 leading-relaxed">{value}</span>
    </div>
  );
}

function IntentGauge({ label, value, tier }: { label: string; value: number; tier: string }) {
  const barColor =
    tier === "high"     ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
    : tier === "moderate" ? "bg-gold-400 shadow-[0_0_8px_rgba(212,160,23,0.4)]"
    : "bg-slate-500";
  const numColor =
    tier === "high"     ? "text-emerald-300"
    : tier === "moderate" ? "text-gold-300"
    : "text-slate-400";
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[8.5px] tracking-label uppercase text-slate-500 mb-1.5 font-semibold">{label}</p>
      <p className={`font-bebas text-2xl leading-none mb-1.5 ${numColor}`}>{value}</p>
      <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
