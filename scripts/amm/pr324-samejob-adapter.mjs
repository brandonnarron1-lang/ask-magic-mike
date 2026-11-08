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
export function classifyTrial(result,phases,dom){
 if(trialEvidenceIssue(result))return 'TRIAL_EVIDENCE_MISSING';
 if(result.globalErrors?.length||result.results.length===0)return 'HARNESS_STARTUP_FAILURE';
 const failure=result?.results?.find(r=>r.test.startsWith('Today real task completion/stale form'));
 if(!failure||['skipped','interrupted'].includes(failure.status))return 'ORIGINAL_CASE_NOT_EXECUTED';
 if(failure.status==='passed')return 'ORIGINAL_FAILURE_NOT_REPRODUCED';
 if(failure.status==='timedOut'||failure.errorSignature==='TEST_TIMEOUT_60000')return 'DIFFERENT_TIMEOUT';
 const a=phases?.versions?.rendered_V1,b=phases?.versions?.concurrent_SQL_V2,c=phases?.versions?.review_expected_V2;
 const form=dom?.flatMap(e=>e.forms||[]).filter(f=>f.action===a?.action&&f.lead===a?.lead).at(-1);
 return failure.errorSignature==='EXPECT_TO_HAVE_VALUE'&&phases.primary?.code==='V2_ASSERTION_FAILED'&&a&&b&&c&&a.lead===b.lead&&a.action===b.action&&b.version===c.version&&a.version!==b.version&&form?.value===a.version&&form.submitDisabled===true?'ORIGINAL_FAILURE_REPRODUCED':'OTHER_FAILURE';
}
