"use client";
import { useState } from "react";
import type { AllocationWorkspaceState } from "../../lib/leadAllocationReadModel";
export function AllocationWorkspace({state}:{state:AllocationWorkspaceState}) {
  const [busy,setBusy]=useState(false),[result,setResult]=useState("");
  async function operation(path:string,body:object) {
    if(busy||result)return;setBusy(true);
    try{const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await response.json();setResult(data.ok?"Operation committed. Refresh current state; no browser timer controls expiry.":`Held/not completed: ${data.error||"review required"}.`);}
    catch{setResult("Outcome unconfirmed. Inspect canonical state before retrying.");}finally{setBusy(false);}
  }
  return <section className="my-7 rounded-2xl border border-[#D9AF52]/40 bg-[#121619] p-5 text-[#F5EAD1]" aria-label="Smart Routing + Next Steps">
    <p className="text-xs uppercase tracking-widest text-[#D9AF52]">Shared offer · durable server state</p><h2 className="mt-2 text-2xl font-serif">Smart Routing + Next Steps</h2>
    <p className="mt-3 text-sm leading-6">{state.error|| (state.held?"Allocation held. Existing intake, custodian and approved alerts continue unchanged.":"Approved policy available. Each offer is an explicit audited operation.")}</p>
    <dl className="my-5 grid grid-cols-2 gap-4 sm:grid-cols-3">{Object.entries(state.metrics).map(([key,value])=><div key={key} className="min-w-0"><dt className="break-words text-xs text-[#D9CEB8]">{key}</dt><dd className="mt-1 font-mono text-xl">{value}</dd></div>)}</dl>
    <p className="text-xs leading-5 text-[#D9CEB8]">Costs are application reservations in USD micros, not provider invoices. No scheduler cadence or handset delivery is claimed.</p>
    <div className="mt-4 flex flex-wrap gap-3"><a className="min-h-11 rounded-lg border border-[#D9AF52]/40 px-4 py-3 text-sm" href="/admin/allocation/enrollment">Staff channel enrollment</a><button disabled={!state.ready||busy||Boolean(result)} onClick={()=>operation("/api/admin/allocation/due",{})} className="min-h-11 rounded-lg border border-[#D9AF52]/40 px-4 py-3 text-sm disabled:opacity-50">Process allocation-only expiry</button></div>
    <h3 className="mt-6 text-sm font-semibold">Recent custodian-review candidates · manual review or approved due worker</h3>
    <ul className="mt-3 space-y-3">{state.leads.map(lead=><li key={lead.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D9AF52]/25 p-3"><div><a className="text-sm underline" href={`/admin/leads/${lead.id}`}>AMM-{lead.id.slice(0,8).toUpperCase()}</a><p className="mt-1 text-xs">{lead.intent} · {lead.town||"Area to verify"} · {lead.score??"Unscored"} · v{lead.version}</p></div><button disabled={state.held||busy||Boolean(result)} onClick={()=>operation("/api/admin/allocation/offers",{leadId:lead.id,expectedVersion:Number(lead.version)})} className="min-h-11 rounded-lg bg-[#D9AF52] px-4 text-sm font-bold text-black disabled:opacity-50">Offer under approved policy</button></li>)}</ul>
    <h3 className="mt-6 text-sm font-semibold">Offer history</h3><ul className="mt-3 space-y-2">{state.offers.map(offer=><li key={offer.reference} className="break-words text-sm">{offer.reference} · {offer.state} · v{offer.version}<p className="text-xs text-[#D9CEB8]">{offer.deadline} · {offer.reason}</p></li>)}</ul>
    {result?<p role="status" className="mt-4 text-sm">{result}</p>:null}
  </section>;
}
