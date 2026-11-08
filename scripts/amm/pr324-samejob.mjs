// One already-authorized Linux job; ephemeral compiled bytes NEVER exported/cached.
import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,statSync,statfsSync,copyFileSync,chmodSync,existsSync,openSync,closeSync,rmSync} from 'node:fs';
import path from 'node:path';
import {sealDiagnostic} from './pr324-samejob-package.mjs';
const appHead='a5021cc6dc66ab26420d1127554e66c022a08670',appTree='6c7e37a288b14b385cc6bb2a11b7496884908081';
const action=process.argv[2],root=path.resolve(process.argv[3]||'frozen-baseline'),out=path.resolve('output/pr324-samejob');
const hash=v=>createHash('sha256').update(v).digest('hex'),git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
const identity={controller:process.env.GITHUB_SHA,controllerTree:git(process.cwd(),'rev-parse','HEAD^{tree}'),application:appHead,applicationTree:appTree,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT};
if(process.platform!=='linux'||process.env.GITHUB_ACTIONS!=='true'||process.env.DATABASE_URL||process.env.VERCEL_ENV||process.env.PREVIEW_URL||git(process.cwd(),'rev-parse','HEAD')!==identity.controller||git(root,'rev-parse','HEAD')!==appHead||git(root,'rev-parse','HEAD^{tree}')!==appTree)throw Error('clean_exact_linux_baseline_required');
const file=name=>path.join(out,`diagnostic-${name}.json`),load=name=>JSON.parse(readFileSync(file(name),'utf8'));
function save(name,value){writeFileSync(file(name),JSON.stringify({schema:`amm.pr324.samejob-${name}.v1`,identity,...value}),{mode:0o600});}
function phase(pending,details={}){const v=load('phases');v.pending=pending;v.at=new Date().toISOString();v.events.push({pending,at:v.at,...details});save('phases',v);}
function disk(){const s=statfsSync(root);return {available:Number(s.bavail)*Number(s.bsize),blockSize:Number(s.bsize)};}
const GiB=1024**3,copyLimit=256*1024**2;
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(path.join(d,f.name)):[path.join(d,f.name)]);
function buildFiles(){
 const base=path.join(root,'.next'),files=[...walk(path.join(base,'static')),...walk(path.join(base,'server')),...readdirSync(base).filter(n=>n==='BUILD_ID'||n.endsWith('.json')).map(n=>path.join(base,n))].sort();
 return files.map(f=>[path.relative(root,f),hash(readFileSync(f)),statSync(f).size]);
}
function copyAndCheck(manifest,dest){
 mkdirSync(dest,{mode:0o700});for(const [name] of manifest){const target=path.join(dest,name);mkdirSync(path.dirname(target),{recursive:true,mode:0o700});copyFileSync(path.join(root,name),target);chmodSync(target,0o400);}
 const readback=walk(dest).sort().map(f=>[path.relative(dest,f),hash(readFileSync(f)),statSync(f).size]);
 if(JSON.stringify(readback)!==JSON.stringify(manifest))throw Error('samejob_copy_integrity_failed');
 return {status:'PASS',mode:(statSync(dest).mode&511).toString(8),files:readback.length,manifestSha256:hash(JSON.stringify(readback))};
}
function containerRows(){return execFileSync('docker',['ps','-a','--filter','label=com.askmagicmike.purpose=qa-audit-isolated','--format','{{.ID}} {{.Names}}'],{encoding:'utf8'}).trim().split('\n').filter(Boolean).map(line=>{const [id,name]=line.split(' ');return {id,name};});}
function processes(){const rows=[];for(const id of readdirSync('/proc').filter(n=>/^\d+$/.test(n))){try{const text=readFileSync(`/proc/${id}/stat`,'utf8'),at=text.lastIndexOf(')'),bits=text.slice(at+2).split(' ');rows.push({pid:Number(id),parent:Number(bits[1]),state:bits[0],started:bits[19]});}catch{}}return rows;}
function descendants(pid){const rows=processes(),ids=new Set([pid]);let changed=true;while(changed){changed=false;for(const row of rows)if(ids.has(row.parent)&&!ids.has(row.pid)){ids.add(row.pid);changed=true;}}return rows.filter(r=>ids.has(r.pid));}
const readJson=(p,fallback)=>{try{return JSON.parse(readFileSync(p,'utf8'));}catch{return fallback;}};
const jsonl=p=>{try{return readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));}catch{return [];}};

if(action==='preflight'){
 mkdirSync(out,{recursive:true,mode:0o700});const capacity=disk(),required=3*GiB+2*copyLimit+GiB+2*GiB;
 save('source',{status:'NOT RUN',at:new Date().toISOString(),controller:{head:identity.controller,tree:identity.controllerTree},application:{head:appHead,tree:appTree,kind:'RECONSTRUCTED, existing a502 app/wire observers; not original lost compilation'},build:null,durableCompiledRetention:'NOT ESTABLISHED',policy:{offRunnerCompilationRetentionRequired:false,releaseReceiptRetentionIsSeparate:true,ownerMethod:'current same-job instruction'},admission:{standardPublicUbuntu:true,permission:'contents:read; no provider credentials',sanitizedAllowance:'existing owner-authorized JSON evidence channel;200KiB hard export cap/7days, no compiled uploads',capacity:{...capacity,required,copyLimit,buildScratch:3*GiB,testScratch:GiB,reserve:2*GiB}},deadline:new Date(Date.now()+12*60*1000).toISOString()});
 save('integrity',{status:'NOT RUN',files:[],sameJobOnly:true,durableCompiledRetention:'NOT ESTABLISHED',trials:[]});
 save('phases',{status:'IN_PROGRESS',pending:'preflight',events:[]});save('trials',{status:'NOT RUN',trials:[]});save('observations',{status:'NOT RUN',trials:[]});save('cleanup',{status:'NOT RUN',trials:[]});
 if(capacity.available<required)throw Error('runner_capacity_not_admitted');phase('before_install');
}else if(action==='checkpoint'){
 phase(process.argv[4]||'before_build',{disk:disk()});
 if(disk().available<3*GiB+2*copyLimit+GiB+2*GiB)throw Error('runner_capacity_not_admitted');
}else if(action==='finalize'){
 const v=load('phases');v.status='COMPLETE';v.lastPending=v.pending;v.pending=null;save('phases',v);console.log(JSON.stringify(sealDiagnostic(out,identity)));
}else if(action==='run'){
 phase('seal_compiled_build');
 const source=load('source'),manifest=buildFiles(),manifestHash=hash(JSON.stringify(manifest));
 if(manifest.reduce((n,r)=>n+r[2],0)>copyLimit)throw Error('compiled_copy_byte_limit');
 if(disk().available<2*copyLimit+GiB+2*GiB)throw Error('runner_copy_headroom_failed');
 const temp=path.join(process.env.RUNNER_TEMP,`amm-pr324-samejob-${identity.runId}-${identity.attempt}`);mkdirSync(temp,{mode:0o700});
 try{
 const sealed=copyAndCheck(manifest,path.join(temp,'sealed')),readback=copyAndCheck(manifest,path.join(temp,'readback'));
 const require=createRequire(path.join(root,'package.json')),packages=Object.fromEntries(['next','react','react-dom','@playwright/test'].map(n=>[n,JSON.parse(readFileSync(require.resolve(n+'/package.json'),'utf8')).version]));
 const {chromium}=require('@playwright/test');const browserVersion=execFileSync(chromium.executablePath(),['--version'],{encoding:'utf8'}).trim();
 const framework={};for(const flavor of ['client','esm/client'])for(const name of ['router-reducer/fetch-server-response.js','router-reducer/reducers/refresh-reducer.js','app-router-instance.js']){const rel=`node_modules/next/dist/${flavor}/components/${name}`,body=readFileSync(path.join(root,rel));if(body.includes('__ammStaleForm'))throw Error('framework_patch_forbidden');framework[rel]=hash(body);}
 if(packages.next!=='15.5.26'||packages.react!=='19.2.6'||packages['@playwright/test']!=='1.60.0'||hash(readFileSync(path.join(root,'pnpm-lock.yaml')))!=='ddb18027b6d7e1a46b619675c6a69e0b06c827d1bfb7170e05f85c456f76600f')throw Error('recorded_baseline_dependencies_required');
 Object.assign(source,{status:'PASS',build:{id:readFileSync(path.join(root,'.next/BUILD_ID'),'utf8').trim(),manifestSha256:manifestHash},packages,browserVersion,node:process.version,platform:process.platform,arch:process.arch,runner:readFileSync('/etc/os-release','utf8').split('\n').find(l=>l.startsWith('PRETTY_NAME=')),lockSha256:hash(readFileSync(path.join(root,'pnpm-lock.yaml'))),framework,runtime:{AMM_STALE_REVIEW_DIAGNOSTIC:'1',AMM_E2E_BUILT:'1',DATABASE_ENV:'fresh owned Docker PostgreSQL17/loopback',externalFetch:'blocked',providerSends:false,fixtureIdentities:'fresh equivalent random synthetic identities/ports each trial',baselineNewCDPLayer:false}});save('source',source);
 save('integrity',{status:'PASS',files:manifest,manifestSha256:manifestHash,sealedCopy:sealed,separateReadback:readback,sameJobOnly:true,durableCompiledRetention:'NOT ESTABLISHED',trials:[]});
 const {adaptSpec,adaptObserver,adaptRunner,expectationList,classifyTrial}=await import('./pr324-samejob-adapter.mjs');
 const spec=path.join(root,'tests/e2e/reference-real-session.spec.ts'),original=readFileSync(spec,'utf8');writeFileSync(spec,adaptSpec(original));
 const helper=path.join(root,'tests/support/stale-review-diagnostic.ts');writeFileSync(helper,adaptObserver(readFileSync(helper,'utf8')));
 const runner=path.join(root,'scripts/amm/reference-session-acceptance.mjs');writeFileSync(runner,adaptRunner(readFileSync(runner,'utf8')));
 for(const name of ['pr324-samejob-runtime.mjs','pr324-samejob-reporter.mjs','pr324-frozen-logpoints.mjs','pr324-collector-runtime.mjs','pr324-collector-worker.mjs'])copyFileSync(path.resolve('scripts/amm',name),path.join(root,'tests/support',name));
 copyFileSync(path.resolve('scripts/amm/pr324-samejob-validation.spec.ts'),path.join(root,'tests/e2e/pr324-samejob-validation.spec.ts'));
 source.adapter={expectations:expectationList(original).length,preserved:true,phaseRecords:'Node-only API-phase checkpoints; not assumed timing-neutral',closedCollectorReused:'162eee2f core files, not rerun standalone selftests'};save('source',source);

 async function trial(mode){
  if(Date.parse(source.deadline)-Date.now()<210000){phase('stop_job_time_admission');return null;}
  phase('trial_'+mode);const before=buildFiles();if(JSON.stringify(before)!==JSON.stringify(manifest))throw Error('pre_trial_build_drift');
  const dir=path.join(root,'.amm-run',`samejob-${mode}`);mkdirSync(dir,{recursive:true,mode:0o700});const beforeContainers=containerRows(),tracked=new Map();
  const stdout=openSync(path.join(dir,'private-process.log'),'w',0o600);
  const child=spawn(process.execPath,['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','scripts/amm/reference-session-acceptance.mjs'],{cwd:root,detached:true,env:{PATH:process.env.PATH,HOME:process.env.HOME,CI:'true',GITHUB_SHA:appHead,AMM_QA_POSTGRES_TEST:'1',AMM_STALE_REVIEW_DIAGNOSTIC:'1',AMM_SESSION_ARTIFACT_DIR:`.amm-run/samejob-${mode}`,AMM_SAME_JOB_MODE:mode,AMM_FROZEN_MODE:mode==='validation'||mode==='probe'?'probe':'control',AMM_COLLECTOR_CONTROLLER_HEAD:identity.controller},stdio:['ignore',stdout,stdout]});
  let monitorCount=0,monitorMs=0;
  const track=()=>{const start=performance.now();for(const p of descendants(child.pid))tracked.set(p.pid,p);monitorCount++;monitorMs+=performance.now()-start;};track();const interval=setInterval(track,1000);
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;track();try{process.kill(-child.pid,'SIGTERM');}catch{}},180000);
  const forced=setTimeout(()=>{track();try{process.kill(-child.pid,'SIGKILL');}catch{}},185000);
  const exit=await new Promise(resolve=>{child.once('error',()=>resolve(null));child.once('exit',resolve);});clearInterval(interval);clearTimeout(timer);clearTimeout(forced);closeSync(stdout);
  for(const row of [...tracked.values()].reverse()){const current=processes().find(p=>p.pid===row.pid&&p.started===row.started&&p.state!=='Z');if(current)try{process.kill(row.pid,'SIGKILL');}catch{}}
  let remaining=processes().filter(p=>tracked.get(p.pid)?.started===p.started&&p.state!=='Z');
  const reapDeadline=Date.now()+1000;while(remaining.length&&Date.now()<reapDeadline){await new Promise(resolve=>setTimeout(resolve,25));remaining=processes().filter(p=>tracked.get(p.pid)?.started===p.started&&p.state!=='Z');}
  const newContainers=containerRows().filter(r=>!beforeContainers.some(b=>b.id===r.id));
  for(const item of newContainers){if(!/^amm-qa-audit-[0-9a-f-]{36}$/.test(item.name))throw Error('unknown_task_container');execFileSync('docker',['rm','-f','-v',item.id],{stdio:'ignore'});}
  const containersAfter=containerRows().filter(r=>!beforeContainers.some(b=>b.id===r.id));
  const cleanup=load('cleanup');cleanup.trials.push({mode,status:remaining.length===0&&containersAfter.length===0?'PASS':'FAIL',trackedProcessCount:tracked.size,runningTaskProcessesRemaining:remaining.map(p=>p.pid),taskContainersRemaining:containersAfter,exactFallbackContainerRemovals:newContainers,monitor:{count:monitorCount,totalMs:monitorMs,limitation:'same host-only process metadata footprint across trials; not assumed neutral'}});cleanup.status=cleanup.trials.every(t=>t.status==='PASS')?'PASS':'FAIL';save('cleanup',cleanup);
  if(cleanup.status!=='PASS')throw Error('task_cleanup_failed');
  const after=buildFiles(),integrity=load('integrity'),frameworkUnchanged=Object.entries(framework).every(([f,digest])=>hash(readFileSync(path.join(root,f)))===digest);
  integrity.trials.push({mode,beforeSha256:hash(JSON.stringify(before)),afterSha256:hash(JSON.stringify(after)),unchanged:JSON.stringify(after)===JSON.stringify(manifest),frameworkUnchanged});save('integrity',integrity);if(JSON.stringify(after)!==JSON.stringify(manifest)||!frameworkUnchanged||hash(readFileSync(path.join(root,'pnpm-lock.yaml')))!==source.lockSha256)throw Error('post_trial_build_drift');
  const result=readJson(path.join(dir,'samejob-result.json'),{status:'missing',results:[]}),phases=readJson(path.join(dir,'samejob-phases.json'),{}),dom=readJson(path.join(dir,'stale-review-dom.json'),[]),host=readJson(path.join(dir,'samejob-host.json'),null),collector=readJson(path.join(dir,'frozen-logpoints.json'),null);
  const classification=mode==='validation'?'VALIDATION':timedOut?'DIFFERENT_TIMEOUT':classifyTrial(result,phases,dom);
  const harness=readJson(path.join(dir,'receipt.json'),null);
  const collectorHealthy=host?.finished===true&&host?.pendingStopped===true&&host.errors.length===0&&(mode==='baseline'||collector?.finished===true&&collector?.pendingStopped===true&&collector.errors.length===0&&collector.unresolved.length===0&&collector.pauses.length===0);
  const row={mode,exit,timedOut,result,classification,phases,safety:harness?{productionWrites:harness.productionWrites,providerCalls:harness.providerCalls,counts:harness.counts}:null,collectorHealthy,host:host?{finished:host.finished,pendingStopped:host.pendingStopped,primary:host.primary,errors:host.errors,cleanup:host.cleanup}:null};
  const trials=load('trials');trials.trials.push(row);trials.status='COMPLETE';save('trials',trials);
  const log=jsonl(path.join(dir,'stale-review-test.jsonl'));
  const notes=log.filter(x=>['rendered_V1','concurrent_SQL_V2','review_expected_V2','request','response_headers','request_failed'].includes(x.stage)).slice(-20);
  const writes=jsonl(path.join(dir,'stale-review-server-write.jsonl')).filter(x=>x.request?.path==='/admin/today'&&x.fields?.some(f=>f.lead_id===phases.versions?.rendered_V1?.lead)).slice(-3);
  const compactCollector=collector?{mode:collector.mode,build:collector.build,maps:collector.maps,unresolved:collector.unresolved,pauses:collector.pauses,network:collector.network,captures:collector.captures,primary:collector.primary,errors:collector.errors,finished:collector.finished,pendingStopped:collector.pendingStopped,detach:collector.detach,omittedHostBookkeeping:true}:null;
  const observations=load('observations');observations.trials.push({mode,notes,writes,forms:dom.filter(e=>e.forms?.length).slice(-3),collector:compactCollector});observations.status='COMPLETE';save('observations',observations);
  if(result.status==='missing'||phases.pending&&!host)throw Error('mandatory_trial_evidence_missing');
  console.log(JSON.stringify({mode,classification,counts:{passed:result.results.filter(r=>r.status==='passed').length,failed:result.results.filter(r=>['failed','timedOut'].includes(r.status)).length,notRun:result.results.filter(r=>r.status==='skipped').length},cleanup:'PASS',hashes:'PASS'}));return {...row,collector};
 }
 const baseline=await trial('baseline');
 if(baseline?.classification==='ORIGINAL_FAILURE_REPRODUCED'&&baseline.collectorHealthy){
  const validation=await trial('validation'),collector=validation?.collector;
  const captures=collector?.captures?.map(c=>c.snapshot).filter(Boolean)||[];
  const hits=captures.flatMap(c=>c.events||[]).map(e=>e.stage);
  const mapped=collector?.maps?.flatMap(m=>m.points)||[];
  const buildMatch=collector?.maps?.every(m=>manifest.some(r=>r[0]===m.path.replace('/_next/','.next/')&&r[1]===m.sha256));
  const coverage=validation?.result.status==='passed'&&validation.collectorHealthy&&collector&&collector.pauses.length===0&&collector.unresolved.length===0&&captures.every(c=>c.errors===0&&c.overflow===0)&&['flight_root_settled','queue_before_resolve'].every(s=>hits.includes(s)&&mapped.some(p=>p.stage===s&&p.active))&&buildMatch;
  const phases=load('phases');phases.probeValidation={status:coverage?'PASS':'INCONCLUSIVE',actualHits:hits,loadedBuildHashesMatch:buildMatch||false,limitations:'Scalar build/action markers; no lazy model traversal. Stream-to-request association must be evaluated, never inferred from absent unvalidated logs.'};save('phases',phases);
  if(coverage){const control=await trial('control');if(control?.classification==='ORIGINAL_FAILURE_REPRODUCED'&&control.collectorHealthy)await trial('probe');}
 }
 phase('samejob_finished',{baselineClassification:baseline?.classification||'NOT RUN'});
 // Retain only during this job. No archive, upload, cache or cross-job replay.
 }finally{rmSync(temp,{recursive:true});const cleanup=load('cleanup');cleanup.sealedAndReadbackCopiesRemoved=true;cleanup.durableCompiledRetention='NOT ESTABLISHED';save('cleanup',cleanup);}
}else throw Error('unknown_samejob_command');
