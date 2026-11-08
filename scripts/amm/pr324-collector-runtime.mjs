// Task-scoped host evidence and cancellable budgets. No application imports/effects.
import {writeFileSync,renameSync} from 'node:fs';
import {Worker} from 'node:worker_threads';
export class CollectorDeadline extends Error {
 constructor(phase){super('collector_deadline');this.code='COLLECTOR_DEADLINE';this.phase=phase;}
}
const code=error=>String(error?.code||error?.name||'collector_error').replace(/[^A-Za-z0-9_-]/g,'').slice(0,60);
export class HostReceipt {
 constructor(file,identity){
  this.file=file;this.stops=new Map();this.pending=new Set();this.finalization=null;
  this.state={schema:'amm.pr324.collector.v1',identity,createdAt:new Date().toISOString(),phase:'before_attachment',primary:null,operations:[],errors:[],events:[{phase:'before_attachment',at:new Date().toISOString()}],cleanup:[],finished:false};
  this.persist(); // Must precede every browser/protocol await.
 }
 persist(){const tmp=this.file+'.tmp';writeFileSync(tmp,JSON.stringify(this.state,null,2),{mode:0o600});renameSync(tmp,this.file);}
 checkpoint(phase,detail={}){this.state.phase=phase;this.state.events.push({phase,at:new Date().toISOString(),...detail});if(this.state.events.length>100)this.state.events.shift();this.persist();}
 primary(status,reason){if(!this.state.primary){this.state.primary={status,reason};this.persist();}}
 error(phase,error){this.state.errors.push({phase,code:code(error)});this.persist();}
 addStop(name,stop){this.stops.set(name,stop);}
 async run(phase,work,budgetMs,cancel=()=>this.cancel()){
  const record={phase,budgetMs,startedAt:new Date().toISOString(),status:'pending'};this.state.operations.push(record);this.checkpoint('before_'+phase);
  const abort=new AbortController();let timer;
  const pending=Promise.resolve().then(()=>work(abort.signal));
  this.pending.add(pending);pending.then(()=>this.pending.delete(pending),()=>this.pending.delete(pending));
  // Observe late rejection, but do not let work outlive a deadline: cancel below
  // terminates workers or closes the task-owned browser target/protocol session.
  pending.catch(()=>{});
  try{const value=await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new CollectorDeadline(phase)),budgetMs);})]);record.status='complete';return value;}
  catch(error){record.status=error instanceof CollectorDeadline?'deadline':'error';record.code=code(error);this.error(phase,error);
   if(error instanceof CollectorDeadline){abort.abort();this.checkpoint('deadline_'+phase);await cancel();}
   throw error;
  }finally{clearTimeout(timer);record.endedAt=new Date().toISOString();this.persist();}
 }
 async cancel(){
  for(const [name,stop] of this.stops){
   const item={name,attempted:true,verified:false};this.state.cleanup.push(item);this.checkpoint('before_stop',{resource:name});let timer;
   try{const result=await Promise.race([Promise.resolve().then(stop),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new CollectorDeadline('stop_'+name)),1500);})]);item.verified=result?.verified===true;item.result=result||null;}
   catch(error){item.code=code(error);this.error('stop_'+name,error);}
   finally{clearTimeout(timer);this.persist();}
  }
 }
 finish(work=async()=>{}){
  if(this.finalization)return this.finalization;
  this.checkpoint('before_finalize');
  this.finalization=(async()=>{
   try{await this.run('finalize',work,4000);}catch(error){this.error('finalize',error);}
   finally{await this.cancel();let timer;
    try{await Promise.race([Promise.allSettled([...this.pending]),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new CollectorDeadline('pending_drain')),1000);})]);this.state.pendingStopped=this.pending.size===0;}
    catch(error){this.state.pendingStopped=false;this.error('pending_drain',error);}
    finally{clearTimeout(timer);this.state.finished=true;this.checkpoint('finished');}
   }
   return this.state;
  })();return this.finalization;
 }
}

let workerSequence=0;
export async function mapOffThread(source,host,{stall=false,budgetMs=3500}={}){
 const resource='map_worker_'+(++workerSequence);
 let worker,exited=false,exitCode=null;
 return host.run('map_worker',async signal=>{
  if(source.length>1500000)throw Object.assign(Error('oversized_script'),{code:'SCRIPT_SIZE_LIMIT'});
  worker=new Worker(new URL('./pr324-collector-worker.mjs',import.meta.url),{workerData:{source,stall}});
  const stop=async()=>{if(!exited)await worker.terminate();return {verified:exited,exitCode};};
  host.addStop(resource,stop);
  const abort=()=>{void stop();};signal.addEventListener('abort',abort,{once:true});
  try{return await new Promise((resolve,reject)=>{
   let settled=false;
   worker.on('message',result=>{if(result.phase==='cpu_stall_entered'){host.checkpoint('worker_cpu_stall_entered');return;}settled=true;resolve(result);});worker.once('error',reject);
   worker.once('exit',value=>{exited=true;exitCode=value;if(!settled)reject(Object.assign(Error('worker_closed'),{code:'WORKER_CLOSED'}));});
  });}finally{signal.removeEventListener('abort',abort);await stop();host.stops.delete(resource);host.state.cleanup.push({name:resource,attempted:true,verified:exited,result:{exitCode}});host.persist();}
 },budgetMs);
}
