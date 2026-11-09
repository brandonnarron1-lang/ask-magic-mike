// Test/runner adapters only, applied AFTER the a502 application compilation.
import ts from 'typescript';
import {trialEvidenceIssue} from './pr324-samejob-evidence.mjs';
export {trialEvidenceIssue,ownedProcessRows} from './pr324-samejob-evidence.mjs';
export function replaceOnce(body,needle,value){if(body.split(needle).length!==2)throw Error('adapter_anchor_mismatch');return body.replace(needle,value);}
export function expectationList(body){const file=ts.createSourceFile('spec.ts',body,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),rows=[];function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(file).startsWith('expect'))rows.push(n.getText(file).replace(/\s+/g,''));ts.forEachChild(n,visit);}visit(file);return rows;}
export function adaptSpec(original){
 let body='import { samePhase, samePrimary } from "../support/pr324-samejob-runtime.ts";\n'+original;
 body=replaceOnce(body,'  const observation = await observeStaleReview(page, f.leads.agent);','  const observation = await observeStaleReview(page, f.leads.agent);\n  samePhase("case6_started");');
 for(const [needle,phase] of [
  ['  await page.goto(`/admin/leads/${f.leads.agent}`);','detail_navigation'],
  ['  await page.goto("/admin/today");\n  await expect(page.getByRole("heading", { name: "Your next step.", exact: true })).toBeVisible();','today_navigation'],
  ['  const completedActionId=await form.locator(\'input[name="action_id"]\').inputValue();','form_ready_before_v1'],
  ['  const advancedVersion = (await sql("UPDATE tasks SET updated_at=clock_timestamp()','concurrent_sql_update'],
  ['  await form.getByRole("button",{name:"Review latest record (keep draft)",exact:true}).click();','review_click'],
 ])body=replaceOnce(body,needle,`  samePhase(${JSON.stringify(phase)});\n`+needle);
 body=replaceOnce(body,'  const completedActionId=await form.locator(\'input[name="action_id"]\').inputValue();','  if(process.env.AMM_SAME_JOB_MODE!=="baseline") await observation.prepare?.();\n  const completedActionId=await form.locator(\'input[name="action_id"]\').inputValue();');
 const version='  await expect(form.locator(\'input[name="record_version"]\')).toHaveValue(currentTaskVersion);';
 body=replaceOnce(body,version,'  samePhase("await_v2_assertion");\n  try {\n'+version+'\n  } catch(error) { samePrimary("FAIL","V2_ASSERTION_FAILED"); throw error; }\n  samePhase("v2_assertion_passed");\n  await observation.capture?.();');
 body=replaceOnce(body,'  } finally { await observation.finish(); }','  samePrimary("PASS","CASE6_COMPLETE");\n  } catch(error) { samePrimary("FAIL","OTHER_CASE6_FAILURE"); throw error; } finally { await observation.finish(); }');
 if(JSON.stringify(expectationList(original))!==JSON.stringify(expectationList(body)))throw Error('original_expectations_changed');
 return body;
}
export function adaptObserver(original){
 let body='import { sameStart, sameNote, sameFinish } from "./pr324-samejob-runtime.ts";\n'+original;
 body=replaceOnce(body,'export function staleReviewNote(stage: string, value: unknown) {','export function staleReviewNote(stage: string, value: unknown) {\n  sameNote(stage,value);');
 body=replaceOnce(body,'  const pending: Promise<unknown>[] = [];','  const attached = await sameStart(page, leadId);\n  const pending: Promise<unknown>[] = [];');
 body=replaceOnce(body,'  return { finish: async () => {','  return { prepare: attached.prepare, capture: attached.capture, finish: () => sameFinish(attached, async () => {');
 body=replaceOnce(body,'  } };','  }) };');
 return body;
}
export function adaptRunner(original){
 let body=replaceOnce(original,'    PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,','    PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,\n    AMM_SAME_JOB_MODE: process.env.AMM_SAME_JOB_MODE, AMM_FROZEN_MODE:process.env.AMM_FROZEN_MODE,\n    AMM_COLLECTOR_CONTROLLER_HEAD:process.env.AMM_COLLECTOR_CONTROLLER_HEAD, AMM_COLLECTOR_APPLICATION_HEAD:process.env.GITHUB_SHA,');
 body=replaceOnce(body,'  const suite = commandDesk ?', '  const suite = process.env.AMM_SAME_JOB_MODE === "validation" ? "tests/e2e/pr324-samejob-validation.spec.ts" : commandDesk ?');
 body=replaceOnce(body,'["exec", "playwright", "test", suite,','["exec", "playwright", "test", suite, "--reporter", path.resolve("tests/support/pr324-samejob-reporter.mjs"),');
 return body;
}
// Playwright's CommonJS test loader must not require native ESM containing
// import.meta. Only controller-side test copies are adapted; native worker/core
// .mjs files and every compiled application byte remain unchanged.
export const playwrightModules=['pr324-samejob-runtime','pr324-frozen-logpoints','pr324-collector-runtime'];
export function adaptPlaywrightModule(name,original){
 if(!playwrightModules.includes(name))throw Error('unknown_playwright_module');
 let body=original.replaceAll('./pr324-frozen-logpoints.mjs','./pr324-frozen-logpoints.ts').replaceAll('./pr324-collector-runtime.mjs','./pr324-collector-runtime.ts');
 if(name==='pr324-collector-runtime')body=replaceOnce(body,"new URL('./pr324-collector-worker.mjs',import.meta.url)","require.resolve('./pr324-collector-worker.mjs')");
 return body;
}
const textIdentity=value=>typeof value==='string'&&value.trim().length>0;
// Order is the observer's order, never a version/state-based search backward.
// Empty form snapshots are significant: the target may have disappeared.
export function completionSnapshot(dom,identity){
 const reject=reason=>({reason,snapshotIndex:null,matchCount:0,identity});
 if(!identity||identity.label!=='Complete task'||!textIdentity(identity.lead)||!textIdentity(identity.action))return reject('COMPLETION_RECORD_IDENTITY_MISSING');
 if(!Array.isArray(dom)||dom.length===0)return reject('SNAPSHOT_CONTEXT_MISSING');
 let latest=null,previousAt=-Infinity;
 for(const [index,event] of dom.entries()){
  if(!event||typeof event!=='object')return reject('SNAPSHOT_CONTEXT_INVALID');
  if(!Object.hasOwn(event,'forms'))continue;
  if(!Array.isArray(event.forms)||!Number.isFinite(event.at)||!textIdentity(event.trigger))return reject('SNAPSHOT_CONTEXT_INVALID');
  if(event.at<previousAt)return reject('SNAPSHOT_ORDER_INVALID');
  previousAt=event.at;latest={event,index};
 }
 if(!latest)return reject('SNAPSHOT_CONTEXT_MISSING');
 const selection={snapshotIndex:latest.index,observedAt:latest.event.at,trigger:latest.event.trigger,matchCount:0,identity};
 const forms=latest.event.forms;
 if(forms.some(form=>!form||!textIdentity(form.label)||!textIdentity(form.lead)||!textIdentity(form.action)))return {...selection,reason:'SNAPSHOT_FORM_IDENTITY_MISSING'};
 const matches=forms.filter(form=>form.label==='Complete task'&&form.lead===identity.lead&&form.action===identity.action);
 selection.matchCount=matches.length;
 if(matches.length>1)return {...selection,reason:'COMPLETE_TASK_FORM_AMBIGUOUS'};
 if(matches.length===0){
  const sameRecord=forms.some(form=>form.lead===identity.lead&&form.action===identity.action);
  return {...selection,reason:sameRecord?'COMPLETE_TASK_LABEL_MISMATCH':forms.some(form=>form.label==='Complete task')?'COMPLETE_TASK_IDENTITY_MISMATCH':'COMPLETE_TASK_FORM_MISSING'};
 }
 const form=matches[0];return {...selection,reason:null,form:{label:form.label,lead:form.lead,action:form.action,value:form.value,submitDisabled:form.submitDisabled}};
}
export function classifyTrialDetails(result,phases,dom){
 const answer=(classification,reason,selection)=>({classification,reason,...(selection?{selection}:{})});
 const issue=trialEvidenceIssue(result);if(issue)return answer('TRIAL_EVIDENCE_MISSING',issue);
 if(result.globalErrors?.length||result.results.length===0)return answer('HARNESS_STARTUP_FAILURE','GLOBAL_STARTUP_FAILURE');
 const failures=result.results.filter(row=>row&&typeof row.test==='string'&&row.test.startsWith('Today real task completion/stale form'));
 if(failures.length!==1)return answer('ORIGINAL_CASE_NOT_EXECUTED',failures.length?'ORIGINAL_CASE_AMBIGUOUS':'ORIGINAL_CASE_MISSING');
 const failure=failures[0];
 if(['skipped','interrupted'].includes(failure.status))return answer('ORIGINAL_CASE_NOT_EXECUTED','ORIGINAL_CASE_'+failure.status.toUpperCase());
 if(failure.status==='passed')return answer('ORIGINAL_FAILURE_NOT_REPRODUCED','ORIGINAL_CASE_PASSED');
 if(failure.status==='timedOut'||failure.errorSignature==='TEST_TIMEOUT_60000')return answer('DIFFERENT_TIMEOUT','CASE_TIMEOUT_NOT_ORIGINAL_ASSERTION');
 if(failure.status!=='failed')return answer('OTHER_FAILURE','ORIGINAL_CASE_NOT_FAILED');
 if(failure.errorSignature!=='EXPECT_TO_HAVE_VALUE'||phases?.primary?.code!=='V2_ASSERTION_FAILED')return answer('OTHER_FAILURE','ORIGINAL_VERSION_ASSERTION_NOT_PROVEN');
 const a=phases?.versions?.rendered_V1,b=phases?.versions?.concurrent_SQL_V2,c=phases?.versions?.review_expected_V2;
 if([a,b,c].some(record=>!record||!textIdentity(record.lead)||!textIdentity(record.action)))return answer('OTHER_FAILURE','COMPLETION_RECORD_IDENTITY_MISSING');
 if([b,c].some(record=>record.lead!==a.lead||record.action!==a.action))return answer('OTHER_FAILURE','COMPLETION_RECORD_IDENTITY_MISMATCH');
 const selection=completionSnapshot(dom,{label:'Complete task',lead:a.lead,action:a.action});
 if(selection.reason)return answer('OTHER_FAILURE',selection.reason,selection);
 if([a,b,c].some(record=>!textIdentity(record.version)))return answer('OTHER_FAILURE','VERSION_EVIDENCE_MISSING',selection);
 if(a.version===b.version||b.version!==c.version)return answer('OTHER_FAILURE','VERSION_CORRELATION_FAILED',selection);
 if(selection.form.value!==a.version)return answer('OTHER_FAILURE','COMPLETION_NOT_RECORDED_V1',selection);
 if(selection.form.submitDisabled!==true)return answer('OTHER_FAILURE','COMPLETION_NOT_DISABLED',selection);
 return answer('ORIGINAL_FAILURE_REPRODUCED','UNIQUE_COMPLETE_TASK_SQL_V2_CLIENT_V1',selection);
}
// Preserve the existing string/status API used by admission callers.
export function classifyTrial(result,phases,dom){return classifyTrialDetails(result,phases,dom).classification;}
// Bounded export must retain the final snapshot even when the target disappears.
export function formSnapshotEvidence(dom){
 const snapshots=Array.isArray(dom)?dom.filter(event=>event&&typeof event==='object'&&Object.hasOwn(event,'forms')):[];
 const forms=snapshots.slice(-3);
 return {forms,snapshotContext:{scope:'ordered DOM form snapshots including empty',totalSnapshots:snapshots.length,retainedSnapshots:forms.length,omittedEarlier:snapshots.length-forms.length,latestIncluded:snapshots.length>0,emptySnapshotsRetained:true}};
}
