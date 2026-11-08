// Explicit sanitized package inventory. No recursive artifact upload or build export.
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export const cases=['normal','assertion','target-closed','stalled-capture','stalled-mapping'];
export const required=[...cases.map(name=>`collector-case-${name}.json`),'collector-selftest.json'];
export const hash=value=>createHash('sha256').update(value).digest('hex');
export function sealPackage(dir,identity){
 const files=required.map(file=>{const body=readFileSync(path.join(dir,file));if(!body.length)throw Error('empty_required_file');JSON.parse(body);return {file,bytes:body.length,sha256:hash(body)};});
 const manifest={schema:'amm.pr324.collector-package.v1',identity,createdAt:new Date().toISOString(),files};
 writeFileSync(path.join(dir,'collector-package.json'),JSON.stringify(manifest,null,2),{mode:0o600});return manifest;
}
export function verifyPackage(dir,expected){
 const manifest=JSON.parse(readFileSync(path.join(dir,'collector-package.json'),'utf8'));
 if(manifest.schema!=='amm.pr324.collector-package.v1'||JSON.stringify(manifest.identity)!==JSON.stringify(expected))throw Error('package_identity_mismatch');
 const names=readdirSync(dir).sort();if(JSON.stringify(names)!==JSON.stringify([...required,'collector-package.json'].sort()))throw Error('exact_inventory_mismatch');
 if(JSON.stringify(manifest.files.map(f=>f.file))!==JSON.stringify(required))throw Error('mandatory_inventory_mismatch');
 for(const row of manifest.files){const body=readFileSync(path.join(dir,row.file));if(!body.length||body.length!==row.bytes||hash(body)!==row.sha256)throw Error('file_checksum_mismatch');const value=JSON.parse(body);
  if(JSON.stringify(value.identity)!==JSON.stringify(expected))throw Error('file_attempt_mismatch');
  if(row.file!=='collector-selftest.json'){
   const reasons={normal:'normal_completion',assertion:'INTENTIONAL_ASSERTION','target-closed':'INTENTIONAL_TARGET_CLOSURE','stalled-capture':'INTENTIONAL_STALLED_CAPTURE','stalled-mapping':'INTENTIONAL_STALLED_MAPPING'};
   if(value.schema!=='amm.pr324.collector.v1'||`collector-case-${value.case}.json`!==row.file||!value.finished||value.pendingStopped!==true||value.primary?.reason!==reasons[value.case]||value.primary.status!==(value.case==='normal'?'PASS':'FAIL')||!Array.isArray(value.operations)||!Array.isArray(value.errors)||!Array.isArray(value.cleanup)||!value.verification?.passed||!value.verification.initialReceiptRetained||!value.verification.primaryPreserved||!value.verification.faultObserved||!value.verification.browserProcessExited||!value.verification.browserDisconnected||!value.verification.workersStopped||value.verification.elapsedMs>=value.verification.caseBudgetMs)throw Error('case_schema_or_outcome_invalid');
  }else if(value.schema!=='amm.pr324.collector-selftest.v1'||value.passed!==cases.length||value.failed!==0||value.skipped!==0)throw Error('selftest_not_passed');
 }
 return {status:'PASS',identity:manifest.identity,requiredFiles:required.length+1,checksumsVerified:required.length,manifestSha256:hash(readFileSync(path.join(dir,'collector-package.json')))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const dir=path.resolve(process.argv[2]),identity=JSON.parse(readFileSync(path.join(dir,'collector-package.json'),'utf8')).identity;
 if(String(identity.runId)!==process.env.GITHUB_RUN_ID||String(identity.attempt)!==process.env.GITHUB_RUN_ATTEMPT||identity.controller!==process.env.GITHUB_SHA)throw Error('current_attempt_required');
 console.log(JSON.stringify(verifyPackage(dir,identity)));
}
