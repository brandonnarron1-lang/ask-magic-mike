// Only new final-capture/admission behavior; no browser/SQL/collection replay.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createFinalCapture,finalCaptureCheck} from './pr324-final-capture.mjs';
import {adaptSpec,adaptObserver,adaptRunner,adaptPlaywrightModule,expectationList,classifyFinalTrial} from './pr324-samejob-adapter.mjs';
const identity={trialId:'synthetic-trial',pageId:'synthetic-page',lead:'synthetic-lead'},action='synthetic-action',expected={...identity,action};
function form(label='Complete task',version='v1',disabled=true){return {getAttribute:n=>n==='aria-label'?label:null,querySelector:s=>{
 if(s==='button[type="submit"]')return {disabled};if(s==='fieldset')return {disabled:false};
 const value=s.includes('lead_id')?identity.lead:s.includes('action_id')?action:version;return {value,defaultValue:value,getAttribute:()=>value};
}};}
const pageFor=forms=>({isClosed:()=>false,evaluate:async(fn,arg)=>{const old=globalThis.document;globalThis.document={querySelectorAll:()=>forms};try{return fn(arg);}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}}});
const host={run:async(phase,work,budget)=>{assert.equal(phase,'final_dom_capture');assert.equal(budget,1500);return work();}};
async function capture(forms=[form()]){const rows=[],fn=createFinalCapture(pageFor(forms),identity,host,row=>rows.push(structuredClone(row)));const record=await fn({action,boundary:'VERSION_ASSERTION_FAILED'});return {record,rows,fn};}
const result=()=>({status:'failed',results:[{test:'Today real task completion/stale form, paginated timeline and 200% text remain scoped',status:'failed',errorSignature:'EXPECT_TO_HAVE_VALUE'}]});
const phases=record=>({primary:{status:'FAIL',code:'V2_ASSERTION_FAILED'},versions:{rendered_V1:{lead:identity.lead,action,version:'v1'},concurrent_SQL_V2:{lead:identity.lead,action,version:'v2'},review_expected_V2:{lead:identity.lead,action,version:'v2'}},finalCapture:record});
test('actual final DOM function retains identity, ordered time, forms and unique match',async()=>{
 const {record,rows}=await capture([form(),form('Dismiss action','v1',false)]);
 assert.equal(record.status,'SUCCESS');assert.equal(record.matchCount,1);assert.equal(record.snapshot.forms.length,2);assert.equal(record.snapshot.forms[0].label,'Complete task');assert.deepEqual(record.identity,expected);
 assert.deepEqual(rows.map(r=>r.status),['UNAVAILABLE','PENDING','SUCCESS']);assert.equal(finalCaptureCheck(record,expected).status,'PASS');
 const v=classifyFinalTrial(result(),phases(record),expected);assert.equal(v.classification,'ORIGINAL_FAILURE_REPRODUCED');assert.equal(v.selection.matchCount,1);assert.equal(v.finalCaptureAdmission.status,'PASS');
});
test('successful empty capture is observed absence, not failed or missing data',async()=>{
 const {record}=await capture([]);assert.equal(record.status,'SUCCESS');assert.deepEqual(record.snapshot.forms,[]);assert.equal(record.matchCount,0);assert.equal(finalCaptureCheck(record,expected).status,'PASS');
 const v=classifyFinalTrial(result(),phases(record),expected);assert.equal(v.classification,'OTHER_FAILURE');assert.equal(v.reason,'COMPLETE_TASK_FORM_MISSING');
});
test('closed target is unavailable and never supplies a fabricated empty array',async()=>{
 let called=false;const fn=createFinalCapture({isClosed:()=>true,evaluate:()=>{called=true;}},identity,host,()=>{}),r=await fn({action,boundary:'VERSION_ASSERTION_FAILED'});
 assert.equal(called,false);assert.equal(r.status,'UNAVAILABLE');assert.equal(r.reason,'PAGE_CLOSED');assert.equal(Object.hasOwn(r,'snapshot'),false);
 assert.equal(classifyFinalTrial(result(),phases(r),expected).reason,'FINAL_CAPTURE_UNAVAILABLE');
});
test('failed/deadline capture is distinct, sanitized and non-admitting',async()=>{
 for(const error of [Error('PRIVATE_SENTINEL'),Object.assign(Error('PRIVATE_SENTINEL'),{code:'COLLECTOR_DEADLINE'})]){
  const fn=createFinalCapture(pageFor([]),identity,{run:async()=>{throw error;}},()=>{}),r=await fn({action,boundary:'VERSION_ASSERTION_FAILED'});
  assert.equal(r.status,'FAILED');assert.equal(Object.hasOwn(r,'snapshot'),false);assert.ok(!JSON.stringify(r).includes('PRIVATE_SENTINEL'));assert.equal(classifyFinalTrial(result(),phases(r),expected).reason,'FINAL_CAPTURE_FAILED');
 }
});
test('capture is first-boundary idempotent and cannot silently refresh during teardown',async()=>{
 let calls=0;const page=pageFor([form()]),evaluate=page.evaluate;page.evaluate=(...args)=>{calls++;return evaluate(...args);};
 const fn=createFinalCapture(page,identity,host,()=>{}),first=await fn({action,boundary:'VERSION_ASSERTION_FAILED'}),later=await fn({action:'other',boundary:'OTHER_CASE6_FAILURE'});
 assert.equal(first,later);assert.equal(calls,1);assert.equal(later.identity.action,action);assert.equal(later.boundary,'VERSION_ASSERTION_FAILED');
});
test('missing action, malformed capture and metadata-only success cannot admit',async()=>{
 const fn=createFinalCapture(pageFor([form()]),identity,host,()=>{}),missing=await fn({boundary:'OTHER_CASE6_FAILURE'});assert.equal(missing.status,'UNAVAILABLE');assert.equal(missing.reason,'CAPTURE_IDENTITY_MISSING');
 const bad=createFinalCapture({isClosed:()=>false,evaluate:async()=>undefined},identity,host,()=>{}),r=await bad({action,boundary:'VERSION_ASSERTION_FAILED'});assert.equal(r.status,'FAILED');assert.equal(r.reason,'FINAL_CAPTURE_SHAPE');
 const {record}=await capture();for(const change of [{snapshot:undefined},{identity:{...expected,pageId:'other'}},{requestedAt:new Date(record.snapshot.at+10000).toISOString()}])assert.equal(finalCaptureCheck({...record,...change},expected).status,'FAIL');
 assert.equal(classifyFinalTrial(result(),phases(null),expected).reason,'FINAL_CAPTURE_MISSING');
});
test('latest V2, duplicate targets and wrong boundary cannot reuse stale observation',async()=>{
 for(const [forms,reason] of [[[form('Complete task','v2',false)],'COMPLETION_NOT_RECORDED_V1'],[[form(),form()],'COMPLETE_TASK_FORM_AMBIGUOUS']]){
  const {record}=await capture(forms);assert.equal(classifyFinalTrial(result(),phases(record),expected).reason,reason);
 }
 const {record}=await capture();assert.equal(classifyFinalTrial(result(),phases({...record,boundary:'OTHER_CASE6_FAILURE'}),expected).reason,'FINAL_CAPTURE_WRONG_BOUNDARY');
 const passed=result();passed.results[0].status='passed';assert.equal(classifyFinalTrial(passed,phases(null),expected).classification,'ORIGINAL_FAILURE_NOT_REPRODUCED');
});
test('new adapter capture is after unchanged assertion, before rethrow/teardown, source-only',()=>{
 const get=file=>execFileSync('git',['show','a5021cc6dc66ab26420d1127554e66c022a08670:'+file],{encoding:'utf8'});
 const original=get('tests/e2e/reference-real-session.spec.ts'),adapted=adaptSpec(original);assert.deepEqual(expectationList(adapted),expectationList(original));assert.equal(expectationList(original).length,208);
 assert.match(adapted,/samePrimary\("FAIL","V2_ASSERTION_FAILED"\); await observation.captureFinal\?\.\("VERSION_ASSERTION_FAILED"\)\.catch\(\(\)=>\{\}\); throw error;/);
 assert.ok(adaptObserver(get('tests/support/stale-review-diagnostic.ts')).includes('captureFinal: attached.captureFinal'));assert.ok(adaptRunner(get('scripts/amm/reference-session-acceptance.mjs')).includes('AMM_DIAGNOSTIC_TRIAL_ID:process.env.AMM_DIAGNOSTIC_TRIAL_ID'));
 for(const name of ['pr324-samejob-runtime','pr324-final-capture']){
  const body=adaptPlaywrightModule(name,readFileSync('scripts/amm/'+name+'.mjs','utf8'));
  const parsed=ts.transpileModule(body,{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});assert.equal(parsed.diagnostics.length,0);
  if(name==='pr324-samejob-runtime')assert.ok(body.includes('./pr324-final-capture.ts'));
 }
});
