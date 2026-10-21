// @vitest-environment node
// Small synthetic aggregate contract; no migrations, app DB, providers or scale run.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startDatabase, stopDatabase } from "../support/qa-audit-postgres";
import { ACQUISITION_AGGREGATE_SQL, loadAcquisitionReport } from "../../app/lib/persistence/neonAcquisitionReport";
import { ACQUISITION_PLACEMENTS, type AcquisitionWindow } from "../../app/lib/growth/acquisition-window";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

const uuid=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const owner=uuid(900),otherOwner=uuid(901);
const principal:LeadCenterPrincipal={userId:"synthetic",role:"read_only_analyst",agentId:null,name:"Synthetic",email:"synthetic@example.test"};
describe.runIf(process.env.AMM_QA_POSTGRES_TEST==="1")("bounded all-source acquisition SQL: isolated synthetic PostgreSQL",()=>{
  let client:Client;let now:Date;let window:AcquisitionWindow;
  async function query(text:string,params:unknown[]){
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    try{await client.query("SET LOCAL statement_timeout='5000ms'");const result=await client.query(text,params);await client.query("COMMIT");return result.rows;}
    catch(error){await client.query("ROLLBACK");throw error;}
  }
  const read=(placement:AcquisitionWindow["placement"]="all",actor=principal)=>loadAcquisitionReport({...window,placement},actor,{query});
  beforeAll(async()=>{
    const url=await startDatabase({loopbackTcp:true});
    if(!url||new URL(url).hostname!=="127.0.0.1"||new URL(url).pathname!=="/amm_qa_upgrade")throw Error("owned_synthetic_database_required");
    client=new Client({connectionString:url});await client.connect();now=new Date();
    window={mode:"7",placement:"all",from:new Date(now.getTime()-7*86400000).toISOString(),to:now.toISOString(),label:"Synthetic bounded source test"};
    // Only columns consumed by these aggregate queries. No customer/contact table.
    await client.query(`CREATE TABLE leads(id uuid PRIMARY KEY,contact_id uuid,created_at timestamptz NOT NULL,is_test boolean DEFAULT false,communication_suppressed boolean DEFAULT false,status text DEFAULT 'new',assigned_agent_id uuid,is_duplicate boolean DEFAULT false);
      CREATE TABLE source_attribution(id uuid PRIMARY KEY,lead_id uuid UNIQUE,created_at timestamptz NOT NULL,utm_source text,utm_medium text,utm_campaign text,utm_content text,referrer_type text);
      CREATE TABLE lead_notifications(id uuid PRIMARY KEY,lead_id uuid,metadata jsonb DEFAULT '{}',provider_accepted_at timestamptz,status text,provider_message_id text,template_version text DEFAULT 'lead_alert_email_v6',notification_type text DEFAULT 'lead_alert',channel text DEFAULT 'email',recipient_type text DEFAULT 'internal');`);
    const inputs=[
      [1,101,"ourtownproperties","owned_media","wordpress_homepage_ask_mike",owner,null],
      [2,102,"ourtownproperties","owned_media","wordpress_we_buy_homes",otherOwner,null],
      [3,101,"ourtownproperties","owned_media","wordpress_listing_buyer",null,null],
      [4,101,"facebook","organic_social","seller_facebook",owner,null],
      [5,102,"instagram","social_organic","buyer_match",otherOwner,null],
      [6,103,null,"paid_social",null,owner,null],
      [7,104,"direct",null,null,owner,null],
      [8,101,null,null,null,owner,"direct"],
      [9,102,"google","organic_local",null,owner,null],
      [10,null,null,null,null,owner,null],
      [11,null,"unknown",null,null,owner,"unknown"],
      [12,104,null,null,null,owner,null],
    ] as const;
    for(const [n,contact,source,medium,content,agent,referrer]of inputs){
      await client.query("INSERT INTO leads(id,contact_id,created_at,assigned_agent_id,is_duplicate) VALUES($1,$2,$3,$4,$5)",[uuid(n),contact?uuid(contact):null,n===12?window.from:new Date(now.getTime()-86400000),agent,n===4]);
      if(n!==10)await client.query("INSERT INTO source_attribution(id,lead_id,created_at,utm_source,utm_medium,utm_campaign,utm_content,referrer_type) VALUES($1,$1,$2,$3,$4,$5,$6,$7)",[uuid(n),now,source,medium,n<=3?"amm_owned_demand_2026":"amm_seller_buyer_launch_2026",content,referrer]);
    }
    // Start inclusive, end exclusive, exact QA/status/null exclusions shared by both cohorts.
    for(const [n,created,isTest,suppressed,status]of [
      [20,window.to,false,false,"new"],[21,new Date(Date.parse(window.from)-1),false,false,"new"],
      [22,window.from,true,false,"new"],[23,window.from,false,true,"new"],
      [24,window.from,false,false,"spam"],[25,window.from,false,false,"test"],[26,window.from,false,false,"internal_qa"],
      [27,window.from,null,false,"new"],[28,window.from,false,null,"new"],[29,window.from,false,false,null],
    ]as const){
      await client.query("INSERT INTO leads(id,created_at,is_test,communication_suppressed,status,assigned_agent_id) VALUES($1,$2,$3,$4,$5,$6)",[uuid(n),created,isTest,suppressed,status,owner]);
      await client.query("INSERT INTO source_attribution(id,lead_id,created_at,utm_source,utm_medium,utm_campaign,utm_content) VALUES($1,$1,$2,'ourtownproperties','owned_media','amm_owned_demand_2026','wordpress_homepage_ask_mike')",[uuid(n),now]);
    }
    for(const [n,lead,operator,status,accepted,metadata,version,recipient]of [
      [201,4,"mike","sent",true,{},"lead_alert_email_v6","internal"],
      [202,4,"mike","sent",true,{provider_delivery_confirmed:true},"lead_alert_email_v6","internal"],
      [203,4,"brandon","permanently_failed",true,{provider_delivery_confirmed:true},"lead_alert_email_v6","internal"],
      [204,7,"brandon","retry_scheduled",false,{},"lead_alert_email_v6","internal"],
      [205,10,null,"pending",false,{},"lead_alert_email_v6","internal"],
      [206,6,"mike","pending",false,{},"lead_alert_email_v6","internal"],
      [207,5,"mike","sent",true,{},"lead_alert_email_v5","internal"],
      [208,9,"mike","sent",true,{},"lead_alert_email_v6","consumer"],
    ]as const)await client.query("INSERT INTO lead_notifications(id,lead_id,metadata,status,provider_accepted_at,provider_message_id,template_version,recipient_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[uuid(n),uuid(lead),JSON.stringify({...metadata,...(operator?{operator}:{})}),status,accepted?now:null,accepted?"synthetic-message":null,version,recipient]);
  },30000);
  afterAll(async()=>{await client?.end();stopDatabase();},30000);
  it("matches the unchanged historic SQL and counts all eligible sources without summing shared contacts",async()=>{
    const report=await read();expect(report.coverage).toBe("complete");
    expect(report.totals).toMatchObject({inquiries:3,contacts:2,unresolved:0});
    expect(report.allSources?.totals).toMatchObject({inquiries:12,contacts:4,unresolved:2});
    expect(report.allSources?.sources.map(row=>[row.key,row.counts.inquiries])).toEqual([["social",3],["direct",2],["other",4],["unknown",3]]);
    expect(report.allSources!.sources.reduce((sum,row)=>sum+row.counts.contacts,0)).toBeGreaterThan(4);
    const historic=await query(ACQUISITION_AGGREGATE_SQL,[window.from,window.to,JSON.stringify(ACQUISITION_PLACEMENTS.map(({key})=>({key}))),"all",null]);
    for(const row of historic.filter(row=>row.operator==="mike"))expect(row.inquiries).toBe(String(row.key==="all"?3:1));
    expect(JSON.stringify(report)).not.toMatch(/example\.test|contact_id|inquiry_id|synthetic-message|00000000-/);
  });
  it("keeps distinct represented inquiries, envelopes and current delivery/acceptance separate",async()=>{
    expect((await read()).allSources?.totals).toMatchObject({inquiries:12,unknownOperatorEnvelopes:1,
      mike:{inquiriesWithEnvelope:2,noV6Recorded:10,envelopes:3,providerAccepted:2,delivered:1,pending:1,unknown:1},
      brandon:{inquiriesWithEnvelope:2,noV6Recorded:10,envelopes:2,providerAccepted:1,failed:1,retry:1,delivered:0}});
  });
  it("limits placement only for WordPress and applies owner assignment equally to both cohorts",async()=>{
    const actor={...principal,role:"primary_lead_owner" as const,agentId:owner};
    const report=await read("wordpress_homepage_ask_mike",actor);
    expect(report.totals?.inquiries).toBe(1);expect(report.placements).toHaveLength(1);
    expect(report.allSources?.totals).toMatchObject({inquiries:9,contacts:4,unresolved:2});
    expect(report.allSources?.sources.map(row=>row.counts.inquiries)).toEqual([2,2,2,3]);
  });
  it("uses a read-only repeatable-read transaction and returns unavailable under RLS",async()=>{
    expect((await query("SELECT current_setting('transaction_read_only') AS ro,current_setting('transaction_isolation') AS isolation,current_setting('statement_timeout') AS timeout",[]))[0]).toEqual({ro:"on",isolation:"repeatable read",timeout:"5s"});
    await client.query("GRANT SELECT ON leads,source_attribution,lead_notifications TO anon;ALTER TABLE leads ENABLE ROW LEVEL SECURITY;CREATE POLICY synthetic_read ON leads FOR SELECT TO anon USING(true);SET ROLE anon");
    try{expect(await read()).toMatchObject({coverage:"unavailable",totals:null,allSources:null});}
    finally{await client.query("RESET ROLE;ALTER TABLE leads DISABLE ROW LEVEL SECURITY");}
  });
});
