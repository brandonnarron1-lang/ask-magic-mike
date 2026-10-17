import {Pool} from "pg";
import {expect,test} from "@playwright/test";

test.skip(process.env.AMM_CONCIERGE_HANDOFF_ACCEPTANCE!=="1"||process.env.AMM_ISOLATED_SESSION_ACCEPTANCE!=="1","Owned real isolated PostgreSQL harness required");
test("reviewed question reaches canonical test capture once; answer does not become consent or a property fact",async({page,baseURL})=>{
  const url=new URL(process.env.DATABASE_URL!);
  if(url.hostname!=="localhost"||url.pathname!=="/amm_qa_upgrade"||process.env.VERCEL_ENV!=="development"||process.env.PREVIEW_URL||process.env.OPENAI_API_KEY||process.env.EMAIL_ENABLED!=="false") throw Error("owned_isolated_no_send_venue_required");
  const pool=new Pool({connectionString:url.href,max:1});
  const counts=async()=> (await pool.query("SELECT (SELECT count(*)::int FROM leads) leads,(SELECT count(*)::int FROM lead_notifications WHERE provider_message_id IS NOT NULL) provider_receipts")).rows[0];
  const before=await counts();
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  try{
    await page.route("**/*",async route=>new URL(route.request().url()).origin===new URL(baseURL!).origin?route.continue():route.abort("blockedbyclient"));
    await page.goto("/ask");
    await page.getByRole("textbox",{name:/Your real estate question/}).fill("How do I buy a home?");
    await page.getByRole("button",{name:"Send Question",exact:true}).click();
    if(process.env.AMM_E2E_BUILT==="1"){
      await expect(page.getByRole("alert").filter({hasText:"The assistant's answer"})).toContainText("answer did not come through");
      expect(await counts()).toEqual(before);expect(errors).toEqual([]);return;
    }
    await expect(page.getByRole("link",{name:"Our Town: approved service and intake requirements",exact:true})).toBeVisible();
    expect(await counts()).toEqual(before);
    await expect(page.getByLabel("Email",{exact:true})).toHaveValue("");
    await expect(page.getByRole("checkbox",{name:/I agree that Our Town Properties/})).not.toBeChecked();
    const reviewed="INTERNAL QA — DO NOT CONTACT — R2 SYNTHETIC. My corrected buying-plan question; no actual consumer inquiry or appointment.";
    await page.getByRole("textbox",{name:/Question for local follow-up/}).fill(reviewed);
    await page.getByLabel("Your name (optional)",{exact:true}).fill("INTERNAL QA — DO NOT CONTACT — R2 CONCIERGE");
    await page.getByLabel("Email",{exact:true}).fill("r2-concierge@example.test");
    await page.getByRole("checkbox",{name:/I agree that Our Town Properties/}).check();
    const response=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/leads"&&r.request().method()==="POST");
    await page.getByRole("button",{name:"Request local follow-up",exact:true}).click();
    expect((await response).status()).toBe(200);
    await expect(page.getByRole("button",{name:"Request a conversation",exact:true})).toBeVisible();
    const records=(await pool.query("SELECT is_test,communication_suppressed,email_suppressed,sms_suppressed,consent_email,consent_call,consent_sms,question_raw FROM leads WHERE email=$1",["r2-concierge@example.test"])).rows;
    expect(records).toHaveLength(1);
    // This actual chat contract retains the explicitly checked email evidence;
    // is_test plus channel suppression independently blocks consumer contact.
    // Do not falsify that evidence to match another funnel's test projection.
    expect(records[0]).toMatchObject({is_test:true,communication_suppressed:true,email_suppressed:true,sms_suppressed:true,consent_email:true,consent_call:false,consent_sms:false});
    expect(JSON.stringify(records[0])).toContain("My corrected buying-plan question");
    expect(JSON.stringify(records[0])).not.toContain("approved service and intake requirements");
    expect(await counts()).toEqual({...before,leads:before.leads+1});
    expect(errors).toEqual([]);
  }finally{await pool.end();}
});
