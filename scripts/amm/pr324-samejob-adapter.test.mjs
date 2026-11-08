// Affected adapter/admission checks only; closed collector fault tests are reused.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';import {mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';import path from 'node:path';import {tmpdir} from 'node:os';
import {adaptSpec,adaptObserver,adaptRunner,expectationList,classifyTrial} from './pr324-samejob-adapter.mjs';
import {required,sealDiagnostic,verifyDiagnostic} from './pr324-samejob-package.mjs';
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
const phases={primary:{code:'V2_ASSERTION_FAILED'},versions:{rendered_V1:{lead:'synthetic-lead',action:'synthetic-action',version:'v1'},concurrent_SQL_V2:{lead:'synthetic-lead',action:'synthetic-action',version:'v2'},review_expected_V2:{version:'v2'}}};
const dom=[{forms:[{lead:'synthetic-lead',action:'synthetic-action',value:'v1',submitDisabled:true}]}];
test('classifies only correlated SQL-V2, fenced client-V1 expectation failure as original',()=>{assert.equal(classifyTrial(result(),phases,dom),'ORIGINAL_FAILURE_REPRODUCED');assert.equal(classifyTrial(result(),phases,[]),'OTHER_FAILURE');});
test('pass, different timeout and mismatched identity cannot admit the next trial',()=>{
 assert.equal(classifyTrial(result('passed',null),phases,dom),'ORIGINAL_FAILURE_NOT_REPRODUCED');
 assert.equal(classifyTrial(result('timedOut','TEST_TIMEOUT_60000'),phases,dom),'DIFFERENT_TIMEOUT');
 assert.equal(classifyTrial(result(),{...phases,versions:{...phases.versions,concurrent_SQL_V2:{...phases.versions.concurrent_SQL_V2,action:'other'}}},dom),'OTHER_FAILURE');
});
test('diagnostic inventory/schema is distinct; missing or tampered records fail closed',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'amm-samejob-unit-')),identity={controller:'synthetic-controller',runId:'1',attempt:'1'};
 try{
  for(const file of required){const kind=file.slice(11,-5);writeFileSync(path.join(dir,file),JSON.stringify({schema:`amm.pr324.samejob-${kind}.v1`,identity,status:'NOT RUN',...(kind==='source'?{controller:{head:'synthetic-controller'},application:{head:'synthetic-app'}}:{})}));}
  assert.equal(sealDiagnostic(dir,identity).files,7);assert.equal(verifyDiagnostic(dir,identity).checksums,6);
  writeFileSync(path.join(dir,required[0]),'{}');assert.throws(()=>verifyDiagnostic(dir,identity));
 }finally{rmSync(dir,{recursive:true});}
});
