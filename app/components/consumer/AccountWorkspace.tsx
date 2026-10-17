"use client";

import { useCallback,useEffect,useRef,useState,type FormEvent } from "react";
import { TextField } from "../black-diamond/FormField";
import { guestInterest,MAX_GUEST_INTERESTS,type GuestInterest } from "../../lib/consumerInterests";
import { consumerInterestWrite,type ConsumerProfile,type ConsumerWorkspaceSnapshot } from "../../lib/consumerWorkspaceContract";

const empty:ConsumerWorkspaceSnapshot={version:"amm.consumer-workspace.v1",revision:0,interests:[],updatedAt:null};
const button="amm-primary-button min-h-11 px-5 py-3 disabled:opacity-60";
const secondary="amm-secondary-button min-h-11 px-5 py-3 disabled:opacity-60";

export function AccountWorkspace({enabled}:{enabled:boolean}) {
  const [profile,setProfile]=useState<ConsumerProfile|null>(null),[saved,setSaved]=useState(empty),[items,setItems]=useState<GuestInterest[]>([]);
  const [mode,setMode]=useState<"sign-in"|"sign-up">("sign-in"),[kind,setKind]=useState<"property"|"search">("property"),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
  const epoch=useRef(0),active=useRef(true),pending=useRef(false);
  const advanceEpoch=useCallback(()=>{epoch.current+=1;},[]);
  const clear=useCallback(()=>{advanceEpoch();setProfile(null);setItems([]);setSaved(empty);setDirty(false);},[advanceEpoch]);
  const api=useCallback(async(path:string,method="GET",body?:unknown)=>{
    const response=await fetch(path,{method,credentials:"same-origin",redirect:"error",cache:"no-store",headers:{Accept:"application/json",...(body===undefined?{}:{"Content-Type":"application/json"})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await response.json();
    if(!response.ok){if(response.status===401||response.status===403&&result.error!=="account_confirmation_failed")clear();throw new Error(response.status===409?"Your saved version changed. Read it before saving again.":result.error==="account_confirmation_failed"?"Password not confirmed. Nothing was deleted.":"Access could not be confirmed. Sign in again or use the guest workspace.");}
    return result;
  },[clear]);
  const load=useCallback(async()=>{const version=epoch.current;const result=await api("/api/consumer/v1/workspace");if(active.current&&epoch.current===version){setProfile(result.profile);setSaved(result.workspace);setItems(result.workspace.interests);setDirty(false);}},[api]);
  useEffect(()=>{
    active.current=true;if(enabled)void load().catch(()=>{});
    const check=async()=>{if(document.visibilityState!=="visible"||!enabled)return;const version=epoch.current;try{const r=await fetch("/api/consumer-auth/get-session",{credentials:"same-origin",cache:"no-store",redirect:"error"});const s=await r.json();if(active.current&&epoch.current===version&&(!r.ok||!s?.user||s.user.audience!=="consumer"||s.user.disabled))clear();}catch{if(active.current&&epoch.current===version)clear();}};
    window.addEventListener("focus",check);document.addEventListener("visibilitychange",check);
    return()=>{active.current=false;advanceEpoch();window.removeEventListener("focus",check);document.removeEventListener("visibilitychange",check);};
    // Initial load only. Session checks never overwrite unsaved comparisons.
  },[enabled,load,clear,advanceEpoch]);
  async function perform(work:(version:number)=>Promise<void>){if(pending.current)return;pending.current=true;setBusy(true);setMessage("");try{await work(epoch.current);}catch(error){if(active.current)setMessage(error instanceof Error?error.message:"Could not confirm the action. Read the saved version before retrying.");}finally{pending.current=false;if(active.current)setBusy(false);}}
  function authenticate(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,data=new FormData(form);void perform(async()=>{
    const body={email:String(data.get("email")||""),password:String(data.get("password")||""),...(mode==="sign-up"?{name:String(data.get("name")||"")}: {})};
    await api(`/api/consumer-auth/${mode}/email`,"POST",body);form.reset();
    if(mode==="sign-up"){setMode("sign-in");setMessage("Account request processed. Sign in with your account password; existing accounts are unchanged. No email was sent.");}
    else{epoch.current++;await load();setMessage("Signed in. Saving a comparison is separate from requesting help.");}
  });}
  function add(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,data=new FormData(form);try{
    if(items.length>=MAX_GUEST_INTERESTS)throw new Error("Keep up to eight interests. Remove one before adding another.");
    const item=guestInterest({kind,value:String(data.get("interest")||""),budget:String(data.get("budget")||"")},crypto.randomUUID());
    if(items.some(old=>JSON.stringify(old.declared)===JSON.stringify(item.declared)))throw new Error("That interest is already in this comparison.");
    setItems(current=>[...current,item]);setDirty(true);setMessage("");form.reset();
  }catch(error){setMessage(error instanceof Error?error.message:"Review that reference.");}}
  if(!enabled)return <p role="status" className="rounded-xl border border-white/20 p-5 leading-7">Online accounts are not enabled in this environment. <a href="/my" className="underline">Use the guest comparison</a> or any public inquiry form without signing in.</p>;
  return <div className="space-y-6 [overflow-wrap:anywhere]">
    <p className="max-w-3xl leading-7">Optional beta: explicitly save comparisons across devices. No messages are sent and past inquiries are not linked. The email is a login identifier, not verified ownership. Password-reset email is not available in this beta; keep your password securely. <a href="/privacy" className="underline">Privacy and record handling</a>.</p>
    {message?<p role="status" className="rounded-lg border border-[#cda24a66] p-4 leading-7">{message}</p>:null}
    {!profile?<section aria-labelledby="consumer-signin-heading" className="rounded-xl border border-white/20 p-5 sm:p-7">
      <h2 id="consumer-signin-heading" className="font-serif text-3xl">{mode==="sign-in"?"Sign in to your comparison":"Create a separate consumer account"}</h2>
      <form onSubmit={authenticate} className="mt-5 grid max-w-xl gap-4">
        {mode==="sign-up"?<TextField name="name" label="Your name" autoComplete="name" maxLength={80} required/>:null}
        <TextField name="email" label="Account email" type="email" autoComplete="username" maxLength={254} required/>
        <TextField name="password" label="Account password" type="password" autoComplete={mode==="sign-in"?"current-password":"new-password"} minLength={14} maxLength={128} required/>
        <p className="text-sm leading-6">Use at least 14 characters. This does not create a lead, subscribe you, or verify this email.</p>
        <button disabled={busy} className={button} type="submit">{busy?"Checking…":mode==="sign-in"?"Sign in":"Create account"}</button>
        <button disabled={busy} className={secondary} type="button" onClick={()=>{setMode(current=>current==="sign-in"?"sign-up":"sign-in");setMessage("");}}>{mode==="sign-in"?"Create an account instead":"Already have an account? Sign in"}</button>
      </form>
    </section>:<>
      <section aria-labelledby="online-comparison-heading" className="rounded-xl border border-white/20 p-5 sm:p-7">
        <h2 id="online-comparison-heading" className="font-serif text-3xl">Your saved comparison</h2>
        <p className="mt-3 select-text leading-7">Signed in as {profile.name}. {items.length} of eight interests. {dirty?"Unsaved changes in this page only.":saved.updatedAt?"Saved online; no inquiry was submitted.":"No saved online comparison yet."}</p>
        <form onSubmit={add} className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
          <label>Interest type<select className="amm-form-field mt-2 min-h-11 text-base" value={kind} onChange={e=>setKind(e.target.value as "property"|"search")}><option value="property">Property reference</option><option value="search">Search preference</option></select></label>
          <TextField name="interest" label={kind==="property"?"Address or listing link":"Search area"} autoComplete="off" maxLength={500} required/>
          {kind==="search"?<TextField name="budget" label="Budget range (optional)" maxLength={160}/>:null}
          <button disabled={busy} className={secondary} type="submit">Add to this comparison</button>
        </form>
        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2" aria-label="Private comparison">
          {items.map(item=><article key={item.id} className="min-w-0 rounded-lg border border-white/20 p-4"><h3 className="select-text text-lg font-semibold">{item.label}</h3><p className="mt-2 text-sm leading-6">User-reported · unverified. Availability, price and ownership are not established. Not a survey.</p>{item.declared.kind==="search"&&item.declared.budget_range?<p className="mt-2">Budget: {item.declared.budget_range}</p>:null}<button disabled={busy} type="button" className={`${secondary} mt-4`} onClick={()=>{setItems(current=>current.filter(old=>old.id!==item.id));setDirty(true);}}>Remove {item.label}</button></article>)}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button disabled={busy||!dirty} type="button" className={button} onClick={()=>void perform(async()=>{const version=epoch.current;const result=await api("/api/consumer/v1/workspace","PUT",{revision:saved.revision,interests:consumerInterestWrite(items)});if(epoch.current===version){setSaved(result.workspace);setItems(result.workspace.interests);setDirty(false);setMessage("Comparison saved online. No inquiry or message was sent.");}})}>Save comparison online</button>
          <button disabled={busy} type="button" className={secondary} onClick={()=>void perform(async()=>{await load();setMessage("Read the saved version. Any local unsaved comparison was replaced.");})}>{dirty?"Replace local edits with saved version":"Read saved version"}</button>
        </div>
        <p className="mt-4 text-sm leading-6">A timeout is not confirmation. Read the saved version before trying again; nothing is automatically replayed after reconnecting.</p>
      </section>
      <section className="rounded-xl border border-white/20 p-5 sm:p-7" aria-label="Account controls">
        <h2 className="font-serif text-3xl">You stay in control.</h2>
        <p className="mt-3 leading-7">To request help, use the <a className="underline" href="/buy">normal buying form</a> or <a className="underline" href="/home-value">home-value form</a>. Choose and enter the reference there. Opening a form does not submit this account, grant contact permission, or book an appointment.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={busy} className={secondary} onClick={()=>void perform(async version=>{const value=await api("/api/consumer/v1/account");if(!active.current||epoch.current!==version)return;const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="ask-magic-mike-account.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage("Your own account export was prepared. It contains no staff or earlier inquiry records.");})}>Download my account data</button>
          <button type="button" disabled={busy} className={secondary} onClick={()=>void perform(async()=>{await api("/api/consumer-auth/revoke-sessions","POST",{});clear();setMessage("Consumer sessions ended on all devices. Staff accounts and inquiries were unchanged.");})}>Sign out all devices</button>
          <button type="button" disabled={busy} className={secondary} onClick={()=>void perform(async()=>{await api("/api/consumer-auth/sign-out","POST",{});clear();setMessage("Signed out. Private comparison cleared from this page.");})}>Sign out</button>
        </div>
        <details className="mt-6 rounded-lg border border-white/20 p-4"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Delete this consumer account</summary>
          <p className="mt-3 leading-7">Removes your active consumer profile, saved comparison and all consumer sessions. Separately submitted inquiries and required brokerage/audit records are not erased. This action does not contact anyone.</p>
          <form className="mt-4 grid max-w-xl gap-4" onSubmit={event=>{event.preventDefault();const form=event.currentTarget,password=String(new FormData(form).get("delete-password")||"");form.reset();void perform(async()=>{await api("/api/consumer/v1/account","DELETE",{password});clear();setMessage("Consumer account deleted from the active workspace. Separate inquiry and required records remain under existing record handling.");});}}>
            <TextField name="delete-password" label="Confirm account password" type="password" autoComplete="current-password" maxLength={128} required/>
            <label className="flex min-h-11 items-start gap-3"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" required/>I understand that this removes my consumer account, not separate brokerage inquiries or required records.</label>
            <button className={secondary} disabled={busy} type="submit">Delete my consumer account</button>
          </form>
        </details>
      </section>
    </>}
    <p className="leading-7"><a className="underline" href="/my">Guest comparison</a> · <a className="underline" href="/plan">Seller checklist and buying plan</a>. Guest tools and public inquiry forms remain available without an account.</p>
  </div>;
}
