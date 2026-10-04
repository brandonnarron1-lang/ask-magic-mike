"use client";
import { useState } from "react";
import type { AllocationWorkspaceState } from "../../lib/leadAllocationReadModel";
import { ALLOCATION_FILTERS,EMPTY_ALLOCATION_FILTERS,matchesAllocationFilters,allocationPriority,type AllocationFilters } from "../../lib/allocationWorkspaceFilters";
import { offerDeadline } from "../../lib/leadPresentation";

export function AllocationWorkspace({state,preview=false}:{state:AllocationWorkspaceState;preview?:boolean}) {
  const [busy,setBusy]=useState(false),[result,setResult]=useState("");
  const [filters,setFilters]=useState<AllocationFilters>({...EMPTY_ALLOCATION_FILTERS});
  const rows=[...state.leads,...state.offers];
  const leads=state.leads.filter(row=>matchesAllocationFilters(row,filters));
  const offers=state.offers.filter(row=>matchesAllocationFilters(row,filters));
  const labels={intent:"Intent",town:"Town",source:"Source",ownerId:"Owner",priority:"Priority",state:"Offer state",lifecycle:"Lifecycle"};
  function options(key:typeof ALLOCATION_FILTERS[number]) {
    return Array.from(new Set(rows.map(row=>key==="priority"?allocationPriority(row.score):key==="ownerId"?row.ownerId||"unassigned":key==="state"?("state" in row?row.state:"no_offer"):row[key]))).filter(Boolean).sort();
  }
  function ownerLabel(id:string) { return id==="unassigned"?"Unassigned":rows.find(row=>row.ownerId===id)?.owner||"Owner to review"; }
  async function operation(path:string,body:object) {
    if(preview||busy||result)return;setBusy(true);
    try{const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await response.json();setResult(data.ok?"Operation committed. Refresh current state; no browser timer controls expiry.":"Held/not completed: "+(data.error||"review required")+".");}
    catch{setResult("Outcome unconfirmed. Inspect canonical state before retrying.");}finally{setBusy(false);}
  }
  const metricLabels={pending:"Pending intents",ambiguous:"Needs reconciliation",overdue:"Overdue offers",oldestPendingSeconds:"Oldest queued (seconds)",reservedSegments:"Reserved segments",estimatedMicros:"Estimated cost (USD micros)"};
  const action="min-h-11 rounded-lg border border-[#D9AF52]/40 px-4 py-3 text-sm disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#24BED8]";
  return <section className="my-7 min-w-0 rounded-2xl border border-[#D9AF52]/40 bg-[#121619] p-4 text-[#F5EAD1]" aria-label="Smart Routing + Next Steps">
    <p className="text-xs uppercase tracking-widest text-[#D9AF52]">Shared offer · durable server state</p><h2 className="mt-2 text-2xl font-serif">Smart Routing + Next Steps</h2>
    <p className="mt-3 text-sm leading-6">{preview?"INTERNAL QA — DO NOT CONTACT. Synthetic no-send routing workspace; no policy or recipient is activated.":state.error|| (state.held?"Allocation held. Existing intake, custodian and approved alerts continue unchanged.":"Approved policy available. Each offer is an explicit audited operation.")}</p>
    <details className="mt-4 rounded-xl border border-[#D9AF52]/30 px-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#D9AF52] focus-visible:outline-2 focus-visible:outline-[#24BED8]">Filter routing queue</summary><fieldset className="mb-3 grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4"><legend className="mb-3 text-sm font-semibold text-[#D9AF52]">Routing filters</legend>
      {ALLOCATION_FILTERS.map(key=><label key={key} className="min-w-0 text-sm">{labels[key]}<select aria-label={"Routing "+labels[key]} value={filters[key]} onChange={event=>setFilters({...filters,[key]:event.target.value})} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-[#D9AF52]/30 bg-[#080A0B] px-3 focus-visible:outline-2 focus-visible:outline-[#24BED8]"><option value="">All</option>{options(key).map(value=><option key={value} value={value}>{key==="ownerId"?ownerLabel(value):value.replaceAll("_"," ")}</option>)}</select></label>)}
      <button className={action} onClick={()=>setFilters({...EMPTY_ALLOCATION_FILTERS})}>Clear routing filters</button>
    </fieldset></details>
    <h3 className="mt-6 text-sm font-semibold">Recent custodian-review candidates</h3><p className="mt-1 text-xs text-[#D9CEB8]" role="status">{leads.length} of {state.leads.length} loaded candidates · {offers.length} of {state.offers.length} loaded offers</p>
    <ul className="mt-3 space-y-3" aria-label="Filtered allocation candidates">{leads.map(lead=><li key={lead.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D9AF52]/25 p-3"><div className="min-w-0">{preview?<span className="text-sm">QA-REVIEW-{lead.id.slice(-4)}</span>:<a className="text-sm underline" href={"/admin/leads/"+lead.id}>AMM-{lead.id.slice(0,8).toUpperCase()}</a>}<p className="mt-1 break-words text-sm">{lead.intent} · {lead.town||"Area to verify"} · {allocationPriority(lead.score)} {lead.score??"—"} · v{lead.version}</p><p className="mt-1 break-words text-xs text-[#D9CEB8]">{lead.source} · {lead.owner} · {lead.lifecycle}</p></div><button disabled={preview||state.held||busy||Boolean(result)} onClick={()=>operation("/api/admin/allocation/offers",{leadId:lead.id,expectedVersion:Number(lead.version)})} className={action+" bg-[#D9AF52] font-bold text-black"}>Offer under approved policy</button></li>)}</ul>
    <h3 className="mt-6 text-sm font-semibold">Offer history · current channel records</h3><ul className="mt-3 space-y-3" aria-label="Filtered allocation offers">{offers.map(offer=><li key={offer.reference} className="min-w-0 rounded-xl border border-[#D9AF52]/25 p-3"><p className="break-words text-sm font-semibold">{offer.reference} · {offer.state} · v{offer.version}</p><p className="mt-1 break-words text-sm">{offer.intent} · {offer.town||"Area to verify"} · recipient {offer.recipient} · current owner {offer.owner}</p><p className="mt-1 break-words text-xs text-[#D9CEB8]">Deadline: {offerDeadline(offer.deadline)} · {offer.reason}</p><p className="mt-1 break-words text-xs text-[#D9CEB8]">{offer.delivery}. Provider acceptance is not human contact or inbox receipt.</p></li>)}</ul>
    <details className="mt-5 rounded-xl border border-[#D9AF52]/30 p-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#D9AF52] focus-visible:outline-2 focus-visible:outline-[#24BED8]">Reviewed staff enrollment · not an eligibility promise</summary><p className="mt-1 text-xs leading-5 text-[#D9CEB8]">Directory, role, coverage, hours, budget, binding and capacity are rechecked atomically for each offer.</p>
    <ul className="mt-3 grid gap-3 sm:grid-cols-2">{state.roster.map(agent=><li key={agent.id} className="min-w-0 rounded-xl border border-[#D9AF52]/25 p-3"><p className="break-words text-sm font-semibold">{agent.name} · {agent.approved?"Reviewed binding":"Held binding"} · {agent.paused?"Paused":"Available preference"}</p><p className="mt-2 break-words text-xs text-[#D9CEB8]">{agent.towns.join(", ")||"No reviewed coverage"} · {agent.intents.join(", ")||"No reviewed intent"}</p><p className="mt-1 text-xs text-[#D9CEB8]">{agent.currentLoad} load + {agent.outstanding} outstanding / {agent.concurrentCap} concurrent cap · {agent.dailyCap} daily cap · weight {agent.weight}</p><p className="mt-1 text-xs text-[#D9CEB8]">{agent.channels||"No enrolled channel"}</p></li>)}</ul>
    </details>
    <details className="mt-4 rounded-xl border border-[#D9AF52]/30 p-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#D9AF52] focus-visible:outline-2 focus-visible:outline-[#24BED8]">Queue health, policy and expiry controls</summary>
    <dl className="my-5 grid grid-cols-2 gap-4 sm:grid-cols-3">{Object.entries(state.metrics).map(([key,value])=><div key={key} className="min-w-0"><dt className="break-words text-xs text-[#D9CEB8]">{metricLabels[key as keyof typeof metricLabels]}</dt><dd className="mt-1 font-mono text-xl">{value}</dd></div>)}</dl>
    {state.policy?<p className="break-words text-sm leading-6">Policy v{state.policy.version} · {state.policy.mode.replaceAll("_"," ")} · {state.policy.offerSeconds}s server offer window · custodian {state.policy.fallback}. Start: {state.policy.startsAt?offerDeadline(state.policy.startsAt):"Not reviewed"}.</p>:null}
    <p className="mt-3 text-xs leading-5 text-[#D9CEB8]">Costs are application reservations in USD micros, not provider invoices. No scheduler cadence or handset delivery is claimed. Filters apply to at most 25 recent candidates and 25 offers, not the entire CRM.</p>
    <div className="mt-4 flex flex-wrap gap-3">{!preview?<a className={action} href="/admin/allocation/enrollment">Staff channel enrollment</a>:null}<button disabled={preview||!state.ready||busy||Boolean(result)} onClick={()=>operation("/api/admin/allocation/due",{})} className={action}>Process allocation-only expiry</button></div>
    </details>
    {result?<p role="status" className="mt-4 text-sm">{result}</p>:null}
  </section>;
}
