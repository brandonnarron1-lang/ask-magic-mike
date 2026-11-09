// Node phase records; no new baseline CDP/init-script layer. The explicit
// post-assertion DOM read is separately retained before teardown.
import {writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {HostReceipt} from './pr324-collector-runtime.mjs';
import {frozenObserver} from './pr324-frozen-logpoints.mjs';
import {createFinalCapture} from './pr324-final-capture.mjs';
const dir=process.env.AMM_SESSION_ARTIFACT_DIR;
const state={schema:'amm.pr324.samejob-trial-phase.v1',mode:process.env.AMM_SAME_JOB_MODE,events:[],primary:null,lastCompleted:null,pending:null,versions:{}};
let active;
function save(){if(dir)writeFileSync(path.join(dir,'samejob-phases.json'),JSON.stringify(state),{mode:0o600});}
export function samePhase(phase){state.pending=phase;state.events.push({phase,at:new Date().toISOString(),monotonic:performance.now()});if(state.events.length>40)state.events.shift();save();}
export function samePrimary(status,code){if(!state.primary){state.primary={status,code};save();}active?.recordPrimary?.(status,code);active?.host?.primary(status,code);}
export function sameNote(stage,value){
 if(!['rendered_V1','concurrent_SQL_V2','review_expected_V2'].includes(stage))return;
 state.versions[stage]={lead:value.lead,action:value.action,version:value.version};state.lastCompleted=stage;save();
}
export async function sameStart(page,lead){
 if(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE!=='1'||process.env.VERCEL_ENV!=='development'||!dir)throw Error('isolated_samejob_only');
 state.captureIdentity={trialId:process.env.AMM_DIAGNOSTIC_TRIAL_ID,pageId:randomUUID(),lead};
 state.finalCapture={status:'UNAVAILABLE',reason:'ASSERTION_BOUNDARY_NOT_REACHED'};
 samePhase('observer_start');
 if(process.env.AMM_SAME_JOB_MODE==='baseline'){
  const host=new HostReceipt(path.join(dir,'samejob-host.json'),{mode:'baseline',newCDP:false});
  host.addStop('page',async()=>{if(!page.isClosed())await page.close();return {verified:page.isClosed()};});
  active={host,prepare:async()=>{},capture:async()=>{},recordPrimary:(status,code)=>host.primary(status,code),finish:()=>host.finish()};
 }else{
  const observer=await frozenObserver(page,lead);
  active={...observer,host:new HostReceipt(path.join(dir,'samejob-host.json'),{mode:process.env.AMM_SAME_JOB_MODE,newCDP:true})};
  active.host.addStop('page',async()=>{if(!page.isClosed())await page.close();return {verified:page.isClosed()};});
 }
 const finalCapture=createFinalCapture(page,state.captureIdentity,active.host,record=>{state.finalCapture=record;save();});
 active.captureFinal=boundary=>finalCapture({action:state.versions.rendered_V1?.action,boundary});
 samePhase('observer_ready');return active;
}
export async function sameFinish(observer,legacyFinish){
 try{await observer.host.run('legacy_failure_snapshot',legacyFinish,2000);}catch(error){observer.host.error('legacy_failure_snapshot',error);}
 finally{
  try{await observer.finish();}catch(error){observer.host.error('observer_finish',error);}
  await observer.host.finish();save();
 }
}
