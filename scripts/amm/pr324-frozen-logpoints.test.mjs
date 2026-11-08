// Collector-only regression checks. No app, browser, database or provider effects.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {mapScript,frozenObserver} from './pr324-frozen-logpoints.mjs';

test('unrelated chunks are rejected before AST traversal',()=>{
 const m=mapScript('(()=>{function unrelated(){return 1}})();'.repeat(1000));
 assert.equal(m.file,null);assert.deepEqual(m.points,[]);
});
test('minified ternary build branch and comma root return map explicitly',()=>{
 const source='async function f(e){try{let t=await fetch(e),r=await decode(t);return build()!==r.b?mpa(t.url):{flightData:normalize(r.f)}}catch(e){console.error("Failed to fetch RSC payload for ",e)}};function g(e,t){var n=e._chunks,r=n.get(t);return r||(r={status:"pending"},n.set(t,r)),r};function m(e){e.status="blocked";var r=e.reason;try{var v=JSON.parse(e.value,r._fromJSON);e.status="fulfilled";e.value=v}catch(t){e.status="rejected"}}';
 const m=mapScript(source),stages=m.points.map(p=>p.stage);
 for(const stage of ['flight_root_await','flight_root_settled','flight_build_mismatch','chunk_get_root','root_model_initialize','root_model_fulfilled'])assert.ok(stages.includes(stage),stage);
 assert.match(m.points.find(p=>p.stage==='chunk_get_root').setup,/b.chunks.set\(r,t\)/);
});
test('closed CDP target still saves evidence without masking the failure',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'amm-pr324-collector-'));
 const cwd=process.cwd();mkdirSync(path.join(dir,'.next'));writeFileSync(path.join(dir,'.next/BUILD_ID'),'SYNTHETIC-COLLECTOR-ONLY');process.chdir(dir);
 const saved={...process.env};
 process.env.AMM_FROZEN_MODE='control';process.env.AMM_ISOLATED_SESSION_ACCEPTANCE='1';process.env.VERCEL_ENV='development';process.env.AMM_SESSION_ARTIFACT_DIR=dir;
 const cdp=new EventEmitter();cdp.send=async()=>({});cdp.detach=async()=>{throw Error('Target page closed');};
 const page={addInitScript:async()=>{},context:()=>({newCDPSession:async()=>cdp}),evaluate:async()=>{throw Error('Target page closed');}};
 try{
  const observer=await frozenObserver(page,'synthetic-only');await observer.finish();
  const result=JSON.parse(readFileSync(path.join(dir,'frozen-logpoints.json'),'utf8'));
  assert.equal(result.detach.closed,true);assert.ok(result.unresolved.some(x=>x.capture));assert.deepEqual(result.captures,[]);
 }finally{process.chdir(cwd);for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);rmSync(dir,{recursive:true});}
});
