"use client";
import { useRef,useState } from "react";
export function LeadEvidenceWorkspace({leadId,kind,allowed}:{leadId:string;kind:"seller"|"cash_seller"|"investor_buyer";allowed:boolean}) {
 const [result,setResult]=useState(""),[busy,setBusy]=useState(false),[submitted,setSubmitted]=useState(false);
 const attempt=useRef(false);
 async function save(form:FormData) {
  if(attempt.current||!allowed)return;
  attempt.current=true;setSubmitted(true);setBusy(true);setResult("");
  try{
   const note=`${kind==="seller"?"CMA evidence review":kind==="cash_seller"?"Cash-offer seller analysis":"Investor buy-box review"}
Source: ${form.get("source")||"Not yet supplied"}
Source date: ${form.get("source_date")||"Unverified"}
Facts / criteria to verify: ${form.get("facts")||"Not yet supplied"}
Missing facts: ${form.get("missing")||"Current authorized comps, financing and availability"}
Broker/human review required. This is not an appraisal, binding offer or send request.`;
   const response=await fetch(`/api/admin/leads/${leadId}/tasks`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:kind==="seller"?"Broker-reviewed CMA evidence":kind==="cash_seller"?"Seller disposition evidence":"Investor buy-box evidence",body:note,category:"evidence_review",priority:"normal"})});
   const data=await response.json();
   // Only definitive 4xx failures permit a fresh attempt. A 5xx/timeout may follow a commit.
   if(response.status>=400&&response.status<500){attempt.current=false;setSubmitted(false);}
   setResult(response.ok&&data.ok?"Review task saved in the canonical timeline. No packet or offer was sent.":`Not confirmed: ${data.error||"task unavailable"}. Inspect current tasks before retrying.`);
  }catch{setResult("Save outcome could not be confirmed. Inspect canonical tasks before repeating.");}finally{setBusy(false);}
 }
 const input="mt-1 min-h-11 w-full rounded-lg border border-[#D9AF52]/30 bg-[#080A0B] p-3";
 return <section id="property-evidence-review" className="rounded-2xl border border-[#D9AF52]/40 bg-[#121619] p-5 text-[#F5EAD1]">
  <p className="text-xs uppercase tracking-wide text-[#D9AF52]">Evidence workspace</p>
  <h2 className="mt-2 text-xl font-semibold">{kind==="seller"?"Prepare broker-reviewed CMA":kind==="cash_seller"?"Prepare seller disposition analysis":"Prepare investor buy-box review"}</h2>
  <p className="mt-3 text-sm leading-6 text-[#D9CEB8]">Save the evidence request and next task. Values, equity, ARV, offers and inventory remain unknown without current authorized evidence.</p>
  <form action={save} className="mt-4 grid gap-3 sm:grid-cols-2">
   <label className="text-sm">Evidence source URL<input name="source" type="url" maxLength={300} placeholder="https://…" className={input}/></label>
   <label className="text-sm">Source date<input name="source_date" type="date" className={input}/></label>
   <label className="text-sm sm:col-span-2">Known facts / stated criteria<textarea name="facts" maxLength={600} rows={3} className={input}/></label>
   <label className="text-sm sm:col-span-2">Missing facts to verify<textarea name="missing" maxLength={400} rows={2} className={input}/></label>
   <button disabled={!allowed||busy||submitted} className="min-h-11 rounded-lg bg-[#D9AF52] px-4 font-bold text-[#080A0B] disabled:opacity-50">{busy?"Saving…":submitted?"Inspect saved task":"Save review task"}</button>
  </form>
  {!allowed?<p className="mt-3 text-sm">Assigned editor permission required; QA/suppressed records are not actionable.</p>:null}
  {result?<p role="status" className="mt-4 text-sm">{result}</p>:null}
 </section>;
}
