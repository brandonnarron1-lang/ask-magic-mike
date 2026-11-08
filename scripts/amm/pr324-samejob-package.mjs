// Diagnostic manifest/receipt package, NOT collector self-test or release evidence.
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';import {pathToFileURL} from 'node:url';
import {hash} from './pr324-collector-package.mjs';
export const required=['diagnostic-source.json','diagnostic-integrity.json','diagnostic-phases.json','diagnostic-trials.json','diagnostic-observations.json','diagnostic-cleanup.json'];
export const byteLimit=200*1024;
export function sealDiagnostic(dir,identity){
 const files=required.map(file=>{const body=readFileSync(path.join(dir,file));if(!body.length)throw Error('empty_diagnostic_file');if(/postgres(?:ql)?:\/\/|Bearer\s+|better-auth\.session|storageState|-----BEGIN [^-]*KEY-----/i.test(body.toString()))throw Error('diagnostic_sensitive_content_rejected');const v=JSON.parse(body);if(JSON.stringify(v.identity)!==JSON.stringify(identity))throw Error('diagnostic_identity_mismatch');return {file,bytes:body.length,sha256:hash(body)};});
 const manifest={schema:'amm.pr324.samejob-package.v1',identity,at:new Date().toISOString(),durableCompiledRetention:'NOT ESTABLISHED',files};
 writeFileSync(path.join(dir,'diagnostic-package.json'),JSON.stringify(manifest),{mode:0o600});return verifyDiagnostic(dir,identity);
}
export function verifyDiagnostic(dir,identity){
 const names=readdirSync(dir).sort(),expected=[...required,'diagnostic-package.json'].sort();if(JSON.stringify(names)!==JSON.stringify(expected))throw Error('diagnostic_inventory_mismatch');
 const manifest=JSON.parse(readFileSync(path.join(dir,'diagnostic-package.json'),'utf8'));
 if(manifest.schema!=='amm.pr324.samejob-package.v1'||JSON.stringify(manifest.identity)!==JSON.stringify(identity)||JSON.stringify(manifest.files.map(r=>r.file))!==JSON.stringify(required))throw Error('diagnostic_manifest_invalid');
 let bytes=statSync(path.join(dir,'diagnostic-package.json')).size;
 for(const [index,row] of manifest.files.entries()){
  const body=readFileSync(path.join(dir,row.file)),v=JSON.parse(body);bytes+=body.length;
  if(body.length===0||body.length!==row.bytes||hash(body)!==row.sha256||v.schema!==`amm.pr324.samejob-${row.file.slice(11,-5)}.v1`||JSON.stringify(v.identity)!==JSON.stringify(identity)||!v.status)throw Error('diagnostic_schema_checksum_invalid');
  if(index===0&&(!v.application||!v.controller))throw Error('diagnostic_source_missing');
 }
 if(bytes>byteLimit)throw Error('diagnostic_export_byte_limit');
 return {status:'PASS',identity,files:7,checksums:6,bytes,byteLimit,manifestSha256:hash(readFileSync(path.join(dir,'diagnostic-package.json')))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const dir=path.resolve(process.argv[2]),identity=JSON.parse(readFileSync(path.join(dir,'diagnostic-package.json'),'utf8')).identity;if(identity.controller!==process.env.GITHUB_SHA||identity.runId!==process.env.GITHUB_RUN_ID||identity.attempt!==process.env.GITHUB_RUN_ATTEMPT)throw Error('current_diagnostic_attempt_required');console.log(JSON.stringify(verifyDiagnostic(dir,identity)));}
