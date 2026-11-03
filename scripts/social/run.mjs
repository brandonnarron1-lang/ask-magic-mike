// Node24. Default plan reads only local reviewed files; no keys/network.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
const root=new URL('../../src/lib/social/',import.meta.url).href;
// Resolve only the reviewed extensionless Next module graph for native Node TS.
registerHooks({resolve(s,c,next){return next(c.parentURL?.startsWith(root)&&['./publisher','./operations'].includes(s)?s+'.ts':s,c);}});
const {easternNoon,replenish,cancelQueued,pausePublisher}=await import('../../src/lib/social/publisher.ts');
const {observe,reconcile,plan,classify,actionableFindings,checkpointIncidents,acknowledgeIncident,resumePublisher}=await import('../../src/lib/social/operations.ts');
const {BufferProvider}=await import('../../src/lib/social/buffer.ts');
const {GitHubLedgerStore}=await import('../../src/lib/social/github-store.ts');
const {signalOperator}=await import('../../src/lib/social/operator-signal.ts');
let failureStore;
async function report(result,incidents=[]){
  const actionable=incidents.filter(i=>!i.resolvedAt);
  const needsAction=result.status==='INTERVENTION_REQUIRED'||actionable.length>0;
  if(needsAction)process.exitCode=2; // Never conceal intervention behind a green run.
  let signal={status:'NOT_CONFIGURED'};
  if(process.env.AMM_SOCIAL_OPERATOR_SIGNALS_ENABLED==='true'){
    try{signal=await signalOperator({token:process.env.AMM_SOCIAL_STATE_TOKEN,repository:process.env.GITHUB_REPOSITORY,incidents});}
    catch{signal={status:'UNCONFIRMED_NO_RETRY'};process.exitCode=2;}
  }
  const signalFailed=signal.status==='UNCONFIRMED_NO_RETRY';
  const reasons=(result.holds||[]).map(h=>typeof h==='string'?h:h.code).filter(c=>/^[a-z0-9_:.-]{1,150}$/.test(c)).slice(0,30);
  if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## Owned Instagram operation\n\n${needsAction||signalFailed?'**INTERVENTION REQUIRED**':result.status}\n\nOperator signal: ${signal.status}${signal.url?' — '+signal.url:''}. Active incidents: ${actionable.length}.\n\n${reasons.map(c=>'- '+c).join('\n')}\n\nScheduled is not published. A GitHub issue is not proof of Brandon receiving email or push. No independent missed-run monitor is installed.\n`);
  console.log(JSON.stringify({...result,...(signalFailed?{status:'INTERVENTION_REQUIRED',signalCode:'operator_signal_unconfirmed'}:{}),operatorSignal:signal,activeIncidents:actionable.length}));
}
try {
const args=process.argv.slice(2), modes=args.filter(a=>['--observe','--reconcile','--execute','--status','--pause','--resume','--acknowledge','--cancel-queued'].includes(a));
if(modes.length>1)throw Error('choose_one_operation');
if(args.some(a=>!['--plan','--summary',...modes].includes(a)&&!/^--(snapshot|channel|incident)=.+/.test(a)))throw Error('unsupported_argument');
const mode=modes[0]||'--plan';
if(mode==='--execute'&&process.env.GITHUB_EVENT_NAME==='schedule'&&process.env.AMM_OWNED_SOCIAL_SCHEDULE_ENABLED!=='true'){
  console.log(JSON.stringify({status:'SCHEDULER_PAUSED_NO_EFFECTS'}));
  process.exit(0);
}
if(['--execute','--resume'].includes(mode)&&process.env.AMM_OWNED_SOCIAL_ENABLED!=='true'){
  console.log(JSON.stringify({status:'RUNTIME_PAUSED_NO_EFFECTS'}));
  process.exit(0);
}
if(mode==='--execute'&&(process.env.AMM_SOCIAL_OPERATOR_SIGNALS_ENABLED!=='true'||process.env.GITHUB_REPOSITORY!=='brandonnarron1-lang/ask-magic-mike'))throw Error('operator_signal_binding_missing');
const policy=JSON.parse(await fs.readFile('config/owned-social-policy.json','utf8'));
const content=JSON.parse(await fs.readFile('config/owned-social-content.json','utf8'));
const edition=policy.mediaEdition||'owned-launch-v1';
if(!['owned-launch-v1','owned-launch-v2'].includes(edition))throw Error('unreviewed_asset_edition');
const manifest=JSON.parse(await fs.readFile('public/social/'+edition+'/asset-manifest.json','utf8'));
const now=new Date(),items=[];
for(const c of content.concepts)for(const platform of ['facebook','instagram','tiktok']){
  const video=c.format==='video',names=video?[c.id+'.mp4']:[1,2,3].map(n=>c.id+'-slide-'+n+'.jpg');
  const destination=new URL(c.offer==='buyer'?'/buy':c.offer==='compare'?'/sell?seller_option=compare':'/home-value','https://www.askmagicmike.com');
  for(const [k,v]of Object.entries({utm_source:platform,utm_medium:'organic_social',utm_campaign:'amm_seller_buyer_launch_2026',utm_content:c.offer+'_'+platform}))destination.searchParams.set(k,v);
  items.push({id:c.id,platform,category:c.category,text:c.caption+(edition==='owned-launch-v2'?'\n\nIllustrative brand imagery—not a listing.':'')+(platform==='facebook'?'\n\n'+destination.href:'\n\n'+c.cta+' through the website link in our profile.'),destination:destination.href,policyVersion:policy.version,rights:content.rights,sourceReferences:content.sourceReferences,aiAssisted:true,requiresAiDisclosure:edition==='owned-launch-v2',dueAt:easternNoon('2026-11-02'),assets:names.map(name=>{
    const file=manifest.files.find(f=>f.name===name);if(!file)throw Error('rendered_asset_missing');
    return {url:'https://www.askmagicmike.com/social/'+edition+'/'+name,sha256:file.sha256,type:video?'video':'image',alt:c.title.join(' ')+' '+c.points.join(' ')+' Our Town Properties, Inc.'+(edition==='owned-launch-v2'?' Illustrative brand imagery, not a listing.':'')};
  })});
}
const snapshotArg=args.find(a=>a.startsWith('--snapshot='));
const snapshot=snapshotArg?JSON.parse(await fs.readFile(snapshotArg.slice(11),'utf8')):null;
const blank={revision:0,intents:[]},empty={complete:true,posts:[],disconnected:[]};
function summary(ledger,inventory){
  const p=plan(policy,items,ledger,inventory,now);
  return {observedAt:now.toISOString(),timezone:'America/New_York',concepts:content.concepts.length,variants:items.length,selected:p.selected.map(i=>({id:i.id,platform:i.platform,dueAt:i.dueAt})),remainingUnused:p.remainingUnused,holds:p.held.map(code=>({code,outcome:classify(code)})),queue:policy.channels.map(c=>({channelId:c.id,scheduled:inventory.posts.filter(p=>p.channelId===c.id&&['buffer','scheduled','sending'].includes(p.status)).length})),nativeFacebookCoverage:'REQUIRES_CURRENT_NATIVE_OBSERVATION',...(!args.includes('--summary')?{items:p.selected}:{})};
}
if(mode==='--plan')console.log(JSON.stringify({status:'PREPARED_NOT_SCHEDULED',snapshot:snapshot?'SUPPLIED_NOT_LIVE':'NO_REMOTE_COVERAGE',...summary(snapshot?.ledger||blank,snapshot?.inventory||empty)},null,2));
else{
  const token=process.env.AMM_SOCIAL_STATE_TOKEN,store=token?new GitHubLedgerStore(token):null;
  failureStore=store;
  const channel=args.find(a=>a.startsWith('--channel='))?.slice(10);
  if(channel&&!policy.channels.some(c=>c.id===channel))throw Error('channel_not_in_owned_scope');
  if(mode==='--status'||mode==='--pause'||mode==='--acknowledge'){
    if(!store)throw Error('dedicated_social_state_binding_missing');
    if(mode==='--pause')await pausePublisher(store,channel);
    if(mode==='--acknowledge')await acknowledgeIncident(store,args.find(a=>a.startsWith('--incident='))?.slice(11)||'',now);
    const s=await store.read();console.log(JSON.stringify({status:mode==='--pause'?'PAUSE_SAVED':mode==='--acknowledge'?'ACKNOWLEDGEMENT_SAVED':'OBSERVED',revision:s.revision,masterPaused:policy.masterPaused||s.masterPaused||false,pausedChannels:s.pausedChannels||[],intents:s.intents.length,unresolved:s.intents.filter(i=>['unknown','processing'].includes(i.state)).length,health:s.health||null,incidents:s.incidents||[]}));
  }else{
    const key=process.env.AMM_SOCIAL_BUFFER_KEY,org=process.env.AMM_SOCIAL_BUFFER_ORG;
    if(!key||!org)throw Error('dedicated_social_binding_missing');
    const provider=new BufferProvider(key,org,policy.channels);
    if(mode==='--cancel-queued'){
      if(!store)throw Error('dedicated_social_state_binding_missing');
      console.log(JSON.stringify({status:'CANCELLATION_READBACK_CONFIRMED',cancelled:await cancelQueued(store,provider,channel)}));
    }else{
      const inventory=await observe(provider);
      if(mode==='--observe')console.log(JSON.stringify({status:'OBSERVED_NO_MUTATIONS',coverage:'BUFFER_ONLY_NATIVE_FACEBOOK_NOT_OBSERVED',...summary(snapshot?.ledger||blank,inventory)}));
      else{
        if(!store)throw Error('dedicated_social_state_binding_missing');
        await reconcile(store,inventory,now);
        const old=await store.read(),p=plan(policy,items,old,inventory,now);
        const findings=actionableFindings(policy,p.held,old);
        const checkpoint=checkpointIncidents(old.incidents||[],findings,now);
        if(!(await store.compareAndSwap(old.revision,{...old,revision:old.revision+1,incidents:checkpoint.incidents,health:{...old.health,lastStart:now.toISOString(),lastCompleted:mode==='--reconcile'?new Date().toISOString():old.health?.lastCompleted,trigger:process.env.GITHUB_EVENT_NAME==='schedule'?'scheduled':'manual'}})))throw Error('incident_checkpoint_conflict');
        if(mode==='--reconcile')await report({status:findings.length?'INTERVENTION_REQUIRED':'RECONCILED_LEDGER_CHANGED',notify:checkpoint.notify,...summary(await store.read(),inventory)},checkpoint.incidents);
        else if(mode==='--resume'){
          if(policy.masterPaused)throw Error('source_policy_paused_no_resume');
          await resumePublisher(store,inventory,new Date(),channel);
          console.log(JSON.stringify({status:'DURABLE_PAUSE_CLEARED_NO_PROVIDER_CREATE'}));
        }
        else{
          for(const asset of [...new Map(p.selected.flatMap(i=>i.assets).map(a=>[a.url,a])).values()]){
            const r=await fetch(asset.url,{redirect:'error',signal:AbortSignal.timeout(15_000)}),size=Number(r.headers.get('content-length'));
            if(!r.ok||!Number.isFinite(size)||size<=0||size>8_000_000)throw Error('public_media_unavailable_or_oversize');
            const bytes=Buffer.from(await r.arrayBuffer());
            if(bytes.length>8_000_000||createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error('public_media_hash_mismatch');
          }
          const r=p.selected.length?await replenish({policy,items:p.selected,store,provider,now}):{created:0,reconciled:0,held:[]};
          const completed=await store.read();
          const holds=[...p.held,...r.held];
          const final=checkpointIncidents(completed.incidents||[],actionableFindings(policy,holds,completed),new Date());
          if(!(await store.compareAndSwap(completed.revision,{...completed,revision:completed.revision+1,incidents:final.incidents,health:{...completed.health,lastCompleted:new Date().toISOString(),...(r.created?{lastScheduling:new Date().toISOString()}:{})}})))throw Error('completion_checkpoint_conflict');
          await report({status:final.incidents.some(i=>!i.resolvedAt)?'INTERVENTION_REQUIRED':r.created?'COMPLETED':holds.length?'HELD_OR_DEFERRED':'NO_WORK',...r,holds:holds.map(code=>({code,outcome:classify(code)})),notify:[...new Set([...checkpoint.notify,...final.notify])]},final.incidents);
        }
      }
    }
  }
}
} catch(error) {
  const code=/^[a-z0-9_:.-]{1,150}$/.test(error?.message||'')?error.message:'operation_failed_redacted';
  let incidentState='UNAVAILABLE',notify=[],incidents=checkpointIncidents([],[{code,channelId:'shared'}],new Date(),false).incidents;
  // Do not retry an uncertain state mutation in the error handler.
  if(failureStore&&!/ledger|checkpoint|conflict|durable|schema/.test(code))try{
    const old=await failureStore.read(),c=checkpointIncidents(old.incidents||[],[{code,channelId:'shared'}],new Date(),false);
    incidents=c.incidents;
    if(await failureStore.compareAndSwap(old.revision,{...old,revision:old.revision+1,incidents:c.incidents})){incidentState='SAVED';notify=c.notify;}
  }catch{ /* Permission/state failures remain explicit; no fallback ledger. */ }
  await report({status:'INTERVENTION_REQUIRED',code,incidentState,notify},incidents);process.exitCode=2;
}
