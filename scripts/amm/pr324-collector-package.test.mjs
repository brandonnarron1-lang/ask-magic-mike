import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {cases,sealPackage,verifyPackage} from './pr324-collector-package.mjs';
const identity={controller:'a'.repeat(40),controllerTree:'b'.repeat(40),application:null,build:null,runId:'123',attempt:'1',purpose:'synthetic unit fixture'};
function fixture(){
 const dir=mkdtempSync(path.join(tmpdir(),'amm-collector-package-'));
 const reasons=['normal_completion','INTENTIONAL_ASSERTION','INTENTIONAL_TARGET_CLOSURE','INTENTIONAL_STALLED_CAPTURE','INTENTIONAL_STALLED_MAPPING'];
 for(const [i,name] of cases.entries())writeFileSync(path.join(dir,`collector-case-${name}.json`),JSON.stringify({schema:'amm.pr324.collector.v1',identity,case:name,finished:true,pendingStopped:true,primary:{status:i===0?'PASS':'FAIL',reason:reasons[i]},operations:[],errors:[],cleanup:[],verification:{passed:true,initialReceiptRetained:true,primaryPreserved:true,faultObserved:true,browserProcessExited:true,browserDisconnected:true,workersStopped:true,elapsedMs:1,caseBudgetMs:10000}}));
 writeFileSync(path.join(dir,'collector-selftest.json'),JSON.stringify({schema:'amm.pr324.collector-selftest.v1',identity,passed:5,failed:0,skipped:0}));sealPackage(dir,identity);return dir;
}
for(const [name,mutate] of [
 ['complete inventory',()=>{}],
 ['missing file',dir=>rmSync(path.join(dir,'collector-case-normal.json'))],
 ['wrong attempt',dir=>{const file=path.join(dir,'collector-case-normal.json'),v=JSON.parse(readFileSync(file));v.identity.attempt='2';writeFileSync(file,JSON.stringify(v));sealPackage(dir,identity);}],
 ['empty file',dir=>writeFileSync(path.join(dir,'collector-case-normal.json'),'')],
 ['checksum mismatch',dir=>writeFileSync(path.join(dir,'collector-case-normal.json'),'{}')],
 ['extra file',dir=>writeFileSync(path.join(dir,'unlisted.json'),'{}')],
 ['invalid schema',dir=>{writeFileSync(path.join(dir,'collector-case-normal.json'),JSON.stringify({identity}));sealPackage(dir,identity);}]
])test(`package gate: ${name}`,()=>{const dir=fixture();try{mutate(dir);if(name==='complete inventory')assert.equal(verifyPackage(dir,identity).requiredFiles,7);else assert.throws(()=>verifyPackage(dir,identity));}finally{rmSync(dir,{recursive:true});}});
