// Host-side CDP controller; not imported into, or built with, the served app.
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
const sha=s=>createHash('sha256').update(s).digest('hex');
const isFn=n=>ts.isFunctionDeclaration(n)||ts.isFunctionExpression(n)||ts.isArrowFunction(n)||ts.isMethodDeclaration(n);
const children=n=>{const rows=[];function visit(v){rows.push(v);ts.forEachChild(v,visit);}visit(n);return rows;};
const parentFn=n=>{for(let p=n.parent;p;p=p.parent)if(isFn(p))return p;};
const ancestor=(n,predicate)=>{for(let p=n;p;p=p.parent)if(predicate(p))return p;};

// Map names from this exact loaded minified script's AST. No guessed offsets,
// upstream source maps, framework edits, evaluated getters or thenable reads.
export function mapScript(source) {
 const file=ts.createSourceFile('loaded.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const all=children(file), points=[], limitations=[];
 const text=n=>n?.getText(file)||'';
 const own=(fn,predicate)=>all.filter(n=>parentFn(n)===fn&&predicate(n));
 const add=(stage,node,fields='{}',setup='')=>{if(!node)return;points.push({stage,start:node.getStart(file),end:node.end,fields,setup});};
 const string=s=>all.find(n=>ts.isStringLiteral(n)&&n.text===s);
 const directProp=(n,name)=>ts.isPropertyAccessExpression(n)&&n.name.text===name;

 const fetchMarker=all.find(n=>ts.isStringLiteral(n)&&n.text.startsWith('Failed to fetch RSC payload for '));
 if(fetchMarker){
  const fn=parentFn(fetchMarker),awaits=own(fn,ts.isAwaitExpression);
  const rootAwait=awaits.at(-1),declaration=ancestor(rootAwait,ts.isVariableDeclaration);
  const root=declaration&&text(declaration.name);
  if(root&&/^[\w$]+$/.test(root)){
   add('flight_root_await',rootAwait);
   const build=own(fn,n=>directProp(n,'b')&&text(n.expression)===root)[0];
   const buildCheck=ancestor(build,ts.isIfStatement);
   add('flight_root_settled',buildCheck,`{build:${root}.b,expected:globalThis.__ammFrozen.build}`);
   if(buildCheck)add('flight_build_mismatch',buildCheck.thenStatement,`{build:${root}.b}`);
   const ret=own(fn,ts.isReturnStatement).find(n=>text(n).includes('flightData:')&&text(n).includes(`${root}.f`));
   add('flight_normalize_return',ret,`{build:${root}.b}`);
  }else limitations.push('fetch root await local unresolved');
 }
 const refreshMarker=string('REFRESH FAILED');
 if(refreshMarker){
  const callback=parentFn(refreshMarker);
  const binding=own(callback,ts.isVariableDeclaration).find(n=>ts.isObjectBindingPattern(n.name)&&n.name.elements.some(e=>text(e.propertyName||e.name)==='flightData'));
  const flight=binding?.name.elements.find(e=>text(e.propertyName||e.name)==='flightData');
  const statements=callback.body?.statements;
  if(binding&&flight&&statements){
   const first=statements.find(s=>s.getStart(file)>binding.end);
   add('refresh_decoded',first,`{kind:typeof ${text(flight.name)},count:Array.isArray(${text(flight.name)})?${text(flight.name)}.length:null}`);
  }
  add('refresh_non_root_return',ancestor(refreshMarker,ts.isExpressionStatement));
  const waits=own(callback,ts.isAwaitExpression);
  for(const wait of waits){
   add('refresh_inactive_begin',wait);
   const statement=ancestor(wait,ts.isExpressionStatement);
   const next=statement?.parent?.statements?.find(n=>n.getStart(file)>statement.end);
   add('refresh_inactive_done',next);
  }
  for(const ret of own(callback,ts.isReturnStatement)){
   const parent=ret.parent;
   if(ts.isBlock(parent)&&ts.isIfStatement(parent.parent))add('refresh_branch_return',ret,`{branch:${JSON.stringify(text(parent.parent.expression).slice(0,150))}}`);
   else if(ts.isIfStatement(parent))add('refresh_branch_return',ret,`{branch:${JSON.stringify(text(parent.expression).slice(0,150))}}`);
   else add('refresh_reducer_return',ret);
  }
 }
 // Promise callback named by its exact .discarded/.state/.resolve structure.
 for(const fn of all.filter(isFn)){
  const props=own(fn,n=>directProp(n,'discarded'));
  const resolve=own(fn,n=>ts.isCallExpression(n)&&directProp(n.expression,'resolve'));
  const state=own(fn,n=>ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.EqualsToken&&directProp(n.left,'state'));
  if(props.length===1&&resolve.length&&state.length){
   const action=text(props[0].expression),queue=text(state[0].left.expression),next=text(state[0].right);
   const values=`{action:b.id(${action}),type:${action}.payload.type,discarded:!!${action}.discarded,pending:b.id(${queue}.pending),state:b.id(${queue}.state),next:b.id(${next})}`;
   add('queue_handle_result',fn.body.statements[0],values);
   add('queue_before_state_assign',state[0],values);
   add('queue_before_resolve',resolve[0],values);
   // Parent runAction: observe the actual call into the reducer.
   const outer=parentFn(fn),call=outer&&own(outer,n=>ts.isCallExpression(n)&&directProp(n.expression,'action'))[0];
   add('queue_action_begin',call,`{type:${text(call?.arguments?.[1])}.type,pending:b.id(${queue}.pending)}`);
  }
 }
 // Root model chunk identity is registered only where getChunk normally returns
 // it. Read plain status and the already-materialized parser's dependency count.
 for(const fn of all.filter(isFn)){
  const body=text(fn),param=text(fn.parameters?.[0]?.name);
  if(!/^[\w$]+$/.test(param))continue;
  if(body.includes('._chunks')&&body.includes('.get(')&&body.includes('.set(')&&fn.parameters.length===2&&body.length<1400){
   const ret=own(fn,ts.isReturnStatement).at(-1),chunk=text(ret?.expression),id=text(fn.parameters[1].name);
   if(/^[\w$]+$/.test(chunk))add('chunk_get_root',ret,`{chunk:b.id(${chunk}),status:${chunk}.status}`,`b.chunks.set(${chunk},${id});if(${id}!==0)return false;`);
  }
  if(body.includes('._fromJSON')&&body.includes('JSON.parse')&&body.includes('"blocked"')&&body.includes('"fulfilled"')){
   const rootOnly=`if(b.chunks.get(${param})!==0)return false;`;
   add('root_model_initialize',fn.body.statements[0],`{chunk:b.id(${param}),status:${param}.status}`,rootOnly);
   const fulfilled=own(fn,n=>ts.isBinaryExpression(n)&&directProp(n.left,'status')&&ts.isStringLiteral(n.right)&&n.right.text==='fulfilled')[0];
   add('root_model_fulfilled',fulfilled,`{chunk:b.id(${param}),status:${param}.status}`,rootOnly);
   const rejected=own(fn,n=>ts.isBinaryExpression(n)&&directProp(n.left,'status')&&ts.isStringLiteral(n.right)&&n.right.text==='rejected')[0];
   add('root_model_rejected',rejected,`{chunk:b.id(${param}),status:${param}.status}`,rootOnly);
   for(const ret of own(fn,ts.isReturnStatement)){
    const block=ancestor(ret,n=>ts.isIfStatement(n)&&text(n.expression).includes('.deps'));
    const dep=block&&all.find(n=>n.pos>=block.pos&&n.end<=block.end&&directProp(n,'deps'));
    if(dep)add('root_model_blocked_dependencies',ret,`{chunk:b.id(${param}),status:${param}.status,deps:${text(dep)}}`,rootOnly);
   }
  }
 }
 return {file,points,limitations};
}

export async function frozenObserver(page,lead) {
 const mode=process.env.AMM_FROZEN_MODE,dir=process.env.AMM_SESSION_ARTIFACT_DIR;
 if(!['control','probe'].includes(mode)||process.env.AMM_ISOLATED_SESSION_ACCEPTANCE!=='1'||process.env.VERCEL_ENV!=='development'||!dir)throw Error('isolated_frozen_browser_only');
 const build=readFileSync('.next/BUILD_ID','utf8').trim();
 const metadata={mode,build,created:new Date().toISOString(),maps:[],unresolved:[],pauses:[],network:[],captures:[],detach:null};
 await page.addInitScript(({build})=>{
  const ids=new WeakMap();let next=0;
  globalThis.__ammFrozen={build,active:false,seq:0,events:[],overflow:0,errors:0,chunks:new WeakMap(),id:o=>{if(!o||(typeof o!=='object'&&typeof o!=='function'))return null;if(!ids.has(o))ids.set(o,++next);return ids.get(o);}};
  document.addEventListener('click',e=>{if(e.target instanceof Element&&e.target.closest('button')?.textContent==='Review latest record (keep draft)')globalThis.__ammFrozen.active=true;},{capture:true,passive:true});
 },{build});
 const cdp=await page.context().newCDPSession(page),pending=[],breakpoints=[],seen=new Set(),requests=new Set();
 cdp.on('Debugger.paused',event=>{
  // No pause is requested. Record unexpected pause and immediately resume;
  // any such event invalidates timing-neutral evidence for this run.
  metadata.pauses.push({reason:event.reason,at:new Date().toISOString()});
  void cdp.send('Debugger.resume').catch(()=>{});
 });
 cdp.on('Network.requestWillBeSent',e=>{try{const u=new URL(e.request.url);if(u.hostname==='localhost'&&u.pathname==='/admin/today')requests.add(e.requestId);}catch{}});
 cdp.on('Network.responseReceived',e=>{if(requests.has(e.requestId))metadata.network.push({event:'headers',id:e.requestId,t:e.timestamp,status:e.response.status,serverId:e.response.headers['x-amm-diag-request']||null});});
 cdp.on('Network.loadingFinished',e=>{if(requests.has(e.requestId))metadata.network.push({event:'finished',id:e.requestId,t:e.timestamp,bytes:e.encodedDataLength});});
 cdp.on('Network.loadingFailed',e=>{if(requests.has(e.requestId))metadata.network.push({event:'failed',id:e.requestId,t:e.timestamp,error:e.errorText,canceled:e.canceled});});
 cdp.on('Debugger.scriptParsed',event=>{
  let url;try{url=new URL(event.url);}catch{return;}
  if(url.hostname!=='localhost'||!url.pathname.startsWith('/_next/static/')||!url.pathname.endsWith('.js')||seen.has(event.scriptId))return;
  seen.add(event.scriptId);
  pending.push((async()=>{
   const {scriptSource}=await cdp.send('Debugger.getScriptSource',{scriptId:event.scriptId});
   const mapped=mapScript(scriptSource),record={script:event.scriptId,path:url.pathname,sha256:sha(scriptSource),browserHash:event.hash,points:[],limitations:mapped.limitations};
   metadata.maps.push(record);
   const occupied=new Set();
   for(const point of mapped.points){
    const start=mapped.file.getLineAndCharacterOfPosition(point.start),end=mapped.file.getLineAndCharacterOfPosition(point.end);
    const possible=await cdp.send('Debugger.getPossibleBreakpoints',{start:{scriptId:event.scriptId,lineNumber:start.line,columnNumber:start.character},end:{scriptId:event.scriptId,lineNumber:end.line,columnNumber:end.character},restrictToFunction:false});
    const location=possible.locations[0];
    if(!location){metadata.unresolved.push({path:url.pathname,stage:point.stage,start});continue;}
    const key=`${location.lineNumber}:${location.columnNumber}`;
    if(occupied.has(key)){metadata.unresolved.push({path:url.pathname,stage:point.stage,reason:'collapsed executable location',location});continue;}
    occupied.add(key);
    const actual=mapped.file.getPositionOfLineAndCharacter(location.lineNumber,location.columnNumber||0);
    const p={stage:point.stage,requested:start,actual:location,excerpt:scriptSource.slice(Math.max(0,actual-80),Math.min(scriptSource.length,actual+180)),fields:point.fields,active:mode==='probe'};
    record.points.push(p);
    if(mode==='probe'){
     const condition=`(()=>{try{const b=globalThis.__ammFrozen;if(!b||!b.active)return false;${point.setup}if(b.events.length<2048)b.events.push({q:++b.seq,t:performance.now(),stage:${JSON.stringify(point.stage)},v:${point.fields}});else b.overflow++;}catch(e){if(globalThis.__ammFrozen)globalThis.__ammFrozen.errors++;}return false})()`;
     const result=await cdp.send('Debugger.setBreakpoint',{location,condition});
     breakpoints.push(result.breakpointId);p.resolved=result.actualLocation;
     if(result.actualLocation.lineNumber!==location.lineNumber||result.actualLocation.columnNumber!==location.columnNumber)metadata.unresolved.push({stage:point.stage,reason:'resolved location changed',requested:location,actual:result.actualLocation});
    }
   }
  })().catch(e=>metadata.unresolved.push({script:event.scriptId,error:String(e).slice(0,300)})));
 });
 await cdp.send('Network.enable');
 await cdp.send('Debugger.enable');
 const capture=async()=>{
  try{
   const snapshot=await page.evaluate(()=>{const b=globalThis.__ammFrozen;return b?{build:b.build,active:b.active,events:b.events,overflow:b.overflow,errors:b.errors}:null;});
   metadata.captures.push({at:new Date().toISOString(),snapshot});
  }catch(e){metadata.unresolved.push({capture:String(e).slice(0,200)});}
 };
 return {capture,prepare:async()=>{await Promise.allSettled(pending);metadata.prepared={at:new Date().toISOString(),scripts:metadata.maps.length,breakpoints:breakpoints.length};},finish:async()=>{
  await capture();
  await Promise.allSettled(pending);
  for(const breakpointId of breakpoints)await cdp.send('Debugger.removeBreakpoint',{breakpointId}).catch(()=>{});
  await cdp.detach();metadata.detach={at:new Date().toISOString(),removedBreakpoints:breakpoints.length};
  writeFileSync(path.join(dir,'frozen-logpoints.json'),JSON.stringify(metadata,null,2),{mode:0o600});
 }};
}
