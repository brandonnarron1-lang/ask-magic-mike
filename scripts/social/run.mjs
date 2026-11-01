// Node24. Default is local preview only; no secrets read and no network calls.
// --execute requires the release-reviewed policy, dedicated Buffer binding,
// pre-provisioned durable ledger and public media hashes to match.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { easternNoon, replenish, cancelQueued } from '../../src/lib/social/publisher.ts';
import { BufferProvider } from '../../src/lib/social/buffer.ts';
import { GitHubLedgerStore } from '../../src/lib/social/github-store.ts';
const policy=JSON.parse(await fs.readFile('config/owned-social-policy.json','utf8'));
const content=JSON.parse(await fs.readFile('config/owned-social-content.json','utf8'));
const edition=policy.mediaEdition||'owned-launch-v1';
if(!['owned-launch-v1','owned-launch-v2'].includes(edition))throw Error('unreviewed_asset_edition');
const manifest=JSON.parse(await fs.readFile(`public/social/${edition}/asset-manifest.json`,'utf8'));
const args=process.argv.slice(2), execute=args.includes('--execute');
const now=new Date();
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const tomorrow=new Date(today+'T12:00:00Z'); tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
const start=args.find(a=>a.startsWith('--start='))?.slice(8)||(Date.parse(easternNoon(today))>+now+60_000?today:tomorrow.toISOString().slice(0,10));
const platforms=['facebook','instagram','tiktok'];
const items=[];
for(let i=0;i<content.concepts.length;i++) {
  const c=content.concepts[i], date=new Date(start+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+i);
  for(const platform of platforms) {
    const video=c.format==='video', names=video?[`${c.id}.mp4`]:[1,2,3].map(n=>`${c.id}-slide-${n}.jpg`);
    const destination=new URL(c.offer==='buyer'?'/buy':c.offer==='compare'?'/sell?seller_option=compare':'/home-value','https://www.askmagicmike.com');
    for(const [k,v] of Object.entries({utm_source:platform,utm_medium:'organic_social',utm_campaign:'amm_seller_buyer_launch_2026',utm_content:`${c.offer}_${platform}`})) destination.searchParams.set(k,v);
    const action=platform==='facebook'?`\n\n${destination.href}`:`\n\n${c.cta} through the website link in our profile.`;
    items.push({id:c.id,platform,category:c.category,text:c.caption+(edition==='owned-launch-v2'?'\n\nIllustrative brand imagery—not a listing.':'')+action,destination:destination.href,policyVersion:policy.version,rights:content.rights,sourceReferences:content.sourceReferences,aiAssisted:true,requiresAiDisclosure:edition==='owned-launch-v2',dueAt:easternNoon(date.toISOString().slice(0,10)),assets:names.map(name=>{
      const file=manifest.files.find(f=>f.name===name); if(!file) throw Error('rendered_asset_missing');
      return {url:`https://www.askmagicmike.com/social/${edition}/${name}`,sha256:file.sha256,type:video?'video':'image',alt:`${c.title.join(' ')} ${c.points.join(' ')} Our Town Properties, Inc.${edition==='owned-launch-v2'?' Illustrative brand imagery, not a listing.':''}`};
    })});
  }
}
if(!execute) {
  console.log(JSON.stringify({status:'PREPARED_NOT_SCHEDULED',policyPaused:policy.masterPaused,start,timezone:'America/New_York',...(args.includes('--summary')?{concepts:content.concepts.length,variants:items.length,firstDue:items[0].dueAt}: {items})},null,2));
} else {
  if(policy.masterPaused&&!args.includes('--cancel-queued')) throw Error('master_paused_no_external_calls');
  const key=process.env.AMM_SOCIAL_BUFFER_KEY, org=process.env.AMM_SOCIAL_BUFFER_ORG, token=process.env.AMM_SOCIAL_STATE_TOKEN;
  if(!key||!org||!token) throw Error('dedicated_social_binding_missing');
  const provider=new BufferProvider(key,org,policy.channels);
  const store=new GitHubLedgerStore(token);
  if(args.includes('--cancel-queued')) {
    const channel=args.find(a=>a.startsWith('--channel='))?.slice(10);
    if(channel&&!policy.channels.some(c=>c.id===channel)) throw Error('channel_not_in_owned_scope');
    if(!policy.masterPaused&&!(channel&&policy.channels.find(c=>c.id===channel)?.paused)) throw Error('save_pause_before_remote_cancellation');
    console.log(JSON.stringify({cancelled:await cancelQueued(store,provider,channel)}));
  } else {
    // Hash bytes actually served; never schedule unpublished or changed media.
    for(const asset of [...new Map(items.flatMap(i=>i.assets).map(a=>[a.url,a])).values()]) {
      const response=await fetch(asset.url,{redirect:'error',signal:AbortSignal.timeout(15_000)});
      const declared=Number(response.headers.get('content-length'));
      if(!response.ok||!Number.isFinite(declared)||declared<=0||declared>8_000_000) throw Error('public_media_unavailable_or_oversize');
      const bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length>8_000_000||createHash('sha256').update(bytes).digest('hex')!==asset.sha256) throw Error('public_media_hash_mismatch');
    }
    const result=await replenish({policy,items,store,provider,now});
    console.log(JSON.stringify({status:result.held.length?'INTERVENTION_REQUIRED':'RECONCILED',...result}));
    if(result.held.length) process.exitCode=2;
  }
}
