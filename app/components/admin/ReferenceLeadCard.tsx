import { Home, Coins, MessageSquare, Route, Phone, ArrowUpRight, ShieldCheck, Clock3, UserRound, CircleCheck, CircleDashed, LockKeyhole } from "lucide-react";
import { LEAD_MODULES, offerDeadline, type LeadPresentation } from "../../lib/leadPresentation";
import Image from "next/image";

export function ReferenceLeadCard({ view, preview = false }: { view: LeadPresentation; preview?: boolean }) {
  const category = LEAD_MODULES[view.subtype];
  const Icon = view.subtype === "copilot" ? MessageSquare : view.subtype === "routing" ? Route : /cash|investor/.test(view.subtype) ? Coins : Home;
  const complete = view.steps.filter((step) => step.state === "complete").length;
  const applicable = view.steps.filter((step) => step.state !== "not_applicable").length;
  return <article data-reference-lead-card={view.subtype} className="min-w-0 overflow-hidden rounded-2xl border border-[#D9AF52]/45 bg-[#121619] text-[#F5EAD1] shadow-[0_12px_40px_#0006]">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9AF52]/30 bg-[#080A0B] px-4 py-3">
      <div><Image src="/images/ask-magic-mike/brand-pack-v2/our-town-logo-clean.png" width={164} height={70} alt="Our Town Properties, Inc." className="h-12 w-32 object-contain object-left"/><p className="mt-1 text-sm text-[#F5EAD1]">Ask Magic Mike · Lead Center</p></div>
      <ShieldCheck size={22} aria-label="Authenticated workspace" className="text-[#D9AF52]" />
    </header>
    <div className="flex items-start gap-3 px-4 py-3" style={{ background: category.surface, color: category.accent }}>
      <Icon size={24} className="mt-1 shrink-0" aria-hidden="true" /><div className="min-w-0"><h2 className="text-lg font-bold leading-snug">{category.title}</h2><p className="mt-1 text-sm">{category.label} · {view.offer?.state.replaceAll("_", " ") || "Saved canonically"}</p></div>
    </div>
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-start gap-2"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#D9AF52]/60 bg-[#080A0B]"><UserRound size={20} aria-hidden="true" /></span><div className="min-w-0"><h3 className="break-words text-base font-semibold">{view.identity?.name || "Identity protected"}</h3><p className="mt-1 break-words text-sm text-[#D9CEB8]">{view.location}</p></div></div>
        <div className="rounded-lg border border-[#D9AF52]/45 bg-[#080A0B] px-3 py-2 text-right"><p className="text-xs font-bold tracking-wider" style={{ color: view.priority === "HOT" ? "#FF8794" : "#D9AF52" }}>{view.priority}</p><p className="mt-1 font-mono text-2xl">{view.score ?? "—"}</p></div>
      </div>
      <p className="break-words text-sm leading-5 text-[#D9CEB8]">{view.identity?.question || "Identity and property details unlock only after authorized assignment."}</p>
      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-[#D9AF52]/25 bg-[#080A0B] p-3">
        {[ ["Source", view.source], ["Timeline", view.timeline], ["Budget / value", view.budget], ["Financing", view.financing] ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs uppercase tracking-wide text-[#D9AF52]">{label}</dt><dd className="mt-1 break-words text-sm leading-5">{value}</dd></div>)}
      </dl>
      {view.identity&&view.reasons.length?<details className="rounded-xl border border-[#D9AF52]/25 px-3"><summary className="cursor-pointer py-3 text-xs font-bold uppercase text-[#D9AF52] focus-visible:outline-2 focus-visible:outline-[#24BED8]">Recorded score factors</summary><ul className="space-y-1 pb-3 text-sm leading-5">{view.reasons.map((reason,index)=><li key={index}>{reason}</li>)}</ul></details>:null}
      {view.identity?.address ? <p className="break-words text-sm"><Home size={16} className="mr-2 inline" aria-hidden="true" />{view.identity.address}<span className="mt-1 block text-xs text-[#D9CEB8]">{view.propertyEvidence}</span></p> : null}
      <section className="rounded-xl border p-3" style={{ borderColor: `${category.accent}55`, background: category.surface }}>
        <h3 className="text-xs font-bold uppercase tracking-[.12em]" style={{ color: category.accent }}>{view.subtype === "copilot" ? "AI + human review" : "Next-action intelligence"}</h3>
        <p className="mt-2 text-sm leading-5">{view.insight}</p><p className="mt-2 text-xs text-[#D9CEB8]">{view.draftStatus}</p>
      </section>
      {view.offer ? <div className="text-sm leading-6"><p className="break-words font-mono text-[#D9AF52]">{view.reference} · v{view.offer.version}</p><p><Clock3 size={16} aria-hidden="true" className="mr-2 inline" />Deadline: {offerDeadline(view.offer.deadline)}</p><p className="text-xs text-[#D9CEB8]">Server clock is authoritative. {preview ? "Synthetic snapshot; no offer exists." : "Open current state before claiming."}</p></div> : null}
      <div className="grid grid-cols-2 gap-2">
        {view.actions.map((action, index) => <div key={action.id} className="min-w-0">
          {!preview && action.href && !action.disabledReason ? <a href={action.href} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#D9AF52]/45 px-3 py-3 text-center text-sm font-bold outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#24BED8] ${index === 0 ? "bg-[#D9AF52] text-[#080A0B]" : "bg-[#080A0B] text-[#F5EAD1]"}`}>{action.id === "call" ? <Phone size={16} aria-hidden="true" /> : <ArrowUpRight size={16} aria-hidden="true" />}{action.label}</a> : <><button disabled className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#D9AF52]/25 bg-[#080A0B] px-3 py-3 text-sm font-bold text-[#D9CEB8]"><LockKeyhole size={16} aria-hidden="true" />{action.label}</button>{!preview?<p className="mt-1 text-xs leading-5 text-[#D9CEB8]">{action.disabledReason}</p>:null}</>}
        </div>)}
      </div>
      {preview?<p className="text-xs text-[#D9CEB8]">Preview only — no state change or contact.</p>:null}
      <section className="border-t border-[#D9AF52]/30 pt-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="text-xs font-bold uppercase tracking-wide text-[#D9AF52]">Verified next steps</h3><span className="text-xs text-[#D9CEB8]">{complete} / {applicable} applicable</span></div><ul className="mt-3 space-y-2">{view.steps.map((step) => <li key={step.label} className="flex items-center gap-2 text-sm">{step.state === "complete" ? <CircleCheck size={16} className="text-[#75DFC1]" aria-hidden="true" /> : <CircleDashed size={16} className="text-[#D9CEB8]" aria-hidden="true" />}{step.label}<span className="ml-auto text-xs text-[#D9CEB8]">{step.state.replaceAll("_", " ")}</span></li>)}</ul></section>
      <p className="text-xs leading-5 text-[#D9CEB8]">{view.nextAction} · {view.custodian}</p>
    </div>
  </article>;
}
