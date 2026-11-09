// Pure JSON classifier regressions only. No browser, SQL, collection or app run.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {classifyTrial,classifyTrialDetails,completionSnapshot,formSnapshotEvidence} from './pr324-samejob-adapter.mjs';
const result=(status='failed',errorSignature='EXPECT_TO_HAVE_VALUE')=>({status:'failed',results:[{test:'Today real task completion/stale form, paginated timeline and 200% text remain scoped',status,errorSignature}]});
const phases=()=>({primary:{status:'FAIL',code:'V2_ASSERTION_FAILED'},versions:{rendered_V1:{lead:'lead-a',action:'action-a',version:'v1'},concurrent_SQL_V2:{lead:'lead-a',action:'action-a',version:'v2'},review_expected_V2:{lead:'lead-a',action:'action-a',version:'v2'}}});
const form=(overrides={})=>({label:'Complete task',lead:'lead-a',action:'action-a',value:'v1',submitDisabled:true,...overrides});
const dismiss=(overrides={})=>form({label:'Dismiss action',submitDisabled:false,...overrides});
const frame=(forms,at=100)=>({at,trigger:'mutation',forms});
const classify=(dom,p=phases(),r=result())=>classifyTrialDetails(r,p,dom);
const rejects=(dom,reason,p=phases(),r=result())=>{const v=classify(dom,p,r);assert.notEqual(v.classification,'ORIGINAL_FAILURE_REPRODUCED');assert.equal(v.reason,reason);return v;};

test('selects unique Complete task independent of same-record sibling order',()=>{
 for(const forms of [[form(),dismiss()],[dismiss(),form()],[dismiss(),form(),dismiss({label:'Snooze 24 hours'})]]){
  const v=classify([frame(forms)]);assert.equal(v.classification,'ORIGINAL_FAILURE_REPRODUCED');assert.equal(v.selection.matchCount,1);assert.equal(v.selection.form.label,'Complete task');
  assert.equal(classifyTrial(result(),phases(),[frame(forms)]),v.classification);
 }
});
test('never selects a fenced V1 sibling instead of a current V2 completion',()=>{
 for(const forms of [[form({value:'v2',submitDisabled:false}),dismiss({submitDisabled:true})],[dismiss({submitDisabled:true}),form({value:'v2',submitDisabled:false})]])rejects([frame(forms)],'COMPLETION_NOT_RECORDED_V1');
});
test('dismiss-only or wrong exact label cannot reproduce completion failure',()=>{
 for(const forms of [[dismiss()],[form({label:'complete task'})],[form({label:'Complete task '})]])rejects([frame(forms)],'COMPLETE_TASK_LABEL_MISMATCH');
});
test('missing label/lead/action fails closed rather than inventing identity',()=>{
 for(const field of ['label','lead','action'])for(const value of [undefined,null,'','   '])rejects([frame([form({[field]:value})])],'SNAPSHOT_FORM_IDENTITY_MISSING');
});
test('wrong completion identity cannot select another lead or task',()=>{
 for(const change of [{lead:'other'},{action:'other'}])rejects([frame([form(change)])],'COMPLETE_TASK_IDENTITY_MISMATCH');
});
test('two exact completion forms in one snapshot are ambiguous regardless of values',()=>{
 for(const forms of [[form(),form()],[form(),form({value:'v2',submitDisabled:false})],[form({value:'v2',submitDisabled:false}),form()]]){
  const v=rejects([frame(forms)],'COMPLETE_TASK_FORM_AMBIGUOUS');assert.equal(v.selection.matchCount,2);
 }
});
test('repeated observations are not duplicate forms across snapshot boundaries',()=>{
 const v=classify([frame([form()],100),frame([form(),dismiss()],200)]);assert.equal(v.classification,'ORIGINAL_FAILURE_REPRODUCED');assert.equal(v.selection.snapshotIndex,1);assert.equal(v.selection.matchCount,1);
});
test('newer V2/absence/ambiguity never falls back to older stale observation',()=>{
 const earlier=frame([form()],100);
 rejects([earlier,frame([form({value:'v2',submitDisabled:false})],200)],'COMPLETION_NOT_RECORDED_V1');
 rejects([earlier,frame([],200)],'COMPLETE_TASK_FORM_MISSING');
 rejects([earlier,frame([dismiss()],200)],'COMPLETE_TASK_LABEL_MISMATCH');
 rejects([earlier,frame([form(),form()],200)],'COMPLETE_TASK_FORM_AMBIGUOUS');
});
test('missing, invalid or unordered snapshot context is non-admitting',()=>{
 assert.equal(completionSnapshot([frame([form()])],null).reason,'COMPLETION_RECORD_IDENTITY_MISSING');
 for(const dom of [undefined,[],[{at:100,trigger:'client_note'}]])rejects(dom,'SNAPSHOT_CONTEXT_MISSING');
 for(const dom of [[{forms:[form()]}],[{at:100,forms:[form()]}],[{at:100,trigger:'mutation',forms:null}],[null],[frame([form()]),{at:200,trigger:'mutation',forms:undefined}]])rejects(dom,'SNAPSHOT_CONTEXT_INVALID');
 rejects([frame([form()],200),frame([form()],100)],'SNAPSHOT_ORDER_INVALID');
 assert.equal(completionSnapshot([frame([form()]),{at:200,trigger:'form_effect'}],{label:'Complete task',lead:'lead-a',action:'action-a'}).snapshotIndex,0);
});
test('bounded evidence export preserves a latest empty or ambiguous snapshot',()=>{
 const input=[frame([form()],100),frame([form()],200),frame([form()],300),frame([],400),{at:500,trigger:'form_effect'}];
 const value=formSnapshotEvidence(input);assert.equal(value.forms.length,3);assert.deepEqual(value.forms.at(-1).forms,[]);assert.equal(value.snapshotContext.omittedEarlier,1);assert.equal(value.snapshotContext.latestIncluded,true);assert.equal(value.snapshotContext.emptySnapshotsRetained,true);
 rejects(value.forms,'COMPLETE_TASK_FORM_MISSING');
 const ambiguous=formSnapshotEvidence([...input,frame([form(),form()],600)]);rejects(ambiguous.forms,'COMPLETE_TASK_FORM_AMBIGUOUS');
 assert.deepEqual(formSnapshotEvidence([]).forms,[]);assert.equal(formSnapshotEvidence([]).snapshotContext.latestIncluded,false);
});
test('legacy nonempty-only export cannot distinguish a later target disappearance',()=>{
 const recorded=[frame([form(),dismiss()],100)],withLaterAbsence=[...recorded,frame([],200)];
 const legacyExport=dom=>dom.filter(event=>event.forms?.length).slice(-3);
 assert.deepEqual(legacyExport(recorded),legacyExport(withLaterAbsence));
 assert.equal(classify(recorded).classification,'ORIGINAL_FAILURE_REPRODUCED');
 assert.equal(classify(withLaterAbsence).reason,'COMPLETE_TASK_FORM_MISSING');
});
test('all recorded SQL/expected/form identities must exist and correlate',()=>{
 for(const stage of ['rendered_V1','concurrent_SQL_V2','review_expected_V2'])for(const field of ['lead','action']){
  const missing=phases();delete missing.versions[stage][field];rejects([frame([form()])],'COMPLETION_RECORD_IDENTITY_MISSING',missing);
  const wrong=phases();wrong.versions[stage][field]='other';rejects([frame([form()])],'COMPLETION_RECORD_IDENTITY_MISMATCH',wrong);
 }
});
test('unique identity alone cannot replace unchanged/missing/conflicting version proof',()=>{
 for(const stage of ['rendered_V1','concurrent_SQL_V2','review_expected_V2']){const p=phases();delete p.versions[stage].version;rejects([frame([form()])],'VERSION_EVIDENCE_MISSING',p);}
 const unchanged=phases();unchanged.versions.concurrent_SQL_V2.version='v1';unchanged.versions.review_expected_V2.version='v1';rejects([frame([form()])],'VERSION_CORRELATION_FAILED',unchanged);
 const mismatch=phases();mismatch.versions.review_expected_V2.version='v3';rejects([frame([form()])],'VERSION_CORRELATION_FAILED',mismatch);
 rejects([frame([form({value:'v0'})])],'COMPLETION_NOT_RECORDED_V1');rejects([frame([form({submitDisabled:false})])],'COMPLETION_NOT_DISABLED');
});
test('actual failure marker/assertion/status is independently required',()=>{
 const p=phases();p.primary.code='OTHER_CASE6_FAILURE';rejects([frame([form()])],'ORIGINAL_VERSION_ASSERTION_NOT_PROVEN',p);
 rejects([frame([form()])],'ORIGINAL_VERSION_ASSERTION_NOT_PROVEN',phases(),result('failed','OTHER_FAILURE'));
 assert.equal(classify([frame([form()])],phases(),result('passed',null)).classification,'ORIGINAL_FAILURE_NOT_REPRODUCED');
 for(const status of ['skipped','interrupted'])assert.equal(classify([],phases(),result(status,null)).classification,'ORIGINAL_CASE_NOT_EXECUTED');
 for(const r of [result('timedOut',null),result('failed','TEST_TIMEOUT_60000')])assert.equal(classify([],phases(),r).classification,'DIFFERENT_TIMEOUT');
 assert.equal(classify([],phases(),{status:'failed',results:[]}).classification,'TRIAL_EVIDENCE_MISSING');
 assert.equal(classify([],phases(),{status:'missing',results:[]}).classification,'TRIAL_EVIDENCE_MISSING');
 assert.equal(classify([],phases(),{status:'failed',results:[],globalErrors:[{signature:'ESM_EXPORTS_UNDEFINED'}]}).classification,'HARNESS_STARTUP_FAILURE');
 assert.equal(classify([],phases(),{results:[{test:'different case',status:'failed'}]}).reason,'ORIGINAL_CASE_MISSING');
 assert.equal(classify([],phases(),{results:[...result().results,...result().results]}).reason,'ORIGINAL_CASE_AMBIGUOUS');
});
