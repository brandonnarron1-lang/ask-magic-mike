// Separate synthetic fixtures; no claim that this is the original serial suite.
import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {observeStaleReview} from '../../tests/support/stale-review-diagnostic';
import {samePhase,samePrimary} from '../../tests/support/pr324-samejob-runtime.mjs';
test.skip(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE!=='1'||process.env.AMM_SAME_JOB_MODE!=='validation','same-job isolated probe validation only');
test('Independent synthetic refresh validates minimal runtime logpoints',async({browser})=>{
 const fixture=JSON.parse(readFileSync(process.env.AMM_E2E_FIXTURE_PATH!,'utf8'));
 const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();let observation:Awaited<ReturnType<typeof observeStaleReview>>|undefined;
 try{
  observation=await observeStaleReview(page,fixture.leads.agent);
  await page.goto('/lead-center-login?returnTo=%2Fadmin%2Ftoday');
  await page.getByLabel('Work email').fill('agent@example.test');await page.getByLabel('Password',{exact:true}).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
  await page.getByRole('button',{name:'Open Lead Center'}).click();await expect(page).toHaveURL(/\/admin\/today$/);
  // Exact scripts loaded after collector attachment; no reload or app edit.
  const form=page.getByRole('form',{name:'Complete task',exact:true}).filter({has:page.locator(`input[name="lead_id"][value="${fixture.leads.agent}"]`)}).first();
  await expect(form).toBeVisible();await observation.prepare?.();
  const version=await form.locator('input[name="record_version"]').inputValue();
  await form.locator('input[name="record_version"]').evaluate(el=>{(el as HTMLInputElement).value='synthetic-validation-forged';});
  await form.getByRole('button',{name:'Complete task',exact:true}).click();await expect(form.getByRole('alert')).toContainText('This action changed');
  samePhase('validation_review');await form.getByRole('button',{name:'Review latest record (keep draft)',exact:true}).click();
  await expect(form.locator('input[name="record_version"]')).toHaveValue(version);await expect(form.getByRole('button',{name:'Complete task',exact:true})).toBeEnabled();
  await observation.capture?.();samePrimary('PASS','VALIDATION_REFRESH_COMPLETE');
 }catch(error){samePrimary('FAIL','VALIDATION_REFRESH_FAILED');throw error;}
 finally{await observation?.finish();await context.close();}
});
