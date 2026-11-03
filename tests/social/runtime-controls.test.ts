// @vitest-environment node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script="./scripts/social/run.mjs";
function run(outcome:"unknown"|"full"|"ledger_failure"|"scheduled", scheduledTrigger=false){
  // Native Node24 runner, all filesystem policy input and outbound providers
  // replaced before import. No credentials, live data, browser, or real network.
  const code=`
    import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
    const read=fs.readFile.bind(fs),stamp='2026-11-03T02:00:00Z',RealDate=Date;
    globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[stamp]));}static now(){return +new RealDate(stamp);}};
    const outcome=${JSON.stringify(outcome)}, bytes=Buffer.from('synthetic media'),channel='synthetic-ig';
    const policy={version:'synthetic',masterPaused:false,channels:[{id:channel,platform:'instagram',accountId:'synthetic-handle',accountIdentity:'handle',ownerVerifiedAt:stamp,paused:false,automaticFormats:['image'],profileLinkVerified:true,disclosureVerified:true,capability:{status:'verified',evidence:'synthetic',observedAt:stamp,recheckAfter:'2026-11-10T00:00:00Z',destinationPaths:['/home-value']}}],brokerageAdvertisingApproval:{reference:'synthetic',scope:'owned_evergreen'},entitlement:{plan:'Free',verifiedAt:stamp,expiresAt:'2026-11-10T00:00:00Z',runtimeZeroCostVerified:true,channelLimit:3,queueLimit:10},allowedCategories:['existing_offer'],caps:{channels:3,queuePerChannel:7,providerQueueHardLimit:10,createsPerRun:1,apiCallsPerRun:50,ledgerEntries:1000}};
    fs.readFile=async(path,...args)=>String(path)==='config/owned-social-policy.json'?JSON.stringify(policy):String(path)==='config/owned-social-content.json'?JSON.stringify({concepts:[{id:'01',offer:'seller',category:'existing_offer',format:'carousel',caption:'Our Town Properties, Inc. Request human review.',cta:'Home Value Review',title:['Synthetic'],points:['Synthetic']}],rights:'approved_owned',sourceReferences:['config/experience-contract.v1.json']}):String(path).endsWith('asset-manifest.json')?JSON.stringify({files:[1,2,3].map(n=>({name:'01-slide-'+n+'.jpg',sha256:createHash('sha256').update(bytes).digest('hex')}))}):read(path,...args);
    let ledger={revision:0,intents:[],masterPaused:false},post=null,issue=null,creates=0;
    const inventory=()=>outcome==='full'?Array.from({length:7},(_,n)=>({node:{id:'other-'+n,channelId:channel,status:'scheduled',text:'Existing',dueAt:'2026-11-0'+(n+3)+'T17:00:00Z',assets:[]}})):post?[{node:post}]:[];
    globalThis.fetch=async(url,options={})=>{
      url=String(url);const method=options.method||'GET',body=options.body?JSON.parse(String(options.body)):{};
      if(url.startsWith('https://api.github.com/repos/brandonnarron1-lang/ask-magic-mike/contents/')){
        if(outcome==='ledger_failure')return new Response('{}',{status:503});
        if(method==='PUT'){ledger=JSON.parse(Buffer.from(body.content,'base64').toString());return Response.json({});}
        return Response.json({sha:'synthetic-'+ledger.revision,encoding:'base64',size:JSON.stringify(ledger).length,content:Buffer.from(JSON.stringify(ledger)).toString('base64')});
      }
      if(url.startsWith('https://api.github.com/repos/brandonnarron1-lang/ask-magic-mike/issues')){
        if(method==='POST'){issue={...body,number:999,state:'open',html_url:'https://github.com/brandonnarron1-lang/ask-magic-mike/issues/999'};return Response.json(issue);}
        return Response.json(url.includes('?state=')?(issue?[issue]:[]):issue);
      }
      if(url==='https://api.buffer.com'){
        if(body.query.includes('channel(input'))return Response.json({data:{channel:{id:channel,name:'synthetic-handle',organizationId:'synthetic-org',service:'instagram',type:'business',isDisconnected:false,isLocked:false}}});
        if(body.query.includes('posts(input'))return Response.json({data:{posts:{edges:inventory(),pageInfo:{hasNextPage:false}}}});
        if(body.query.startsWith('mutation')){
          creates++;if(outcome==='unknown')throw Error('synthetic timeout');
          const i=body.variables.input;post={id:'synthetic-post',channelId:channel,status:'scheduled',text:i.text,dueAt:i.dueAt,assets:i.assets.map(a=>({source:a.image.url})),metadata:{isAiGenerated:true},schedulingType:'automatic'};
          return Response.json({data:{createPost:{__typename:'PostActionSuccess',post}}});
        }
        if(body.query.includes('post(input'))return Response.json({data:{post}});
      }
      if(url.startsWith('https://www.askmagicmike.com/social/'))return new Response(bytes,{headers:{'content-length':String(bytes.length)}});
      throw Error('UNEXPECTED_OUTBOUND_FORBIDDEN');
    };
    process.argv=['node','run','--execute'];await import('${script}');
    console.log(JSON.stringify({fixtureCreates:creates,fixtureLedger:ledger,fixtureIssue:!!issue}));
  `;
  // Project ambient ProcessEnv requires Production keys. Intentionally do NOT
  // inherit or populate them in this isolated child; only synthetic bindings.
  const result=spawnSync(process.execPath,["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON","--input-type=module","-e",code],{encoding:"utf8",env:{PATH:process.env.PATH!,HOME:process.env.HOME!,AMM_OWNED_SOCIAL_ENABLED:"true",AMM_OWNED_SOCIAL_SCHEDULE_ENABLED:scheduledTrigger?"true":"false",GITHUB_EVENT_NAME:scheduledTrigger?"schedule":"workflow_dispatch",AMM_SOCIAL_OPERATOR_SIGNALS_ENABLED:"true",AMM_SOCIAL_STATE_TOKEN:"synthetic",AMM_SOCIAL_BUFFER_KEY:"synthetic",AMM_SOCIAL_BUFFER_ORG:"synthetic-org",GITHUB_REPOSITORY:"brandonnarron1-lang/ask-magic-mike"} as unknown as NodeJS.ProcessEnv});
  expect(result.stderr).toBe("");return {status:result.status,lines:result.stdout.trim().split("\n").map(s=>JSON.parse(s))};
}
describe("Integrated publisher runtime, mocked state/provider/alerts",()=>{
  it("does not leave an UNKNOWN provider outcome green or without an incident",()=>{
    const r=run("unknown");expect(r.status).toBe(2);expect(r.lines[0]).toMatchObject({status:"INTERVENTION_REQUIRED",operatorSignal:{status:"CREATED"}});
    expect(r.lines[1]).toMatchObject({fixtureCreates:1,fixtureIssue:true,fixtureLedger:{intents:[{state:"unknown"}]}});
  });
  it("queue-full is a no-create deferral and not an operator notification",()=>{
    const r=run("full");expect(r.status).toBe(0);expect(r.lines[0]).toMatchObject({status:"HELD_OR_DEFERRED",operatorSignal:{status:"NO_INCIDENT"}});expect(r.lines[1].fixtureCreates).toBe(0);expect(r.lines[1].fixtureIssue).toBe(false);
  });
  it("ledger failure prevents a provider create and produces an explicit signal",()=>{
    const r=run("ledger_failure");expect(r.status).toBe(2);expect(r.lines[1].fixtureCreates).toBe(0);expect(r.lines[0]).toMatchObject({status:"INTERVENTION_REQUIRED",operatorSignal:{status:"CREATED"}});
  });
  it("checkpoints actual readback as scheduled, not published",()=>{
    const r=run("scheduled");expect(r.status).toBe(0);expect(r.lines[0]).toMatchObject({status:"COMPLETED",created:1});expect(r.lines[1]).toMatchObject({fixtureCreates:1,fixtureLedger:{intents:[{state:"scheduled",providerId:"synthetic-post"}],health:{lastScheduling:expect.any(String)}}});expect(r.lines[1].fixtureLedger.health.lastPublication).toBeUndefined();
  });
  it("unset/false runtime kill switch makes execute and resume network-free",()=>{
    for(const mode of ['--execute','--resume']){
      const r=spawnSync(process.execPath,["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON","--input-type=module","-e",`globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN')};process.argv=['node','run','${mode}'];await import('${script}')`],{encoding:'utf8',env:{PATH:process.env.PATH!,HOME:process.env.HOME!,AMM_OWNED_SOCIAL_ENABLED:'false'} as unknown as NodeJS.ProcessEnv});
      expect(r.status).toBe(0);expect(JSON.parse(r.stdout)).toEqual({status:'RUNTIME_PAUSED_NO_EFFECTS'});
    }
  });
  it("keeps recurring execution network-free while an authorized manual pilot is enabled",()=>{
    const r=spawnSync(process.execPath,["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON","--input-type=module","-e",`globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN')};process.argv=['node','run','--execute'];await import('${script}')`],{encoding:'utf8',env:{PATH:process.env.PATH!,HOME:process.env.HOME!,AMM_OWNED_SOCIAL_ENABLED:'true',AMM_OWNED_SOCIAL_SCHEDULE_ENABLED:'false',GITHUB_EVENT_NAME:'schedule'} as unknown as NodeJS.ProcessEnv});
    expect(r.status).toBe(0);expect(JSON.parse(r.stdout)).toEqual({status:'SCHEDULER_PAUSED_NO_EFFECTS'});
  });
  it("the enabled scheduler uses the same readback/checkpoint path and records its actual trigger",()=>{
    const r=run('scheduled',true);expect(r.status).toBe(0);expect(r.lines[1].fixtureLedger.health.trigger).toBe('scheduled');expect(r.lines[1].fixtureLedger.intents[0].state).toBe('scheduled');
  });
  it("keeps both source exclusions and the PR318 mandatory browser acceptance",()=>{
    const config=JSON.parse(readFileSync('vercel.json','utf8'));
    for(const branch of ['codex/mobile-direct-contact-20261101','codex/owned-social-publisher-20261101','codex/owned-social-publication-state','codex/instagram-home-value-reserve-20261103'])expect(config.git.deploymentEnabled[branch]).toBe(false);
    expect(readFileSync('.github/workflows/release-gate.yml','utf8')).toContain('public-contact-mobile.spec.ts');
    expect(readFileSync('src/lib/analytics/privacy.ts','utf8')).toContain('sms_composer_opened');
    const workflow=readFileSync('.github/workflows/owned-social.yml','utf8');expect(workflow).toBe(readFileSync('scripts/social/owned-social-workflow.yml','utf8'));
    expect(workflow).toContain('17 11 * * *');expect(workflow).toContain('github.token');expect(workflow).toContain('issues: write');expect(workflow).toContain("vars.AMM_OWNED_SOCIAL_ENABLED == 'true'");expect(workflow).toContain("vars.AMM_OWNED_SOCIAL_SCHEDULE_ENABLED == 'true'");
  });
});
