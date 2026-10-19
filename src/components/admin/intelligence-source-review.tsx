"use client";
import {useEffect,useRef,useState} from "react";
type Version={id:string;ordinal:number;validation:string;revoked:boolean;reason:string;content_hash:string;snapshot:{source:{fetchedAt:string;effectiveAt:string;freshnessHours:number;url:string;owner:string;licenseScope?:string;upstreamModifiedAt?:string|null;permissions?:Record<string,boolean>};passages?:{id:string;version:string;text:string;intent:string}[]}};
type Source={id:string;revision:number;active_version:string|null;revoked:boolean;versions:Version[]};
type Draft={id:string;role:string;status:string;source_valid:boolean;result:{text?:string;evidence?:string[]}|null};
const date=(value:string)=>{const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeStyle:"short",timeZone:"America/New_York"}).format(d):"Not established";};
export function IntelligenceSourceReview(){
 const [sources,setSources]=useState<Source[]>([]),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const [reason,setReason]=useState(""),[hours,setHours]=useState(720);const errorRef=useRef<HTMLParagraphElement>(null);
 const pending=useRef<{payload:string;requestId:string}|null>(null),inFlight=useRef(false);
 const [drafts,setDrafts]=useState<Draft[]>([]);
 async function read(){const r=await fetch("/api/admin/intelligence/sources",{cache:"no-store"});const d=await r.json();if(!r.ok){setSources([]);setDrafts([]);throw Error(d.error||"Source review unavailable");}setSources(d.sources);setDrafts(d.drafts||[]);setLoaded(true);}
 useEffect(()=>{void read().catch(e=>setNotice(e.message));},[]);
 useEffect(()=>{if(notice)errorRef.current?.focus();},[notice]);
 async function act(action:string,source?:Source,version?:Version){
  if(inFlight.current)return;inFlight.current=true;
  const payload=JSON.stringify({action,sourceId:"ourtown-experience",revision:source?.revision||0,versionId:version?.id,reason,freshnessHours:hours});
  if(pending.current?.payload!==payload)pending.current={payload,requestId:crypto.randomUUID()};
  setBusy(true);setNotice("");try{const r=await fetch("/api/admin/intelligence/sources",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({...JSON.parse(payload),requestId:pending.current.requestId})});const d=await r.json();
   if(!r.ok||!d.ok)throw Error(d.error||"Source decision not saved");pending.current=null;setNotice(d.unchanged?"Unchanged source; no version or review was added.":`Saved ${action}. Read current source status before the next action.`);await read();
  }catch(e){setNotice(`${e instanceof Error?e.message:"Source decision not saved"}. Retry reconciles this same request; drafts are preserved.`);}finally{setBusy(false);inFlight.current=false;}
 }
 const button="min-h-11 max-w-full rounded-md border border-[#cda24a66] px-3 py-2 text-sm disabled:opacity-50";
 return <section className="my-6 min-w-0 rounded-xl border border-[#cda24a44] p-3 sm:p-5" aria-label="Source review">
  <h2 className="text-xl font-semibold text-[#f4ead4]">Approved source review</h2>
  <p className="my-2 text-sm text-[#b9ae9d]">Owned service wording only. A refresh is a candidate, not approval. No model, message or schedule runs here. Revocation blocks new use; previously delivered text cannot be retracted.</p>
  {notice?<p ref={errorRef} tabIndex={-1} role="status" className="my-3 break-words text-sm text-[#f0cf79]">{notice}</p>:null}
  {loaded&&!sources.length?<button type="button" className={button} disabled={busy} onClick={()=>act("register")}>Register approved Our Town source</button>:null}
  <label className="my-3 block text-sm">Freshness limit (hours, max 720)<input aria-label="Source freshness hours" type="number" min={1} max={720} value={hours} onChange={e=>setHours(Number(e.target.value))} className="ml-2 min-h-11 w-24 rounded border border-white/20 bg-black px-2"/></label>
  <label className="my-3 block text-sm">Decision reason<textarea maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} className="mt-1 block min-h-11 w-full rounded border border-white/20 bg-black p-2"/></label>
  {sources.map(s=><article key={s.id} className="my-4 min-w-0 border-t border-white/15 pt-4">
   <h3 className="font-semibold">Our Town service and intake guidance</h3>
   <p className="my-2 text-sm">Saved revision {s.revision} · {s.revoked?"REVOKED — new use blocked":s.active_version?"Active version recorded; dates still apply":"No active version"}</p>
   <div className="flex flex-wrap gap-2"><button className={button} disabled={busy||s.revoked} onClick={()=>act("refresh",s)}>Fetch registered source</button><button className={button} disabled={busy||s.revoked||!reason.trim()} onClick={()=>act("revoke_source",s)}>Revoke entire source</button></div>
   {s.versions.map(v=><details key={v.id} className="my-3 min-w-0 rounded border border-white/10 p-3"><summary className="min-h-11 cursor-pointer py-2">Version {v.ordinal} · {v.validation} · {v.revoked?"revoked":s.active_version===v.id?"selected active":"not active"}</summary>
    <p className="my-2 break-words text-sm">Effective <time dateTime={v.snapshot.source.effectiveAt}>{date(v.snapshot.source.effectiveAt)}</time>; retrieved <time dateTime={v.snapshot.source.fetchedAt}>{date(v.snapshot.source.fetchedAt)}</time> Eastern; freshness {v.snapshot.source.freshnessHours} hours. Publication date not recorded. {v.reason}</p>
    <a href="https://www.askmagicmike.com/api/experience/v1" className="block min-h-11 py-2 text-sm underline">Our Town approved source</a>
    <p className="my-2 break-words text-sm">Saved version: {v.id}. Content SHA-256: {v.content_hash}. Validation is not a human approval or permission to activate paid AI.</p>
    <p className="my-2 text-sm">Scope: {v.snapshot.source.licenseScope||"Not recorded"}. Not an MLS, listing or comps dataset.</p>
    <p className="my-2 text-sm">Permitted uses in this saved snapshot: {v.snapshot.source.permissions?Object.entries(v.snapshot.source.permissions).map(([use,allowed])=>`${use}: ${allowed===true?"permitted":allowed===false?"not permitted":"not established"}`).join("; "):"Not recorded"}. These rights do not authorize publication or paid activation.</p>
    <p className="my-2 text-sm">Upstream modification date: {v.snapshot.source.upstreamModifiedAt?date(v.snapshot.source.upstreamModifiedAt):"Not recorded"}.</p>
    <h4 className="mt-3 font-semibold">Exact retained passages for review</h4>
    {v.snapshot.passages?.length?<ul className="my-2 space-y-3">{v.snapshot.passages.map(p=><li key={p.id} className="min-w-0 break-words text-sm"><p>{p.intent} · {p.text}</p><p className="mt-1 text-[#b9ae9d]">Passage version: {p.version}</p></li>)}</ul>:<p className="my-2 text-sm">No retained passage is recorded. Do not infer it from the current public page.</p>}
    <p className="my-2 text-sm">Promotion changes future retrieval and may invalidate answers, jobs and handoff approvals bound to the earlier authorization revision.</p>
    <div className="flex flex-wrap gap-2"><button className={button} disabled={busy||v.revoked} onClick={()=>act("validate",s,v)}>Validate candidate</button><button className={button} disabled={busy||s.revoked||v.revoked||v.validation!=="validated"} onClick={()=>act("promote",s,v)}>Promote validated version</button><button className={button} disabled={busy||v.revoked||!reason.trim()} onClick={()=>act("revoke_version",s,v)}>Revoke this version</button><button className={button} disabled={busy||v.revoked||v.validation!=="validated"||!reason.trim()} onClick={()=>act("recover",s,v)}>Restore eligible version</button></div>
   </details>)}
  </article>)}
  {drafts.length?<details className="my-4 min-w-0 border-t border-white/15 pt-3"><summary className="min-h-11 cursor-pointer py-2">Bounded worker review drafts</summary>
   <p className="my-2 text-sm">Existing job results. Drafts are not approved knowledge or permission to publish. No send, publication or scheduled execution is available here.</p>
   {drafts.map(d=><article key={d.id} className="my-3 min-w-0 rounded border border-white/15 p-3"><h3>{d.role.replaceAll("_"," ")} · {d.status}</h3><p className="my-2 text-sm">Current support: {d.source_valid?"eligible; human review still required":"invalid or not established — new approval/use blocked"}.</p>
    <p className="whitespace-pre-wrap break-words text-sm">{d.result?.text||"No completed draft."}</p><ul className="mt-2 text-sm">{d.result?.evidence?.map(e=><li key={e} className="break-words">{e}</li>)}</ul></article>)}
  </details>:null}
 </section>;
}
