import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pptxgen from "pptxgenjs";

const PPTX_TYPES = new pptxgen();
const SHAPE = PPTX_TYPES.ShapeType;
const CHART = PPTX_TYPES.ChartType;

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const out = path.join(repo, "output/phase8/presentations");
const data = JSON.parse(fs.readFileSync(path.join(repo, "output/phase8/data/current-system-state.json"), "utf8"));
fs.mkdirSync(out, { recursive: true });

const C = {
  black: "080808", ink: "101010", gold: "D5AF58", gold2: "E6C977",
  cream: "F6EEDB", white: "FFFFFF", muted: "B9B1A0", ruby: "A82E39",
  green: "2D7A59", amber: "A56B1F", gray: "383838", line: "5B4C2A"
};
const F = { head: "Georgia", body: "Aptos", mono: "Courier New" };
const logo = path.join(repo, "public/brand/black-diamond/our-town-logo.png");

function makeDeck(title, subject) {
  const p = new pptxgen();
  p.layout = "LAYOUT_WIDE";
  p.author = "Our Town Properties / Ask Magic Mike";
  p.company = "Our Town Properties, Inc.";
  p.subject = subject;
  p.title = title;
  p.lang = "en-US";
  p.theme = {
    headFontFace: F.head,
    bodyFontFace: F.body,
    lang: "en-US"
  };
  p.defineSlideMaster({
    title: "AMM",
    background: { color: C.black },
    objects: [
      { rect: { x: 0, y: 0, w: 13.333, h: 0.06, fill: { color: C.gold }, line: { color: C.gold } } },
      { text: { text: "ASK MAGIC MIKE  •  OUR TOWN PROPERTIES", options: { x: 0.48, y: 7.13, w: 7.6, h: 0.18, fontFace: F.body, fontSize: 7.5, color: C.muted, charSpacing: 1.2, margin: 0 } } },
      { text: { text: "PHASE 8  •  18 AUG 2026", options: { x: 10.15, y: 7.13, w: 2.7, h: 0.18, fontFace: F.body, fontSize: 7.5, color: C.muted, align: "right", margin: 0 } } }
    ],
    slideNumber: { x: 12.89, y: 7.12, color: C.gold, fontFace: F.body, fontSize: 8 }
  });
  return p;
}

function title(slide, kicker, heading, sub = "") {
  slide.addText(kicker.toUpperCase(), { x: 0.62, y: 0.32, w: 7.2, h: 0.24, fontFace: F.body, fontSize: 10, bold: true, color: C.gold, charSpacing: 1.5, margin: 0 });
  slide.addText(heading, { x: 0.62, y: 0.65, w: 11.95, h: 0.56, fontFace: F.head, fontSize: 28, bold: false, color: C.cream, margin: 0, breakLine: false, fit: "shrink" });
  if (sub) slide.addText(sub, { x: 0.64, y: 1.28, w: 11.6, h: 0.38, fontFace: F.body, fontSize: 12.5, color: C.muted, margin: 0.02, fit: "shrink" });
}

function pill(slide, text, x, y, color = C.green, w = 1.65) {
  slide.addShape(SHAPE.roundRect, { x, y, w, h: 0.34, rectRadius: 0.08, fill: { color, transparency: 5 }, line: { color, transparency: 0, width: 1 } });
  slide.addText(text.toUpperCase(), { x: x + 0.05, y: y + 0.075, w: w - 0.1, h: 0.15, fontFace: F.body, fontSize: 8.2, bold: true, color: C.white, align: "center", margin: 0, charSpacing: 0.6 });
}

function card(slide, { x, y, w, h, heading, body = "", status, accent = C.gold, value }) {
  slide.addShape(SHAPE.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: C.ink, transparency: 0 }, line: { color: C.line, transparency: 10, width: 1.2 } });
  slide.addShape(SHAPE.rect, { x, y, w: 0.06, h, fill: { color: accent }, line: { color: accent } });
  slide.addText(heading, { x: x + 0.22, y: y + 0.18, w: w - 0.42, h: 0.28, fontFace: F.body, fontSize: 11, bold: true, color: C.gold2, margin: 0, fit: "shrink" });
  if (value !== undefined) slide.addText(String(value), { x: x + 0.22, y: y + 0.55, w: w - 0.42, h: 0.58, fontFace: F.head, fontSize: 29, color: C.cream, margin: 0, fit: "shrink" });
  if (body) slide.addText(body, { x: x + 0.22, y: y + (value !== undefined ? 1.22 : 0.58), w: w - 0.42, h: h - (value !== undefined ? 1.42 : 0.76), fontFace: F.body, fontSize: 10.5, color: C.white, margin: 0, breakLine: false, valign: "top", fit: "shrink" });
  if (status) pill(slide, status.text, x + w - (status.w || 1.45) - 0.18, y + 0.14, status.color, status.w || 1.45);
}

function arrow(slide, x1, y1, x2, y2, color = C.gold) {
  slide.addShape(SHAPE.line, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color, width: 1.7, beginArrowType: "none", endArrowType: "triangle" } });
}

function flow(slide, items, y = 3.1, x0 = 0.72, totalW = 11.9) {
  const gap = 0.22;
  const w = (totalW - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const x = x0 + i * (w + gap);
    slide.addShape(SHAPE.roundRect, { x, y, w, h: 0.9, rectRadius: 0.06, fill: { color: it.color || C.ink }, line: { color: it.accent || C.gold, width: 1.2 } });
    slide.addText(it.label, { x: x + 0.08, y: y + 0.24, w: w - 0.16, h: 0.38, fontFace: F.body, fontSize: it.size || 10.5, bold: true, color: C.cream, align: "center", valign: "mid", margin: 0, fit: "shrink" });
    if (i < items.length - 1) arrow(slide, x + w + 0.04, y + 0.45, x + w + gap - 0.04, y + 0.45);
  });
}

function notes(slide, text) {
  slide.addNotes(`Phase 8 speaker note. ${text}\n\nStatus language is evidence-based: Verified Live, Verified Test, Code Complete, Disabled, and Approval Required are not interchangeable.`);
}

function addLogo(slide, x = 10.75, y = 0.26, w = 1.9) {
  if (fs.existsSync(logo)) slide.addImage({ path: logo, x, y, w, h: 0.78, transparency: 0 });
}

function bullets(slide, items, x, y, w, h, size = 14) {
  const runs = [];
  items.forEach((t, i) => {
    runs.push({ text: t, options: { bullet: { indent: size * 1.5 }, breakLine: i < items.length - 1 } });
  });
  slide.addText(runs, { x, y, w, h, fontFace: F.body, fontSize: size, color: C.white, breakLine: false, margin: 0.04, paraSpaceAfterPt: 10, valign: "top", fit: "shrink" });
}

function slideBase(deck, kicker, heading, sub = "") {
  const s = deck.addSlide("AMM");
  title(s, kicker, heading, sub);
  addLogo(s);
  return s;
}

const exec = makeDeck("Ask Magic Mike Phase 8 Executive Presentation", "Editable current-state and release-gate evidence");

{
  const s = exec.addSlide("AMM");
  s.addShape(SHAPE.rect, { x: 0, y: 0.06, w: 13.333, h: 7.04, fill: { color: C.black }, line: { color: C.black } });
  s.addText("ASK MAGIC MIKE", { x: 0.72, y: 0.7, w: 7.8, h: 0.45, fontFace: F.body, fontSize: 15, bold: true, color: C.gold, charSpacing: 2.5, margin: 0 });
  s.addText("Is live.\nIs measurable.\nIs still safely gated.", { x: 0.7, y: 1.35, w: 7.0, h: 2.15, fontFace: F.head, fontSize: 35, color: C.cream, breakLine: false, margin: 0, fit: "shrink" });
  card(s, { x: 8.18, y: 1.34, w: 4.25, h: 1.34, heading: "PUBLIC FUNNEL", body: "Canonical domains and health endpoints are reachable.", status: { text: "Verified Live", color: C.green, w: 1.6 } });
  card(s, { x: 8.18, y: 2.91, w: 4.25, h: 1.34, heading: "SYSTEM STATE", body: "0 genuine leads; 6 suppressed QA records; 0 live notification failures.", status: { text: "Verified", color: C.green } });
  card(s, { x: 8.18, y: 4.48, w: 4.25, h: 1.34, heading: "CONSUMER AUTOMATION", body: "Email, SMS, sequences, and Mike activation remain off.", status: { text: "Disabled", color: C.ruby } });
  addLogo(s, 0.72, 5.45, 2.35);
  s.addText("Editable evidence package • August 18, 2026", { x: 0.74, y: 6.37, w: 5.6, h: 0.28, fontFace: F.body, fontSize: 11, color: C.muted, margin: 0 });
  notes(s, "Open with the operating truth: the public system is live and healthy, while outbound consumer automation remains intentionally gated.");
}

{
  const s = slideBase(exec, "Architecture", "One canonical system", "Owned public surfaces feed one durable backend; protected operations stay behind RBAC.");
  const nodes = [
    { label: "AskMagicMike.com", x: 0.7, y: 2.0, w: 2.0, status: "LIVE" },
    { label: "WordPress\n+ Gravity Form 3", x: 0.7, y: 4.2, w: 2.0, status: "LIVE" },
    { label: "Canonical API", x: 3.45, y: 3.1, w: 1.85, status: "LIVE" },
    { label: "Neon\nPostgreSQL", x: 6.05, y: 2.0, w: 1.85, status: "LIVE" },
    { label: "Lead Center\nRBAC", x: 8.6, y: 1.45, w: 1.85, status: "LIVE" },
    { label: "Resend\n+ Webhook", x: 8.6, y: 3.15, w: 1.85, status: "RISK" },
    { label: "AI Copilot", x: 8.6, y: 4.85, w: 1.85, status: "TEST" },
    { label: "Monitoring", x: 11.1, y: 3.15, w: 1.55, status: "LIVE" }
  ];
  nodes.forEach(n => { card(s, { x:n.x, y:n.y, w:n.w, h:1.05, heading:n.label, body:"", status:{text:n.status,color:n.status==="LIVE"?C.green:n.status==="RISK"?C.amber:C.gray,w:0.72} }); });
  arrow(s, 2.75,2.52,3.4,3.42); arrow(s,2.75,4.72,3.4,3.72); arrow(s,5.35,3.62,6.0,2.52); arrow(s,7.95,2.52,8.55,1.96); arrow(s,7.95,2.72,8.55,3.67); arrow(s,7.95,2.95,8.55,5.38); arrow(s,10.5,3.67,11.05,3.67);
  notes(s, "Explain the boundary: WordPress is a bridge and audit surface, not a competing lead database. Resend currently carries a billing-risk warning.");
}

{
  const s = slideBase(exec, "Public funnel", "Live lead entry points", "Live means reachable and wired—not proof of commercial volume.");
  const items = [
    ["Seller", "/sell", "LIVE"], ["Buyer", "/buy", "LIVE"], ["Value", "/value", "LIVE"],
    ["Ask", "/ask", "LIVE"], ["Widget", "/widget/v1", "LIVE"], ["Form 3", "WordPress bridge", "LIVE"],
    ["Forms 1/2/5/6/7", "Forwarding held", "HELD"]
  ];
  items.forEach((it,i)=>card(s,{x:0.72+(i%4)*3.05,y:1.92+Math.floor(i/4)*1.72,w:2.72,h:1.35,heading:it[0],body:it[1],status:{text:it[2],color:it[2]==="LIVE"?C.green:C.amber,w:0.72}}));
  s.addText("Form 4 is recruiting-only and excluded from consumer lead sequences.", { x: 0.75, y: 5.75, w: 11.6, h: 0.4, fontFace:F.body,fontSize:14,color:C.cream,margin:0.02,align:"center" });
  notes(s, "Distinguish the six live consumer surfaces from held WordPress forwarding. Form activation in Gravity Forms is not canonical forwarding approval.");
}

{
  const s = slideBase(exec, "Operations", "Lead journey", "Every durable transition creates evidence; notification failure never deletes the lead.");
  flow(s, ["Capture","Persist","Attribute","Score","Route","Notify","Review","Follow Up","Measure"].map(label=>({label,size:9.2})), 2.5, 0.55, 12.2);
  card(s,{x:1.15,y:4.15,w:3.25,h:1.3,heading:"DURABILITY",body:"Storage succeeds before outbound delivery.",status:{text:"Required",color:C.green}});
  card(s,{x:5.05,y:4.15,w:3.25,h:1.3,heading:"EXPLAINABILITY",body:"Scoring and routing keep human-readable reasons.",status:{text:"Required",color:C.green}});
  card(s,{x:8.95,y:4.15,w:3.25,h:1.3,heading:"AUDITABILITY",body:"Events, retries, assignments, and exports are logged.",status:{text:"Required",color:C.green}});
  notes(s, "Walk the audience through the invariant: the lead is stored first, attribution stays attached, and outbound systems cannot erase the record.");
}

{
  const s = slideBase(exec, "Production evidence", "Current production state", "A verified zero-state is better than a fabricated success story.");
  s.addChart(CHART.bar, [{ name:"Verified count", labels:["Genuine leads","Suppressed QA","QA in business Active/New","Pending notifications","Live failures"], values:[0,6,0,0,0] }], { x:0.75,y:1.9,w:7.0,h:4.25,catAxisLabelColor:C.white,valAxisLabelColor:C.white,showLegend:false,showTitle:false,chartColors:[C.gold],showValue:true,valGridLine:{color:C.gray,transparency:40},showCatName:false,border:{color:C.line},showCategoryName:false });
  card(s,{x:8.25,y:1.9,w:4.3,h:1.12,heading:"GENUINE LEADS",value:0,status:{text:"Verified Live",color:C.green,w:1.6}});
  card(s,{x:8.25,y:3.23,w:4.3,h:1.12,heading:"SUPPRESSED QA",value:6,status:{text:"Excluded",color:C.gray}});
  card(s,{x:8.25,y:4.56,w:4.3,h:1.12,heading:"LIVE FAILURES",value:0,status:{text:"Verified",color:C.green}});
  notes(s, "Do not describe QA records as prospects. The business KPI count is zero because no unrelated consumer submission has occurred.");
}

{
  const s = slideBase(exec, "AI", "AI Copilot acceptance", "Useful advisory output is durable, measured, and unable to mutate lead or communication state.");
  const latest=data.ai_copilot.latest;
  card(s,{x:0.72,y:1.9,w:3.0,h:1.45,heading:"MODE",body:latest.mode,status:{text:"Verified Test",color:C.gray,w:1.55}});
  card(s,{x:3.93,y:1.9,w:3.0,h:1.45,heading:"MODEL",body:latest.model,status:{text:"Recorded",color:C.green}});
  card(s,{x:7.14,y:1.9,w:2.45,h:1.45,heading:"TOKENS",value:latest.input_tokens+latest.output_tokens,status:{text:"Measured",color:C.green}});
  card(s,{x:9.8,y:1.9,w:2.75,h:1.45,heading:"ACCEPTANCE COST",body:`$${latest.estimated_cost_usd.toFixed(6)}`,status:{text:"One test",color:C.amber}});
  flow(s,[{label:"Synthetic + suppressed"},{label:"PII minimized"},{label:"Strict schema"},{label:"Durable output"},{label:"Human review"}],4.15,0.72,11.83);
  s.addText("No assignment, score, stage, task, appointment, notification, consent, or communication mutation.", {x:1.0,y:5.55,w:11.3,h:0.5,fontFace:F.body,fontSize:14,color:C.cream,align:"center",margin:0.02});
  notes(s, "This was one controlled acceptance run, not a monthly cost forecast. The model remains advisory and operator-only.");
}

{
  const s = slideBase(exec, "Decision boundaries", "Facts versus recommendations", "The system records facts, applies deterministic rules, and labels AI advice before a human acts.");
  const groups=[
    {x:0.72,h:"RECORDED FACTS",b:"Submission fields\nAttribution\nConsent evidence\nDelivery events",c:C.green},
    {x:3.75,h:"DETERMINISTIC DECISIONS",b:"Dedupe\nScore factors\nPermission gate\nRouting reason",c:C.gold},
    {x:6.78,h:"AI RECOMMENDATIONS",b:"Summary\nRisk flags\nSuggested questions\nNo silent action",c:C.amber},
    {x:9.81,h:"HUMAN ACTIONS",b:"Assign\nContact\nApprove message\nChange stage",c:C.ruby}
  ];
  groups.forEach((g,i)=>{card(s,{x:g.x,y:2.1,w:2.72,h:3.15,heading:g.h,body:g.b,accent:g.c,status:{text:i<2?"Authoritative":i===2?"Advisory":"Audited",color:g.c,w:1.15}});if(i<3)arrow(s,g.x+2.76,3.68,g.x+3.0,3.68);});
  notes(s, "Use this slide to prevent AI theater: recorded facts and deterministic controls are authoritative; AI output is explicitly advisory.");
}

{
  const s = slideBase(exec, "Compliance by design", "Communication permission", "Each purpose is evaluated separately. Ambiguity fails closed.");
  const rows=[
    ["Internal alert","Email / push","Operational assignment","ALLOWED BY CONFIG"],
    ["Requested-service response","Email / phone","Consumer request evidence","APPROVAL REQUIRED"],
    ["Marketing nurture","Email / SMS","Separate marketing permission","DISABLED"],
    ["Property alerts","Email / SMS","Specific subscription","HELD"],
    ["Carrier SMS","SMS","Consent + quiet hours + caps","DISABLED"],
    ["QA testing","Approved inbox only","Test + suppressed + allowlist","VERIFIED TEST"]
  ];
  s.addTable([["Purpose","Channel","Required basis","Current state"],...rows],{x:0.72,y:1.88,w:11.9,h:4.55,border:{type:"solid",color:C.line,pt:1},fill:C.ink,color:C.white,fontFace:F.body,fontSize:11,margin:0.08,rowH:0.55,bold:false,autoFit:false,align:"left",valign:"mid",bandRow:true,bandColor:C.gray,headerRows:1});
  notes(s, "Consent for one purpose does not silently authorize another. The matrix records the reason and manual-review requirement.");
}

{
  const s = slideBase(exec, "Messaging", "Messaging release candidate", "The mechanics are complete; consumer sending remains disabled.");
  const items=["Responsive HTML + plain text","Versioned templates","Sequence state machine","Signed provider events","Quiet hours","Frequency caps","Reply / STOP / bounce holds","Idempotent bounded retries"];
  items.forEach((t,i)=>card(s,{x:0.72+(i%4)*3.02,y:1.9+Math.floor(i/4)*1.6,w:2.72,h:1.25,heading:t,body:"",status:{text:"Code Complete",color:C.green,w:1.25}}));
  s.addShape(SHAPE.roundRect,{x:2.35,y:5.35,w:8.65,h:0.68,fill:{color:C.ruby},line:{color:C.ruby}});
  s.addText("CONSUMER EMAIL • CONSUMER SMS • SCHEDULER • AUTO-SEND — DISABLED",{x:2.55,y:5.56,w:8.25,h:0.22,fontFace:F.body,fontSize:12,bold:true,color:C.white,align:"center",margin:0});
  notes(s, "Code complete is not activation. This release candidate stays behind explicit flags and human approval.");
}

{
  const s = slideBase(exec, "Controlled acceptance", "Brandon-only QA", "A test proved the provider and inbox path without contacting Mike or a consumer.");
  card(s,{x:0.72,y:1.9,w:4.1,h:3.8,heading:"TEST MESSAGE",body:"Subject\n[TEST — BRANDON QA] Phase 7 messaging release-candidate review\n\nProvider accepted • sent • delivered\nMobile and desktop evidence retained\nReporting excluded",status:{text:"Verified Test",color:C.green,w:1.6}});
  const checks=["Suppressed test record","Exact QA allowlist","No hidden BCC","No Mike delivery","No consumer delivery","No carrier SMS"];
  checks.forEach((t,i)=>card(s,{x:5.18+(i%2)*3.62,y:1.9+Math.floor(i/2)*1.27,w:3.25,h:1.0,heading:t,body:"",status:{text:"Pass",color:C.green,w:0.62}}));
  s.addText("This is QA evidence—not a prospect and not commercial performance.",{x:5.2,y:5.75,w:6.9,h:0.38,fontFace:F.body,fontSize:13,color:C.gold2,align:"center",margin:0});
  notes(s, "The QA message was sent only to the approved Brandon inbox. It did not use Mike, consumer, BCC, or SMS recipients.");
}

{
  const s = slideBase(exec, "Protected operations", "Lead Center experience", "Role-scoped surfaces organize facts, consent, recommendations, messages, and delivery evidence.");
  const items=["Lead facts","Consent + permission","AI summary","Next action","Message preview","Provider events","Audit history","Test-state visibility"];
  items.forEach((t,i)=>card(s,{x:0.75+(i%4)*3.0,y:1.9+Math.floor(i/4)*1.65,w:2.7,h:1.3,heading:t,body:i===2?"Advisory label required":"Protected server-side",status:{text:i===2?"AI":"RBAC",color:i===2?C.amber:C.green,w:0.7}}));
  card(s,{x:2.25,y:5.2,w:8.85,h:0.9,heading:"CURRENT AUDIT NOTE",body:"RBAC schema is ready; the browser session expired, so fresh sign-in is required for Phase 8 screenshots.",status:{text:"Access Gate",color:C.amber,w:1.1}});
  notes(s, "The current browser session is not proof of a broken Lead Center; it is an expired-session control. Authenticated visual evidence needs a fresh sign-in.");
}

{
  const s = slideBase(exec, "WordPress", "WordPress form status", "All seven Gravity Forms are active in WordPress; only Form 3 is approved for canonical forwarding.");
  const rows=data.forms.map(f=>[String(f.id),f.name,f.wordpress_active?"Active":"Inactive",f.canonical_forwarding,f.consumer_acknowledgment||f.consumer_sequence||"disabled"]);
  s.addTable([["Form","Purpose","WP state","Canonical forwarding","Consumer messaging"],...rows],{x:0.62,y:1.8,w:12.05,h:4.85,border:{type:"solid",color:C.line,pt:1},fill:C.ink,color:C.white,fontFace:F.body,fontSize:10.2,margin:0.07,rowH:0.48,bandRow:true,bandColor:C.gray,headerRows:1,autoFit:false});
  notes(s, "Form 3 is the only bridge allowlist member. Form 7 entry 1550 remains protected and unsubscribed.");
}

{
  const s = slideBase(exec, "Separate approval", "Form 3 acknowledgment release gate", "One form. One transactional purpose. One reversible flag.");
  flow(s,[{label:"Form 3 submitted"},{label:"Durable lead stored"},{label:"Permission allowed"},{label:"Versioned template"},{label:"Resend + webhook"},{label:"Monitor + rollback"}],2.05,0.68,11.95);
  card(s,{x:0.78,y:3.65,w:3.65,h:1.65,heading:"ELIGIBILITY",body:"Form 3 only\nNot test • not suppressed\nTransactional acknowledgment only",status:{text:"Approval Required",color:C.amber,w:1.45}});
  card(s,{x:4.82,y:3.65,w:3.65,h:1.65,heading:"SAFETY",body:"Idempotency\nBounce + complaint holds\nNo nurture or SMS",status:{text:"Prepared",color:C.green}});
  card(s,{x:8.86,y:3.65,w:3.65,h:1.65,heading:"ROLLBACK",body:"Set consumer acknowledgment flag false. Lead storage and internal alerts continue.",status:{text:"One Flag",color:C.green}});
  s.addText("APPROVE FORM 3 CONSUMER ACKNOWLEDGMENT EMAIL PILOT",{x:2.0,y:5.75,w:9.35,h:0.42,fontFace:F.body,fontSize:15,bold:true,color:C.gold2,align:"center",margin:0});
  notes(s, "This slide prepares the decision; it does not activate the feature. Email-provider account standing must also be reviewed.");
}

{
  const s = slideBase(exec, "Economics", "Economics and measurement", "Current commercial performance is zero. Planning inputs remain editable and clearly labeled.");
  card(s,{x:0.72,y:1.9,w:3.7,h:1.5,heading:"COMMERCIAL PERFORMANCE",value:"$0",body:"No genuine lead or attributed closing yet.",status:{text:"Verified Zero",color:C.green,w:1.25}});
  card(s,{x:4.82,y:1.9,w:3.7,h:1.5,heading:"AI ACCEPTANCE COST",value:"$0.006619",body:"One synthetic test; not a monthly forecast.",status:{text:"Measured",color:C.green}});
  card(s,{x:8.92,y:1.9,w:3.7,h:1.5,heading:"PAID MEDIA",value:"$0",body:"No paid launch authorized.",status:{text:"Inactive",color:C.gray}});
  bullets(s,["Measure source → qualified lead → appointment → closing after the first genuine lead.","Keep QA excluded from CPL, conversion, SLA, and revenue KPIs.","Replace editable commission assumptions with verified brokerage economics before spend.","Resolve provider account risk before promising reliable consumer delivery."],0.95,4.0,11.5,1.75,13.5);
  notes(s, "Do not extrapolate one AI acceptance cost or use fictional leads to suggest ROI. The workbook contains editable scenarios, not guarantees.");
}

{
  const s = exec.addSlide("AMM");
  s.addText("DECISION",{x:0.75,y:0.8,w:4,h:0.3,fontFace:F.body,fontSize:13,bold:true,color:C.gold,charSpacing:2,margin:0});
  s.addText("Review the editable evidence\nand Brandon-only previews\nbefore authorizing any\nconsumer automation.",{x:0.75,y:1.35,w:8.0,h:3.55,fontFace:F.head,fontSize:32,color:C.cream,margin:0,fit:"shrink"});
  card(s,{x:9.05,y:1.45,w:3.45,h:1.25,heading:"SYSTEM",body:"Live and healthy",status:{text:"Verified Live",color:C.green,w:1.55}});
  card(s,{x:9.05,y:2.95,w:3.45,h:1.25,heading:"ARTIFACTS",body:"Editable + reproducible",status:{text:"Review",color:C.gold}});
  card(s,{x:9.05,y:4.45,w:3.45,h:1.25,heading:"CONSUMER SEND",body:"Keep disabled",status:{text:"Approval Gate",color:C.ruby,w:1.2}});
  addLogo(s,0.75,5.65,2.35);
  notes(s, "Close without directing Mike to activate anything. The next action is review; the Form 3 pilot retains its separate approval phrase.");
}

// Long-form current system sales deck: same visual language, current facts, no fictional leads.
const sales = makeDeck("Ask Magic Mike Current System Sales Presentation", "Current long-form product, operating, and controlled-growth presentation");
const salesSlides = [
  ["Current system","Ask Magic Mike — the owned lead operating system","The public funnel is live. The lead center, messaging controls, and measurement spine are built around one canonical record.",["Verified production deployment","Dedicated Neon database","WordPress Form 3 bridge","Role-scoped operations"]],
  ["Business case","Own the path from interest to accountable follow-up","Our Town already owns trust, traffic surfaces, listings, and forms. Ask Magic Mike organizes capture, attribution, routing, notification, and proof.",["No parallel lead silo","No manual copy between systems","No AI authority over assignment","No consumer automation by default"]],
  ["Current problem","Disconnected follow-up is a systems problem","The risk is not a lack of effort. It is inconsistent capture, source loss, duplicate handling, and invisible delivery failure.",["Durable storage first","One explainable score","One accountable owner","Visible failure and retry"]],
  ["Assets in place","Connect what already works","The current architecture preserves OurTownProperties.com as the authority surface and AskMagicMike.com as the conversion application.",["Canonical public app: live","Form 3 bridge: live","Lead Center RBAC: ready","Resend webhook: enabled"]],
  ["Entry points","Many front doors, one record","Seller, buyer, value, Ask, widget, and approved WordPress capture converge on one canonical lead backend.",["Seller /sell","Buyer /buy","Value /value","Ask /ask","Widget /widget/v1","Gravity Form 3"]],
  ["Lead journey","From capture to measured outcome","Every stage has a durable or auditable signal.",["Capture","Persist","Attribute","Score","Route","Notify","Review","Follow up","Measure"]],
  ["Public experience","Short, accessible, mobile-first intake","Forms use progressive steps, clear labels, client and server validation, durable success states, consent evidence, and truthful follow-up language.",["No instant-value promise","No guaranteed offer","No fabricated availability","No JavaScript-only trust boundary"]],
  ["Qualification","Deterministic scoring, human judgment","The score prioritizes attention with named factors. It cannot silently assign, reject, or contact a consumer.",["0–100 score","Factor weights","Grade + explanation","Manual override audited"]],
  ["Routing","Accountable allocation with safe fallback","Seller and urgent leads route to the approved primary owner; other routes require an approved mapping or admin review.",["Previous owner retained on duplicates","No eligible recipient → unassigned","Every reassignment audited","BCC is never assignment"]],
  ["Daily operation","The Lead Center turns records into next actions","The protected interface separates business queues from suppressed QA and gives operators facts, permission state, delivery history, and auditable actions.",["Lead inbox","Lead detail","Action queue","Notifications","Reporting","System health"]],
  ["Seller options","Human-reviewed pathways, careful claims","Seller choices can be organized without automated appraisal, guaranteed price, or unconditional cash-offer language.",["Traditional listing","As-is discussion","Direct-purchase options review","Nurture or specialist review"]],
  ["Geography","Wilson-first, evidence before expansion","Expansion is a routing and operating decision—not a design claim. Service coverage, MLS rights, owner capacity, and compliance must be confirmed first.",["Current market: Wilson / Eastern NC","Coastal expansion: held","No steering","No invented inventory"]],
  ["Measurement","Source-to-outcome without PII leakage","First and last touch, UTMs, click IDs, placement, consent, assignment, notification, and stage events stay attached to the canonical record.",["QA excluded","No raw PII in analytics","Cross-domain strategy","Stable event names"]],
  ["Current economics","A verified zero-state","There are zero genuine leads and zero attributed commercial outcomes. Planning workbooks are editable scenarios—not guarantees.",["Paid media inactive","Current business revenue: $0","One AI test cost: $0.006619","Break-even depends on verified economics"]],
  ["Decision","Review evidence before activating automation","The immediate decision is artifact and release-gate review, not broad consumer messaging or spend.",["Keep consumer email off","Keep consumer SMS off","Keep Mike deferred","Review Form 3 pilot separately"]],
  ["Appendix A","Current system inventory","Canonical assets are current and isolated.",["GitHub main: 58554dff…","Vercel: dpl_2vgce… Ready","Neon production: br-round-base…","WordPress bridge 1.1.0"]],
  ["Appendix B","Current technical architecture","Public and private entry points are separated; canonical data and control services are shared behind server-side boundaries.",["Next.js / Vercel","Neon PostgreSQL","Resend + signed webhook","WordPress signed bridge","RBAC Lead Center"]],
  ["Appendix C","Routing and SLA rules","Rules are deterministic, explainable, and reversible.",["Urgency and score influence SLA","Approved mappings only","Duplicates preserve owner","No recipient triggers admin review"]],
  ["Appendix D","Consent, privacy, and security","Permission is purpose-specific and ambiguity fails closed.",["Exact consent evidence","Suppression + unsubscribe","CORS and rate limits","Secrets server-side","Exports audited"]],
  ["Appendix E","Communication permission architecture","Internal alerts, requested-service responses, marketing, property alerts, SMS, and QA are distinct purposes.",["One purpose ≠ another purpose","Human approval required","Test + suppression required for QA","Consumer sending disabled"]],
  ["Appendix F","Message sequence state machine","Draft, approval, scheduling, sending, provider events, and terminal holds are explicit states.",["Idempotent steps","Bounded retries","Quiet hours","Frequency caps","Reply / STOP / bounce / complaint stops"]],
  ["Appendix G","Provider event lifecycle","Signed webhook events update delivery evidence without storing raw payloads.",["Signature verification","Event idempotency","Delivered cannot regress","Failure visible","Payload hash only"]],
  ["Appendix H","AI architecture and Copilot tools","The Copilot reads approved lead context and returns strict advisory output.",["PII minimized before provider","Prompt injection tests","Cost + latency recorded","No automatic action","RBAC tool filters"]],
  ["Appendix I","Form 3 acknowledgment release gate","The prepared pilot is narrow, transactional, monitored, and reversible.",["Form 3 only","Exact template version","Not test or suppressed","One feature flag rollback","Separate approval required"]],
  ["Appendix J","QA, security, sources, and open decisions","Evidence remains traceable; unsupported claims stay out.",["2,647 accepted Phase 7 tests","14/14 release-safety checks","NellySelly isolation pass","Resend billing risk open","Lead Center sign-in needed for fresh screenshots"]]
];

salesSlides.forEach((d,idx)=>{
  const s=slideBase(sales,d[0],d[1],d[2]);
  if(idx===5) flow(s,d[3].map(label=>({label,size:9.4})),2.5,0.55,12.2);
  else if(idx===13){
    s.addChart(CHART.column,[{name:"Current verified",labels:["Genuine leads","Suppressed QA","Pending notifications","Live failures"],values:[0,6,0,0]}],{x:0.75,y:1.9,w:6.35,h:4.2,showLegend:false,chartColors:[C.gold],catAxisLabelColor:C.white,valAxisLabelColor:C.white,showValue:true,valGridLine:{color:C.gray,transparency:40}});
    bullets(s,d[3],7.55,2.05,4.75,3.7,15);
  } else {
    const xs=d[3].length<=4?2:3;
    d[3].forEach((t,i)=>card(s,{x:0.75+(i%xs)*(11.85/xs),y:2.0+Math.floor(i/xs)*1.55,w:(11.85/xs)-0.25,h:1.18,heading:t,body:"",status:{text:idx<15?"Current":"Appendix",color:idx<15?C.green:C.gray,w:0.82}}));
  }
  if(idx===24) s.addText("All current-state claims trace to the Phase 8 redacted data source and accepted repository evidence.",{x:0.78,y:6.2,w:11.7,h:0.32,fontFace:F.body,fontSize:10.5,color:C.gold2,align:"center",margin:0});
  notes(s, `Sales slide ${idx+1}: ${d[1]}. Keep operational facts separate from planning assumptions and future approvals.`);
});

await exec.writeFile({ fileName: path.join(out, "ASK_MAGIC_MIKE_PHASE8_EXECUTIVE_PRESENTATION.pptx") });
await sales.writeFile({ fileName: path.join(out, "ASK_MAGIC_MIKE_CURRENT_SYSTEM_SALES_PRESENTATION.pptx") });
console.log(`Generated ${exec._slides.length} executive slides and ${sales._slides.length} sales slides.`);
