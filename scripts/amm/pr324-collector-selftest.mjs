// Linux browser/worker fault tests ONLY. No app, database, transport or Production.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {HostReceipt,mapOffThread,CollectorDeadline} from './pr324-collector-runtime.mjs';
import {cases,sealPackage,verifyPackage} from './pr324-collector-package.mjs';
if(process.platform!=='linux'||process.env.GITHUB_ACTIONS!=='true'||process.env.AMM_COLLECTOR_SELFTEST!=='1'||process.env.DATABASE_URL||process.env.VERCEL_ENV||process.env.PREVIEW_URL)throw Error('clean_linux_fault_test_only');
const dir=path.resolve('output/pr324-collector');mkdirSync(dir,{recursive:true});
const identity={controller:process.env.GITHUB_SHA,controllerTree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),application:null,build:null,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,purpose:'synthetic collector faults; NOT application acceptance'};
const outcomes=[];
for(const name of cases){
 const host=new HostReceipt(path.join(dir,`collector-case-${name}.json`),identity),start=performance.now();let server,browser,page,cdp,exited=false,exitCode=null;
 const initialReceiptRetained=JSON.parse(readFileSync(host.file,'utf8')).phase==='before_attachment';
 host.checkpoint('case_start',{case:name});host.state.case=name;
 try{
  await host.run('launch',async()=>{
   server=await chromium.launchServer({headless:true,timeout:4000});const process=server.process();process.once('exit',value=>{exited=true;exitCode=value;});
   host.addStop('browser_process',async()=>{
    if(!exited){const closed=server.close();let timer;try{await Promise.race([closed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('close_deadline')),500);})]);}catch{await server.kill();}finally{clearTimeout(timer);}}
    return {verified:exited,exitCode};
   });
   browser=await chromium.connect(server.wsEndpoint(),{timeout:1000});page=await browser.newPage();await page.route('**/*',route=>route.abort());await page.setContent('<!doctype html><title>Synthetic collector</title><button>Refresh</button>');
   cdp=await page.context().newCDPSession(page);await cdp.send('Runtime.enable');
   host.addStop('cdp',async()=>{try{await cdp.detach();return {verified:true};}catch{return {verified:page.isClosed(),targetClosed:page.isClosed(),detachmentVerified:false};}});
  },5000);
  host.state.browser={version:browser.version(),node:process.version,platform:process.platform,arch:process.arch};host.checkpoint('attached_synthetic_target');
  if(name==='normal'){const sample=await host.run('capture',()=>page.evaluate(()=>({kind:'synthetic',count:1})),500);host.state.capture={available:true,sample};host.primary('PASS','normal_completion');}
  if(name==='assertion'){try{assert.equal(1,2,'intentional synthetic assertion');}catch(error){host.primary('FAIL','INTENTIONAL_ASSERTION');throw error;}}
  if(name==='target-closed'){host.primary('FAIL','INTENTIONAL_TARGET_CLOSURE');await page.close();try{await host.run('capture',()=>page.evaluate(()=>1),500);}catch{host.state.capture={available:false,reason:'target_closed; browser memory not recovered'};}}
  if(name==='stalled-capture'){
   host.primary('FAIL','INTENTIONAL_STALLED_CAPTURE');
   try{await host.run('capture',()=>page.evaluate(()=>new Promise(()=>{})),250);}catch(error){assert.ok(error instanceof CollectorDeadline);host.state.capture={available:false,reason:'deadline; target stopped; browser memory not recovered'};}
  }
  if(name==='stalled-mapping'){
   host.primary('FAIL','INTENTIONAL_STALLED_MAPPING');
   try{await mapOffThread('synthetic-only',host,{stall:true,budgetMs:1000});}catch(error){assert.ok(error instanceof CollectorDeadline);host.state.capture={available:false,reason:'mapping worker terminated before capture'};}
  }
 }catch(error){host.error('case_primary',error);if(!host.state.primary)host.primary('FAIL','UNEXPECTED_HARNESS_ERROR');}
 finally{
  const one=host.finish(),two=host.finish();assert.equal(one,two,'idempotent finalization identity');await one;
  const elapsedMs=performance.now()-start;
  const primaryPreserved=host.state.primary?.reason===({normal:'normal_completion',assertion:'INTENTIONAL_ASSERTION','target-closed':'INTENTIONAL_TARGET_CLOSURE','stalled-capture':'INTENTIONAL_STALLED_CAPTURE','stalled-mapping':'INTENTIONAL_STALLED_MAPPING'})[name];
  const workers=host.state.cleanup.filter(r=>r.name.startsWith('map_worker_'));
  const faultObserved=name==='stalled-mapping'?host.state.events.some(e=>e.phase==='worker_cpu_stall_entered')&&host.state.operations.some(o=>o.phase==='map_worker'&&o.status==='deadline'):name==='stalled-capture'?host.state.operations.some(o=>o.phase==='capture'&&o.status==='deadline'):true;
  const passed=initialReceiptRetained&&primaryPreserved&&faultObserved&&host.state.pendingStopped===true&&exited&&(!browser||!browser.isConnected())&&elapsedMs<10000&&host.state.cleanup.every(r=>r.verified);
  host.state.verification={passed,initialReceiptRetained,primaryPreserved,faultObserved,browserProcessExited:exited,exitCode,browserDisconnected:!browser||!browser.isConnected(),elapsedMs,caseBudgetMs:10000,workersStopped:workers.every(r=>r.verified)};host.persist();
  outcomes.push({case:name,passed,elapsedMs});
 }
}
const summary={schema:'amm.pr324.collector-selftest.v1',identity,at:new Date().toISOString(),passed:outcomes.filter(r=>r.passed).length,failed:outcomes.filter(r=>!r.passed).length,skipped:0,outcomes,applicationAcceptance:false,productionEffects:0,providerCalls:0};
writeFileSync(path.join(dir,'collector-selftest.json'),JSON.stringify(summary,null,2),{mode:0o600});sealPackage(dir,identity);
console.log(JSON.stringify(verifyPackage(dir,identity)));
