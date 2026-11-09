// Affected adapter/admission checks only; closed collector fault tests are reused.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,symlinkSync,rmSync,existsSync} from 'node:fs';import path from 'node:path';import {tmpdir} from 'node:os';
import {adaptSpec,adaptObserver,adaptRunner,adaptPlaywrightModule,playwrightModules,expectationList,classifyTrial,trialEvidenceIssue,ownedProcessRows} from './pr324-samejob-adapter.mjs';
import Reporter from './pr324-samejob-reporter.mjs';
import {required,sealDiagnostic,verifyDiagnostic} from './pr324-samejob-package.mjs';
import ts from 'typescript';
import {writeCollection,assertOutcomes,packageCollection,verifyCollection} from './pr324-collection-evidence.mjs';
const get=file=>execFileSync('git',['-C',existsSync('frozen-baseline/.git')?'frozen-baseline':'.','show',`a5021cc6dc66ab26420d1127554e66c022a08670:${file}`],{encoding:'utf8'});
test('exact a502 adapter preserves every original expectation and serial test',()=>{
 const source=get('tests/e2e/reference-real-session.spec.ts'),adapted=adaptSpec(source);
 assert.deepEqual(expectationList(adapted),expectationList(source));assert.equal((adapted.match(/test\("/g)||[]).length,(source.match(/test\("/g)||[]).length);
 assert.ok(adapted.includes('if(process.env.AMM_SAME_JOB_MODE!=="baseline") await observation.prepare?.()'));
 assert.ok(adapted.includes('V2_ASSERTION_FAILED'));assert.ok(adapted.includes('OTHER_CASE6_FAILURE'));
});
test('observer finalization uses recovered bounded wrapper, no premature CDP await',()=>{
 const adapted=adaptObserver(get('tests/support/stale-review-diagnostic.ts'));
 assert.ok(adapted.includes('sameFinish(attached, async () =>'));assert.ok(adapted.includes('sameStart(page, leadId)'));
});
test('runner adapter forwards controller and application separately, validation has its own suite',()=>{
 const adapted=adaptRunner(get('scripts/amm/reference-session-acceptance.mjs'));
 assert.ok(adapted.includes('AMM_COLLECTOR_CONTROLLER_HEAD:process.env.AMM_COLLECTOR_CONTROLLER_HEAD'));
 assert.ok(adapted.includes('AMM_COLLECTOR_APPLICATION_HEAD:process.env.GITHUB_SHA'));
 assert.ok(adapted.includes('pr324-samejob-validation.spec.ts'));assert.ok(adapted.includes('pr324-samejob-reporter.mjs'));
});
const result=(status='failed',errorSignature='EXPECT_TO_HAVE_VALUE')=>({results:[{test:'Today real task completion/stale form, paginated timeline and 200% text remain scoped',status,errorSignature}]});
const phases={primary:{code:'V2_ASSERTION_FAILED'},versions:{rendered_V1:{lead:'synthetic-lead',action:'synthetic-action',version:'v1'},concurrent_SQL_V2:{lead:'synthetic-lead',action:'synthetic-action',version:'v2'},review_expected_V2:{lead:'synthetic-lead',action:'synthetic-action',version:'v2'}}};
const dom=[{at:1,trigger:'review_click',forms:[{label:'Complete task',lead:'synthetic-lead',action:'synthetic-action',value:'v1',submitDisabled:true}]}];
test('classifies only correlated SQL-V2, fenced client-V1 expectation failure as original',()=>{assert.equal(classifyTrial(result(),phases,dom),'ORIGINAL_FAILURE_REPRODUCED');assert.equal(classifyTrial(result(),phases,[]),'OTHER_FAILURE');});
test('pass, different timeout and mismatched identity cannot admit the next trial',()=>{
 assert.equal(classifyTrial(result('passed',null),phases,dom),'ORIGINAL_FAILURE_NOT_REPRODUCED');
 assert.equal(classifyTrial(result('timedOut','TEST_TIMEOUT_60000'),phases,dom),'DIFFERENT_TIMEOUT');
 assert.equal(classifyTrial(result(),{...phases,versions:{...phases.versions,concurrent_SQL_V2:{...phases.versions.concurrent_SQL_V2,action:'other'}}},dom),'OTHER_FAILURE');
});
test('missing/zero/unexecuted cases are not reported as a completed application baseline',()=>{
 assert.equal(classifyTrial({status:'failed',results:[]},{},[]),'TRIAL_EVIDENCE_MISSING');
 assert.equal(trialEvidenceIssue({status:'failed',results:[]}), 'primary_startup_failure_missing');
 assert.equal(classifyTrial({status:'failed',results:[],globalErrors:[{signature:'ESM_EXPORTS_UNDEFINED'}]},{},[]),'HARNESS_STARTUP_FAILURE');
 assert.equal(classifyTrial(result('skipped',null),{},[]),'ORIGINAL_CASE_NOT_EXECUTED');
});
test('global reporter errors retain only safe signatures/digests, even with zero tests',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'amm-samejob-reporter-')),previous=process.env.AMM_SESSION_ARTIFACT_DIR;
 try{
  process.env.AMM_SESSION_ARTIFACT_DIR=dir;const reporter=new Reporter();reporter.onBegin();
  reporter.onError({message:'exports is not defined in ES module scope PRIVATE_SENTINEL'});reporter.onEnd({status:'failed'});
  const raw=readFileSync(path.join(dir,'samejob-result.json'),'utf8'),value=JSON.parse(raw);
  assert.equal(value.results.length,0);assert.equal(value.globalErrors[0].signature,'ESM_EXPORTS_UNDEFINED');assert.match(value.globalErrors[0].messageSha256,/^[a-f0-9]{64}$/);assert.ok(!raw.includes('PRIVATE_SENTINEL'));
 }finally{if(previous===undefined)delete process.env.AMM_SESSION_ARTIFACT_DIR;else process.env.AMM_SESSION_ARTIFACT_DIR=previous;rmSync(dir,{recursive:true});}
});
test('cleanup discovers an unobserved orphan in the task session and excludes PID reuse/unrelated groups',()=>{
 const root={pid:100,parent:1,group:100,session:100,state:'S',started:'1'},tracked=new Map([[100,root]]);
 const orphan={pid:101,parent:1,group:100,session:100,state:'S',started:'2'},other={pid:200,parent:1,group:200,session:200,state:'S',started:'3'};
 assert.deepEqual(ownedProcessRows([orphan,other],100,tracked),[orphan]);
 assert.deepEqual(ownedProcessRows([{...root,started:'9'},other],100,tracked),[]);
 assert.deepEqual(ownedProcessRows([{...orphan,state:'Z'},other],100,tracked),[]);
});
test('real Playwright collection reproduces the native-ESM failure and lists both adapted suites without executing hooks',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'amm-samejob-collection-')),write=(name,body)=>{const f=path.join(dir,name);mkdirSync(path.dirname(f),{recursive:true,mode:0o700});writeFileSync(f,body,{mode:0o600});};
 const output=process.env.AMM_COLLECTION_OUTPUT,identity=output?JSON.parse(process.env.AMM_COLLECTION_IDENTITY):{native:true};
 const outcome={status:'IN_PROGRESS',expected:{},negative:null,reference:null,validation:null};
 const retain=()=>{if(output)writeCollection(output,'outcomes',identity,outcome);};
 const titles=body=>{const file=ts.createSourceFile('fixture.ts',body,ts.ScriptTarget.Latest,true),rows=[];function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(file)==='test'&&ts.isStringLiteral(n.arguments[0]))rows.push(n.arguments[0].text);ts.forEachChild(n,visit);}visit(file);return rows;};
 const guarded=body=>'import {test as collectionGuard} from "@playwright/test";\nimport {writeFileSync as markCollectionHook} from "node:fs";\ncollectionGuard.beforeAll(()=>{markCollectionHook(process.env.AMM_COLLECTION_HOOK_MARKER,"HOOK_INVOKED");throw Error("COLLECTION_ONLY_HOOK_EXECUTED");});\n'+body;
 try{
  for(const name of ['package.json','playwright.config.ts','tsconfig.json'])write(name,get(name));
  symlinkSync(path.resolve('node_modules'),path.join(dir,'node_modules'),'dir');
  for(const name of ['pr324-samejob-runtime','pr324-frozen-logpoints','pr324-collector-runtime','pr324-collector-worker','pr324-final-capture'])write('tests/support/'+name+'.mjs',readFileSync('scripts/amm/'+name+'.mjs','utf8'));
  const original=get('tests/e2e/reference-real-session.spec.ts'),spec=adaptSpec(original),helper=adaptObserver(get('tests/support/stale-review-diagnostic.ts')),validationSpec=readFileSync('scripts/amm/pr324-samejob-validation.spec.ts','utf8');
  outcome.expected={reference:titles(original).map(title=>({file:'reference-real-session.spec.ts',title,project:'chromium'})),validation:titles(validationSpec).map(title=>({file:'pr324-samejob-validation.spec.ts',title,project:'chromium'}))};
  assert.deepEqual(titles(spec),titles(original));assert.deepEqual(expectationList(guarded(spec)),expectationList(original));assert.ok(spec.includes('test.describe.configure({ mode: "serial" })'));
  write('tests/e2e/reference-real-session.spec.ts',guarded(spec.replaceAll('pr324-samejob-runtime.ts','pr324-samejob-runtime.mjs')));write('tests/support/stale-review-diagnostic.ts',helper.replaceAll('pr324-samejob-runtime.ts','pr324-samejob-runtime.mjs'));
  // A preload denies Node child-process APIs before any browser/server command.
  // Source-only --list must not execute hooks; a fail-fast first hook is a sentinel.
  write('process-guard.cjs',`const fs=require('node:fs'),cp=require('node:child_process'),attempts=[];for(const n of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])cp[n]=()=>{attempts.push(n);throw Error('COLLECTION_PROCESS_SPAWN_DENIED');};require('node:module').syncBuiltinESMExports();process.on('exit',code=>fs.writeFileSync(process.env.AMM_COLLECTION_GUARD_FILE,JSON.stringify({identity:process.env.AMM_COLLECTION_CHILD_ID,childExit:code,attempts,hooksInvoked:fs.existsSync(process.env.AMM_COLLECTION_HOOK_MARKER)}),{mode:0o600}));`);
  const collect=(child,suite,mode='baseline')=>{
   const childDir=path.join(dir,child);mkdirSync(childDir,{mode:0o700});
   const result=spawnSync(process.execPath,['--require',path.join(dir,'process-guard.cjs'),path.resolve('node_modules/@playwright/test/cli.js'),'test',suite,'--list','--reporter='+path.resolve('scripts/amm/pr324-samejob-reporter.mjs')],{cwd:dir,env:{PATH:process.env.PATH,HOME:process.env.HOME,CI:'true',AMM_ISOLATED_SESSION_ACCEPTANCE:'1',AMM_SAME_JOB_MODE:mode,AMM_E2E_BUILT:'1',AMM_SESSION_ARTIFACT_DIR:childDir,AMM_COLLECTION_PREFLIGHT:'1',AMM_COLLECTION_GUARD_FILE:path.join(childDir,'guard.json'),AMM_COLLECTION_HOOK_MARKER:path.join(childDir,'hook-invoked'),AMM_COLLECTION_CHILD_ID:child},encoding:'utf8',timeout:15000,killSignal:'SIGKILL',maxBuffer:200000});
   const row={child,exit:result.status,signal:result.signal,error:result.error?.code||null,report:null,guard:null};
   for(const [field,file] of [['report','samejob-result.json'],['guard','guard.json']])try{row[field]=JSON.parse(readFileSync(path.join(childDir,file),'utf8'));}catch{row.error='REQUIRED_'+field.toUpperCase()+'_MISSING_OR_INVALID';}
   outcome[child]=row;retain();return row;
  };
  const negative=collect('negative','tests/e2e/reference-real-session.spec.ts');assert.equal(negative.exit,1);assert.equal(negative.error,null);assert.ok(negative.report.globalErrors.some(e=>e.signature==='ESM_EXPORTS_UNDEFINED'));
  write('tests/e2e/reference-real-session.spec.ts',guarded(spec));write('tests/support/stale-review-diagnostic.ts',helper);
  for(const name of playwrightModules)write('tests/support/'+name+'.ts',adaptPlaywrightModule(name,readFileSync('scripts/amm/'+name+'.mjs','utf8')));
  write('tests/e2e/pr324-samejob-validation.spec.ts',guarded(validationSpec));
  collect('reference','tests/e2e/reference-real-session.spec.ts');collect('validation','tests/e2e/pr324-samejob-validation.spec.ts','validation');
  outcome.status='PASS';assertOutcomes(outcome);retain();
 }catch(error){outcome.status='FAIL';outcome.reason='COLLECTION_ASSERTION_FAILED';retain();throw error;}
 finally{rmSync(dir,{recursive:true});if(output)writeCollection(output,'cleanup',identity,{status:existsSync(dir)?'FAIL':'PASS',at:new Date().toISOString(),scratchRemoved:!existsSync(dir),scope:'exact source-copy scratch; synchronous CLI children exited or killed on timeout; Node child-process API guard',limitation:'not an exhaustive host process inventory; native-addon/out-of-process activity outside Node child-process APIs is not independently observed'});}
});
test('collection evidence rejects absent startup proof, wrong identities, reporter errors and changed inventory',()=>{
 const negative={exit:1,signal:null,error:null,child:'negative',guard:{identity:'negative',childExit:1,attempts:[],hooksInvoked:false},report:{schema:'amm.pr324.collection-result.v1',operation:'COLLECTION_ONLY',status:'failed',results:[],executedApplicationCases:0,globalErrors:[{signature:'ESM_EXPORTS_UNDEFINED',messageSha256:'a'.repeat(64)}]}};
 const make=(child,n)=>({exit:0,signal:null,error:null,child,guard:{identity:child,childExit:0,attempts:[],hooksInvoked:false},report:{...negative.report,status:'passed',globalErrors:[],inventory:Array.from({length:n},(_,i)=>({title:i===5?'Today real task completion/stale form synthetic':'synthetic '+i}))}});
 const reference=make('reference',10),validation=make('validation',1),value={status:'PASS',negative,reference,validation,expected:{reference:reference.report.inventory,validation:validation.report.inventory}};
 assert.equal(assertOutcomes(value),true);assert.throws(()=>assertOutcomes({...value,negative:{...negative,exit:0}}));assert.throws(()=>assertOutcomes({...value,reference:{...reference,report:null}}));assert.throws(()=>assertOutcomes({...value,validation:{...validation,report:{...validation.report,inventory:[]}}}));
 const dir=mkdtempSync(path.join(tmpdir(),'amm-collection-evidence-')),identity={controller:'test',runId:'1',attempt:'1'};
 try{for(const file of ['source','outcomes','checks','cleanup'])writeCollection(dir,file,identity,{status:'NOT RUN'});assert.equal(packageCollection(dir,identity).files,5);writeFileSync(path.join(dir,'collection-outcomes.json'),'{}');assert.throws(()=>verifyCollection(dir,identity));}finally{rmSync(dir,{recursive:true});}
});
test('diagnostic inventory/schema is distinct; missing or tampered records fail closed',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'amm-samejob-unit-')),identity={controller:'synthetic-controller',runId:'1',attempt:'1'};
 try{
  for(const file of required){const kind=file.slice(11,-5);writeFileSync(path.join(dir,file),JSON.stringify({schema:`amm.pr324.samejob-${kind}.v1`,identity,status:'NOT RUN',...(kind==='source'?{controller:{head:'synthetic-controller'},application:{head:'synthetic-app'}}:{})}));}
  assert.equal(sealDiagnostic(dir,identity).files,7);assert.equal(verifyDiagnostic(dir,identity).checksums,6);
  writeFileSync(path.join(dir,'diagnostic-trials.json'),JSON.stringify({schema:'amm.pr324.samejob-trials.v1',identity,status:'COMPLETE',trials:[{result:{status:'failed',results:[]}}]}));assert.throws(()=>sealDiagnostic(dir,identity),/primary_startup_failure_missing/);
  writeFileSync(path.join(dir,'diagnostic-trials.json'),JSON.stringify({schema:'amm.pr324.samejob-trials.v1',identity,status:'COMPLETE',trials:[{result:{status:'failed',results:[],globalErrors:[{signature:'ESM_EXPORTS_UNDEFINED'}]}}]}));assert.equal(sealDiagnostic(dir,identity).files,7);
  writeFileSync(path.join(dir,required[0]),'{}');assert.throws(()=>verifyDiagnostic(dir,identity));
 }finally{rmSync(dir,{recursive:true});}
});
