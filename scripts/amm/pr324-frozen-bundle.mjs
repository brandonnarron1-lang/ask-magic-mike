// Diagnostic controller only. Never modifies served app, Next libraries or chunks.
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
const baseline = 'a5021cc6dc66ab26420d1127554e66c022a08670';
if (process.platform !== 'linux' || process.env.GITHUB_ACTIONS !== 'true' || process.env.DATABASE_URL || process.env.VERCEL_ENV || process.env.PREVIEW_URL) throw Error('owned_clean_linux_only');
const root=path.resolve(process.argv[2]);
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
if(git('rev-parse','HEAD')!==baseline)throw Error('exact_reconstruction_source_required');
const hash=b=>createHash('sha256').update(b).digest('hex');
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(f=>f.isDirectory()?(f.name==='cache'?[]:walk(path.join(d,f.name))):[path.join(d,f.name)]);
const seal=()=>Object.fromEntries(walk(path.join(root,'.next')).filter(f=>/\.(js|json)$/.test(f)||f.endsWith('/BUILD_ID')).sort().map(f=>[path.relative(root,f),hash(readFileSync(f))]));
const before=seal();
const framework={};
for(const flavor of ['client','esm/client'])for(const file of ['router-reducer/fetch-server-response.js','router-reducer/reducers/refresh-reducer.js','app-router-instance.js']) {
 const relative=`node_modules/next/dist/${flavor}/components/${file}`;
 const body=readFileSync(path.join(root,relative),'utf8');
 if(body.includes('__ammStaleForm'))throw Error('patched_framework_forbidden');
 framework[relative]=hash(body);
}
const packages=Object.fromEntries(['next','react','react-dom','@playwright/test','typescript'].map(p=>[p,JSON.parse(readFileSync(path.join(root,'node_modules',p,'package.json'),'utf8')).version]));
if(packages.next!=='15.5.26')throw Error('version_mismatch');
// Test-controller changes occur after the single build, outside served assets.
const helper=path.join(root,'tests/support/stale-review-diagnostic.ts');
let h=readFileSync(helper,'utf8');
const replace=(body,a,b)=>{if(body.split(a).length!==2)throw Error('test_hook_anchor_mismatch:'+a);return body.replace(a,b);};
h='import { frozenObserver } from "./pr324-frozen-logpoints.mjs";\n'+h;
h=replace(h,'  const pending: Promise<unknown>[] = [];','  const frozen = await frozenObserver(page, leadId);\n  const pending: Promise<unknown>[] = [];');
h=replace(h,'  return { finish: async () => {','  return { capture: frozen.capture, prepare: frozen.prepare, finish: async () => {\n    await frozen.finish();');
writeFileSync(helper,h);
const spec=path.join(root,'tests/e2e/reference-real-session.spec.ts');
let testBody=replace(readFileSync(spec,'utf8'),'  const completedActionId=await form.locator(\'input[name="action_id"]\').inputValue();','  await observation.prepare?.(); // debugger setup before V1/concurrent SQL, no polling or sleep\n  const completedActionId=await form.locator(\'input[name="action_id"]\').inputValue();');
testBody=replace(testBody,'  await expect(form.locator(\'input[name="record_version"]\')).toHaveValue(currentTaskVersion);','  await expect(form.locator(\'input[name="record_version"]\')).toHaveValue(currentTaskVersion);\n  await observation.capture?.(); // flush after assertion, before successful hard navigation');
writeFileSync(spec,testBody);
const runner=path.join(root,'scripts/amm/reference-session-acceptance.mjs');
writeFileSync(runner,replace(readFileSync(runner,'utf8'),'    PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,','    PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,\n    AMM_FROZEN_MODE: process.env.AMM_FROZEN_MODE,'));
copyFileSync(path.resolve('scripts/amm/pr324-frozen-logpoints.mjs'),path.join(root,'tests/support/pr324-frozen-logpoints.mjs'));
const results=[];
const containerList=()=>execFileSync('docker',['ps','-a','--filter','label=com.askmagicmike.purpose=qa-audit-isolated','--format','{{.ID}} {{.Names}}'],{encoding:'utf8'}).trim().split('\n').filter(Boolean).sort();
const containersBefore=containerList();
for(const mode of ['control','probe']) {
 const dir=path.join(root,'.amm-run',`frozen-${mode}`);mkdirSync(dir,{recursive:true});
 const source={at:new Date().toISOString(),kind:'RECONSTRUCTED a502; original compiled artifact unavailable',baseline,tree:git('rev-parse','HEAD^{tree}'),controller:process.env.GITHUB_SHA,buildId:readFileSync(path.join(root,'.next/BUILD_ID'),'utf8').trim(),node:process.version,platform:process.platform,arch:process.arch,os:readFileSync('/etc/os-release','utf8'),packages,lock:hash(readFileSync(path.join(root,'pnpm-lock.yaml'))),framework,bundles:before,mode,observerDifference:'same CDP attachment and existing a502 observers; conditional breakpoints active only in probe'};
 writeFileSync(path.join(dir,'frozen-source.json'),JSON.stringify(source,null,2));
 console.log(JSON.stringify({stage:'frozen_baseline_seal',at:source.at,mode,baseline,tree:source.tree,controller:source.controller,buildId:source.buildId,packages,bundleCount:Object.keys(before).length,manifestSha256:hash(JSON.stringify(before)),frameworkUnpatched:true}));
 const result=spawnSync(process.execPath,['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','scripts/amm/reference-session-acceptance.mjs'],{cwd:root,env:{PATH:process.env.PATH,HOME:process.env.HOME,CI:'true',GITHUB_SHA:baseline,AMM_QA_POSTGRES_TEST:'1',AMM_STALE_REVIEW_DIAGNOSTIC:'1',AMM_SESSION_ARTIFACT_DIR:`.amm-run/frozen-${mode}`,AMM_FROZEN_MODE:mode},stdio:'inherit',timeout:6*60*1000});
 const after=seal(),changed=Object.keys({...before,...after}).filter(k=>before[k]!==after[k]);
 const remaining=containerList().filter(x=>!containersBefore.includes(x));
 const row={at:new Date().toISOString(),mode,exit:result.status,signal:result.signal,error:result.error?.code||null,bundleHashesUnchanged:changed.length===0,changed,taskContainersRemaining:remaining};results.push(row);
 writeFileSync(path.join(dir,'frozen-result.json'),JSON.stringify(row,null,2));
 console.log(JSON.stringify({stage:'frozen_run_result',...row}));
 if(changed.length||remaining.length||result.error)throw Error('immutable_or_cleanup_boundary_failed');
}
writeFileSync(path.join(root,'.amm-run/frozen-probe/frozen-pair.json'),JSON.stringify({at:new Date().toISOString(),results,productionEffects:0,providerCalls:0,reconstructionNotOriginal:true,releaseAcceptance:false},null,2));
// A reproduced assertion failure is evidence, not orchestration failure/success of release.
if(results.some(r=>r.exit!==0))process.exitCode=1;
