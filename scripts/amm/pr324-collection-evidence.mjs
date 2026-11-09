// Small collection-only receipt adapter. No application, browser or DB imports.
import {readFileSync,writeFileSync,readdirSync,mkdirSync,statSync,statfsSync,existsSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {hash} from './pr324-collector-package.mjs';
export const required=['collection-source.json','collection-outcomes.json','collection-checks.json','collection-cleanup.json'];
export const limit=200*1024;
export const fixture='a5021cc6dc66ab26420d1127554e66c022a08670';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
export function writeCollection(dir,kind,identity,value){mkdirSync(dir,{recursive:true,mode:0o700});writeFileSync(path.join(dir,`collection-${kind}.json`),JSON.stringify({schema:`amm.pr324.collection-${kind}.v1`,identity,...value}),{mode:0o600});}
export function assertOutcomes(value){
 if(value.status!=='PASS')throw Error('collection_outcomes_not_passed');
 const {negative,reference,validation,expected}=value;
 if(negative?.exit!==1||negative.signal!==null||negative.report?.status!=='failed'||negative.report.results?.length!==0||!negative.report.globalErrors?.some(e=>e.signature==='ESM_EXPORTS_UNDEFINED')||negative.report.globalErrors.some(e=>!['ESM_EXPORTS_UNDEFINED','NO_TESTS_FOUND'].includes(e.signature)))throw Error('negative_control_invalid');
 for(const [name,row,n] of [['reference',reference,10],['validation',validation,1]]){
  if(row?.exit!==0||row.signal!==null||row.report?.status!=='passed'||row.report?.globalErrors?.length!==0||row.report?.inventory?.length!==n||JSON.stringify(row.report.inventory)!==JSON.stringify(expected?.[name]))throw Error('collection_inventory_invalid');
 }
 if(!expected.reference[5].title.startsWith('Today real task completion/stale form'))throw Error('original_stale_case_missing');
 for(const row of [negative,reference,validation]){
  if(row.report?.schema!=='amm.pr324.collection-result.v1'||row.report.operation!=='COLLECTION_ONLY'||row.report.executedApplicationCases!==0||row.report.results.length!==0||row.guard?.childExit!==row.exit||row.guard?.attempts?.length!==0||row.guard?.hooksInvoked!==false||row.guard?.identity!==row.child||row.error!==null)throw Error('collection_boundary_invalid');
  for(const error of row.report.globalErrors)if(!/^[a-f0-9]{64}$/.test(error.messageSha256))throw Error('startup_digest_missing');
 }
 return true;
}
export function packageCollection(dir,identity){
 const files=required.map(file=>{const body=readFileSync(path.join(dir,file));return {file,bytes:body.length,sha256:hash(body)};});
 writeFileSync(path.join(dir,'collection-package.json'),JSON.stringify({schema:'amm.pr324.collection-package.v1',identity,at:new Date().toISOString(),files}),{mode:0o600});return verifyCollection(dir,identity);
}
export function verifyCollection(dir,identity){
 if(JSON.stringify(readdirSync(dir).sort())!==JSON.stringify([...required,'collection-package.json'].sort()))throw Error('collection_inventory_mismatch');
 const manifest=JSON.parse(readFileSync(path.join(dir,'collection-package.json')));let bytes=statSync(path.join(dir,'collection-package.json')).size;
 if(manifest.schema!=='amm.pr324.collection-package.v1'||JSON.stringify(manifest.identity)!==JSON.stringify(identity)||JSON.stringify(manifest.files.map(x=>x.file))!==JSON.stringify(required))throw Error('collection_manifest_invalid');
 for(const row of manifest.files){const body=readFileSync(path.join(dir,row.file)),v=JSON.parse(body);bytes+=body.length;
  if(!body.length||body.length!==row.bytes||hash(body)!==row.sha256||v.schema!==`amm.pr324.${row.file.slice(0,-5)}.v1`||JSON.stringify(v.identity)!==JSON.stringify(identity)||!v.status)throw Error('collection_schema_checksum_invalid');
  if(/postgres(?:ql)?:\/\/|Bearer\s+|better-auth\.session|storageState|-----BEGIN [^-]*KEY-----/i.test(body.toString()))throw Error('collection_sensitive_content_rejected');
 }
 if(bytes>limit)throw Error('collection_byte_limit');return {status:'PASS',identity,files:5,checksums:4,bytes,limit,manifestSha256:hash(readFileSync(path.join(dir,'collection-package.json')))};
}
export function gateCollection(dir,identity){
 verifyCollection(dir,identity);const read=kind=>JSON.parse(readFileSync(path.join(dir,`collection-${kind}.json`)));
 const source=read('source'),checks=read('checks'),cleanup=read('cleanup');
 if(source.status!=='PASS'||source.fixture?.head!==fixture||source.platform!=='linux'||!source.node.startsWith('v24.')||source.playwright!=='1.60.0')throw Error('collection_source_invalid');
 if(checks.status!=='PASS'||checks.exit!==0||checks.fail!==0||checks.skip!==0||checks.pass!==checks.tests||checks.tests<10||checks.nativeCoreUnchanged!==true||checks.applicationSourceUnchanged!==true||checks.compiledApplicationAbsent!==true)throw Error('adapter_checks_not_passed');
 if(cleanup.status!=='PASS'||cleanup.scratchRemoved!==true)throw Error('collection_cleanup_unverified');
 assertOutcomes(read('outcomes'));return {status:'PASS',executedApplicationCases:0,adapterChecks:checks.tests,discoveredReferenceCases:10,discoveredValidationCases:1};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const action=process.argv[2],dir=path.resolve(process.env.AMM_COLLECTION_OUTPUT||'output/pr324-collection');
 const identity={controller:process.env.GITHUB_SHA||git('rev-parse','HEAD'),controllerTree:git('rev-parse','HEAD^{tree}'),applicationFixture:fixture,applicationTree:git('rev-parse',fixture+'^{tree}'),runId:process.env.GITHUB_RUN_ID||'native',attempt:process.env.GITHUB_RUN_ATTEMPT||'1'};
 if(action==='init'){
  git('cat-file','-e',fixture+'^{commit}');const pkg=existsSync('node_modules/@playwright/test/package.json')?JSON.parse(readFileSync('node_modules/@playwright/test/package.json','utf8')):null;
  const freeBytes=Number(statfsSync('.').bavail)*Number(statfsSync('.').bsize);
  const excluded=JSON.parse(readFileSync('vercel.json')).git.deploymentEnabled['codex/pr324-linux-stale-review-20261107']===false;
  writeCollection(dir,'source',identity,{status:pkg?'PASS':'NOT RUN',at:new Date().toISOString(),fixture:{head:fixture,tree:identity.applicationTree},platform:process.platform,arch:process.arch,node:process.version,runner:process.platform==='linux'?readFileSync('/etc/os-release','utf8').split('\n').find(x=>x.startsWith('PRETTY_NAME=')):'native',playwright:pkg?.version||null,lockSha256:hash(readFileSync('pnpm-lock.yaml')),freeBytes,requiredFreeBytes:2*1024**3,deploymentExcluded:excluded,compiledBaseline:'NOT PRESENT; source fixture only',nativeCoreHashes:Object.fromEntries(['pr324-collector-worker.mjs','pr324-collector-runtime.mjs','pr324-frozen-logpoints.mjs'].map(n=>[n,hash(readFileSync('scripts/amm/'+n))]))});
  for(const kind of ['outcomes','checks','cleanup'])writeCollection(dir,kind,identity,{status:'NOT RUN'});
  if(freeBytes<2*1024**3||!excluded||git('rev-parse','HEAD')!==identity.controller||identity.applicationTree!=='6c7e37a288b14b385cc6bb2a11b7496884908081')throw Error('collection_admission_failed');
 }else if(action==='run'){
  // Equivalent exact requested command, clean child context; never execute a suite.
  const run=spawnSync(process.execPath,['--test','scripts/amm/pr324-samejob-adapter.test.mjs'],{env:{PATH:process.env.PATH,HOME:process.env.HOME,LANG:'C',LC_ALL:'C',CI:'true',AMM_COLLECTION_OUTPUT:dir,AMM_COLLECTION_IDENTITY:JSON.stringify(identity)},encoding:'utf8',timeout:60000,maxBuffer:256*1024});
  const text=(run.stdout||'')+'\n'+(run.stderr||''),count=n=>Number(text.match(new RegExp('(?:#|ℹ) '+n+' (\\d+)'))?.[1]??-1);
  const source=JSON.parse(readFileSync(path.join(dir,'collection-source.json')));
  const value={status:run.status===0?'PASS':'FAIL',at:new Date().toISOString(),command:'node --test scripts/amm/pr324-samejob-adapter.test.mjs',exit:run.status,signal:run.signal,error:run.error?.code||null,tests:count('tests'),pass:count('pass'),fail:count('fail'),skip:count('skipped'),nativeCoreUnchanged:Object.entries(source.nativeCoreHashes).every(([n,digest])=>hash(readFileSync('scripts/amm/'+n))===digest),applicationSourceUnchanged:git('diff','--name-only','HEAD','--','app','src','packages','supabase','package.json','pnpm-lock.yaml')==='',compiledApplicationAbsent:!existsSync('.next')};
  writeCollection(dir,'checks',identity,value);console.log(JSON.stringify(value));if(run.status!==0)process.exitCode=1;
 }else if(action==='finalize')console.log(JSON.stringify(packageCollection(dir,identity)));
 else if(action==='gate')console.log(JSON.stringify(gateCollection(dir,identity)));
 else throw Error('unknown_collection_action');
}
