// No raw errors, URLs, traces, cookies or fixture secrets in exported outcomes.
import {writeFileSync} from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
export default class Reporter {
 constructor(){this.results=[];this.globalErrors=[];this.inventory=[];}
 onBegin(config,suite){this.inventory=suite?.allTests().map(test=>({file:path.basename(test.location.file),title:test.title,project:test.parent.project().name}))||[];this.save('running');}
 onError(error){
  const message=String(error.message||'').replace(/\u001b\[[0-9;]*m/g,'');
  const signature=message.includes('exports is not defined in ES module scope')?'ESM_EXPORTS_UNDEFINED':message.includes('No tests found')?'NO_TESTS_FOUND':'GLOBAL_STARTUP_ERROR';
  this.globalErrors.push({signature,messageSha256:createHash('sha256').update(message).digest('hex')});
  this.save('failed');
 }
 onTestEnd(test,result){
  const messages=result.errors.map(e=>String(e.message||'').replace(/\u001b\[[0-9;]*m/g,''));
  this.results.push({test:test.title,status:result.status,durationMs:result.duration,errorSignature:messages.some(x=>x.includes('Test timeout of 60000ms'))?'TEST_TIMEOUT_60000':messages.some(x=>x.includes('toHaveValue'))?'EXPECT_TO_HAVE_VALUE':messages.length?'OTHER_FAILURE':null});
  this.save('running');
 }
 onEnd(result){this.save(result.status);}
 save(status){const collection=process.env.AMM_COLLECTION_PREFLIGHT==='1';writeFileSync(path.join(process.env.AMM_SESSION_ARTIFACT_DIR,'samejob-result.json'),JSON.stringify({schema:collection?'amm.pr324.collection-result.v1':'amm.pr324.samejob-test-result.v1',at:new Date().toISOString(),status,mode:process.env.AMM_SAME_JOB_MODE,results:this.results,globalErrors:this.globalErrors,...(collection?{operation:'COLLECTION_ONLY',inventory:this.inventory,executedApplicationCases:this.results.length}:{})}),{mode:0o600});}
}
