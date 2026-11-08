// No raw errors, URLs, traces, cookies or fixture secrets in exported outcomes.
import {writeFileSync} from 'node:fs';import path from 'node:path';
export default class Reporter {
 constructor(){this.results=[];}
 onTestEnd(test,result){
  const messages=result.errors.map(e=>String(e.message||'').replace(/\u001b\[[0-9;]*m/g,''));
  this.results.push({test:test.title,status:result.status,durationMs:result.duration,errorSignature:messages.some(x=>x.includes('Test timeout of 60000ms'))?'TEST_TIMEOUT_60000':messages.some(x=>x.includes('toHaveValue'))?'EXPECT_TO_HAVE_VALUE':messages.length?'OTHER_FAILURE':null});
  this.save('running');
 }
 onEnd(result){this.save(result.status);}
 save(status){writeFileSync(path.join(process.env.AMM_SESSION_ARTIFACT_DIR,'samejob-result.json'),JSON.stringify({schema:'amm.pr324.samejob-test-result.v1',at:new Date().toISOString(),status,mode:process.env.AMM_SAME_JOB_MODE,results:this.results}),{mode:0o600});}
}
