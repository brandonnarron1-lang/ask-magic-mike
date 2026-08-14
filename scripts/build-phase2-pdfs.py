#!/usr/bin/env python3
"""Build branded, PII-safe Ask Magic Mike Phase 2 PDF artifacts."""

from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether, Image, ListFlowable, ListItem,
)
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "phase2" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)
GOLD = colors.HexColor("#D9A441")
GOLD_LIGHT = colors.HexColor("#F4E3B5")
BLACK = colors.HexColor("#090909")
CHARCOAL = colors.HexColor("#242424")
CREAM = colors.HexColor("#F7F1E4")
GRAY = colors.HexColor("#6C6962")
RED = colors.HexColor("#B3261E")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="AMMTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=23, leading=27, textColor=GOLD, spaceAfter=10))
styles.add(ParagraphStyle(name="AMMSubtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=10, leading=14, textColor=GRAY, spaceAfter=12))
styles.add(ParagraphStyle(name="AMMH1", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=BLACK, spaceBefore=9, spaceAfter=6))
styles.add(ParagraphStyle(name="AMMH2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=colors.HexColor("#7A5515"), spaceBefore=7, spaceAfter=4))
styles.add(ParagraphStyle(name="AMMBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.3, leading=13, textColor=CHARCOAL, spaceAfter=6))
styles.add(ParagraphStyle(name="AMMSmall", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=GRAY))
styles.add(ParagraphStyle(name="AMMCallout", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=BLACK, backColor=GOLD_LIGHT, borderColor=GOLD, borderWidth=0.7, borderPadding=8, spaceBefore=6, spaceAfter=8))


def header_footer(c, doc):
    c.saveState()
    w, h = doc.pagesize
    c.setFillColor(BLACK); c.rect(0, h - 28, w, 28, fill=1, stroke=0)
    c.setFillColor(GOLD); c.setFont("Helvetica-Bold", 9); c.drawString(36, h - 18, "ASK MAGIC MIKE | OUR TOWN PROPERTIES")
    c.setFillColor(GRAY); c.setFont("Helvetica", 7); c.drawRightString(w - 36, 20, f"Phase 2 | 2026-08-14 | Page {doc.page}")
    c.restoreState()


def doc(path, pagesize=letter, margins=(0.55, 0.55, 0.62, 0.62)):
    left, right, top, bottom = margins
    d = BaseDocTemplate(str(path), pagesize=pagesize, leftMargin=left*inch, rightMargin=right*inch, topMargin=top*inch, bottomMargin=bottom*inch, title=path.stem, author="Ask Magic Mike / Our Town Properties")
    frame = Frame(d.leftMargin, d.bottomMargin, d.width, d.height, id="main")
    d.addPageTemplates(PageTemplate(id="brand", frames=[frame], onPage=header_footer))
    return d


def bullets(items, level=0):
    return ListFlowable(
        [ListItem(Paragraph(item, styles["AMMBody"]), leftIndent=10) for item in items],
        bulletType="bullet", start="circle", leftIndent=16 + level*10, bulletFontName="Helvetica", bulletFontSize=7, bulletColor=GOLD,
    )


def steps(items):
    return ListFlowable(
        [ListItem(Paragraph(item, styles["AMMBody"]), leftIndent=12) for item in items],
        bulletType="1", leftIndent=20, bulletFontName="Helvetica-Bold", bulletFontSize=9, bulletColor=colors.HexColor("#7A5515"),
    )


def title(story, heading, subtitle):
    story += [Spacer(1, 8), Paragraph(heading, styles["AMMTitle"]), Paragraph(subtitle, styles["AMMSubtitle"])]


def build_push():
    path = OUT / "WEB_PUSH_ENROLLMENT_GUIDE.pdf"; story=[]
    title(story, "Free Phone Lead Alerts", "One-page Web Push enrollment guide. Carrier SMS remains disabled.")
    story.append(Paragraph("Before you start", styles["AMMH1"]))
    story.append(Paragraph("Use the approved authenticated browser. On iPhone or iPad, add AskMagicMike.com to the Home Screen and open the installed app. Browser permission requires the device owner and cannot be bypassed remotely.", styles["AMMCallout"]))
    story.append(Paragraph("Enroll one device", styles["AMMH1"]))
    story.append(steps([
        "Open <b>www.askmagicmike.com/admin/notifications/phone</b>.",
        "Enter a recognizable device name without a phone number or private identifier.",
        "Choose the approved role: Mike is primary; Brandon is copy.",
        "Allow notifications in the browser prompt.",
        "Send one <b>[TEST]</b> push and confirm the lock screen contains no contact details.",
        "Open the deep link and confirm Lead Center authentication is still required.",
        "Re-enroll once to verify duplicate handling; revoke and confirm delivery stops.",
    ]))
    story.append(Paragraph("Never copy subscription endpoints, cryptographic keys, or browser sessions into chat or shared files.", styles["AMMCallout"]))
    doc(path).build(story); return path


def build_mike():
    path = OUT / "MIKE_DAILY_LEAD_WORKFLOW.pdf"; story=[]
    title(story, "Mike's Daily Lead Workflow", "Plain-language operating guide for real leads. Assignment and first-contact times are internal targets, not public guarantees.")
    image_candidates = [
        Path("/tmp/codex-remote-attachments/019fed5c-76e3-7e73-bcc8-1d1a16931322/B1614656-965F-4D7A-8C1C-A8B1088C7195/2-Photo-2.jpg"),
        Path("/Users/brandonnarron/Pictures/Photos Library.photoslibrary/resources/derivatives/masters/C/C08FFA9A-DE68-46DD-BAC5-BF360188648A_4_5005_c.jpeg"),
    ]
    img_path = next((candidate for candidate in image_candidates if candidate.exists()), None)
    if img_path:
        story.append(Image(str(img_path), width=2.0*inch, height=2.36*inch, hAlign="RIGHT"))
        story.append(Paragraph("Example visual only: every real alert uses live HTML/text for accessible details. A QA subject starts with [TEST].", styles["AMMSmall"]))
    story.append(Paragraph("1. When an alert arrives", styles["AMMH1"]))
    story.append(steps([
        "Confirm the subject is not marked <b>[TEST]</b>.",
        "Open the secure Lead Center link; do not forward private details.",
        "Check source, intent, score explanation, consent, assignment, and duplicate status.",
        "Accept the assignment as quickly as practical. The internal target is two minutes.",
        "Call or email only through a consent-permitted channel. The internal first-contact target is five minutes.",
    ]))
    story.append(PageBreak())
    title(story, "Lead Statuses", "Use the status that describes what actually happened.")
    rows=[["Label","Meaning","Next action"],["HOT","Score 80-100","Review first; respond promptly"],["ACTIVE","Score 60-79","Work in the normal priority queue"],["NEW","Score below 60","Review and qualify; do not ignore"],["Attempted","A real outreach attempt was made","Record channel and time"],["Contacted","Two-way contact occurred","Record outcome and next action"],["Appointment","A real appointment is requested or set","Record only confirmed details"],["Nurture","Valid lead, longer timing","Set the next follow-up"],["Signed client","Agreement actually signed","Record date and permitted value"],["Closed","Transaction actually closed","Record verified gross attributed revenue"],["Bad lead","Spam, invalid, duplicate, or disqualified","Choose the actual reason; never delete evidence"]]
    t=Table(rows, colWidths=[1.05*inch,2.15*inch,3.55*inch], repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),BLACK),("TEXTCOLOR",(0,0),(-1,0),GOLD),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTNAME",(0,1),(-1,-1),"Helvetica"),("FONTSIZE",(0,0),(-1,-1),8),("LEADING",(0,0),(-1,-1),10),("VALIGN",(0,0),(-1,-1),"TOP"),("GRID",(0,0),(-1,-1),0.35,colors.HexColor("#D8D5CD")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#F8F5EE")]),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)])); story.append(t)
    story.append(PageBreak())
    title(story, "Escalation and Daily Close", "Protect the lead, preserve evidence, and ask for technical help when the system fails.")
    story.append(Paragraph("If Mike does not respond", styles["AMMH1"]))
    story.append(bullets(["The system records an unaccepted-assignment or first-contact target breach.","Brandon reviews queue, delivery, duplicate, and assignment state.","A genuine lead is never converted into a QA record or deleted."]))
    story.append(Paragraph("Technical failures", styles["AMMH1"]))
    story.append(bullets(["Email failed: preserve the lead; the queue retries and surfaces the failure.","Lead missing from the Lead Center: record the public correlation ID and contact Brandon.","Duplicate suspicion: contact one master record only and preserve both audit trails.","Out-of-area or coastal review: leave assigned to Mike/admin until an approved routing decision exists."]))
    story.append(Paragraph("End of day", styles["AMMH1"])); story.append(steps(["No unassigned genuine lead remains without an owner.","Every contact attempt and next action is recorded.","Actual appointments, signed clients, closings, and revenue are recorded only when verified.","Technical failures are assigned to Brandon with the correlation ID, never with secrets."]))
    doc(path).build(story); return path


def build_brandon():
    path=OUT/"BRANDON_SYSTEM_OWNER_GUIDE.pdf"; story=[]
    title(story,"Brandon System Owner Guide","Daily operations, controlled form activation, identity, notifications, and incident handling.")
    story.append(Paragraph("Daily opening",styles["AMMH1"])); story.append(steps(["Run the nine-check public production monitor.","Review readiness, queue failures, unassigned leads, duplicate suspicion, and unsuppressed tests.","Check WordPress bridge health and pending retries.","Review possible genuine Form 7 entry 1550 without marking it test.","Record exceptions in the operating scoreboard without raw PII."]))
    story.append(Paragraph("Daily closing",styles["AMMH1"])); story.append(steps(["Reconcile each genuine WordPress entry to one canonical lead or a documented shadow state.","Confirm failed notifications and unassigned live leads are zero or assigned an owner.","Confirm QA remains suppressed and excluded from KPIs.","Record actual outcomes only."]))
    story.append(PageBreak()); title(story,"Controlled Form Activation","One form at a time; Form 3 remains the verified baseline.")
    story.append(steps(["Back up plugin/configuration and export the exact form and notifications.","Record current entry count, placement, field map, consent, attribution, routing, and rollback.","Allowlist one form only.","Submit one fictional QA record with QA_TEST and INTERNAL QA - DO NOT CONTACT.","Verify one Gravity entry, one Neon lead, one internal alert, hidden BCC receipt, suppression, and idempotent replay.","Disable only the exact native notification proven to duplicate the canonical alert.","On any failed gate, remove only that form from the allowlist and restore its previous notification state."]))
    story.append(Paragraph("Current sequence",styles["AMMH1"])); story.append(bullets(["Form 3: ACTIVE - CANONICAL.","Forms 1 and 6: next technical candidates after consent-default configuration.","Forms 2 and 5: mapping/placement required.","Form 4: recruiting, not consumer routing.","Form 7: deferred for brokerage/legal consent review."]))
    story.append(PageBreak()); title(story,"Identity, Push, and Secrets","Least privilege and safe human handoffs.")
    story.append(bullets(["Basic Auth remains current until one verified administrator passes RBAC acceptance.","Complete the roster workbook; do not invent staff or invite unverified addresses.","Apply the additive identity migration in Preview first; set sensitive values only in Vercel.","Web Push needs the device owner. Never record subscription endpoints.","Carrier SMS and paid media stay disabled.","Never paste ADMIN_SECRET, BETTER_AUTH_SECRET, DATABASE_URL, Resend keys, BCC values, cookies, or VAPID private keys into chat, logs, or artifacts."]))
    story.append(Paragraph("Incident escalation",styles["AMMH1"])); story.append(steps(["Preserve leads and correlation IDs.","Stop the narrow failing form or notification processor, not the whole site.","Verify health and queue state.","Use the one-page rollback guide.","Document impact, owner, recovery, and follow-up."]))
    story.append(PageBreak()); title(story,"Monthly Review","Evidence first; no synthetic business claims.")
    story.append(bullets(["Lead and qualified-lead volume by source/form.","Assignment and first-contact target performance.","Email delivery failures, retries, and duplicates.","Appointments, signed clients, closings, and verified gross attributed revenue.","Form status, access roster, revoked sessions, exports, and test records.","No spend or vendor purchase without a separate owner approval."]))
    doc(path).build(story); return path


def build_emergency():
    path=OUT/"ASK_MAGIC_MIKE_EMERGENCY_ROLLBACK_ONE_PAGE.pdf"; story=[]
    title(story,"Emergency Rollback - One Page","Use the narrowest control. Preserve every genuine lead and all audit evidence.")
    rows=[["Incident","Immediate action","Verify"],["One WordPress form","Remove only that Form ID from the bridge allowlist; restore only its proven duplicate native notification.","Local Gravity entry remains; no new canonical forward."],["Global bridge","Set bridge mode disabled without deleting plugin data or entries.","WordPress forms still store locally."],["Plugin regression","Restore the checksummed plugin/config backup.","Form 3 health and signature behavior."],["Notification incident","Pause canonical notification processing; do not disable lead storage.","Queue visible; no lost lead or duplicate send."],["RBAC incident","Set LEAD_CENTER_RBAC_ENABLED=false and redeploy.","Anonymous /admin returns 401; approved Basic fallback works."],["Site incident","Redeploy last verified Vercel commit.","Live, ready, public routes, funnel, isolation."]]
    t=Table(rows,colWidths=[1.15*inch,3.85*inch,2.15*inch],repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),BLACK),("TEXTCOLOR",(0,0),(-1,0),GOLD),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTNAME",(0,1),(-1,-1),"Helvetica"),("FONTSIZE",(0,0),(-1,-1),7.5),("LEADING",(0,0),(-1,-1),9.5),("VALIGN",(0,0),(-1,-1),"TOP"),("GRID",(0,0),(-1,-1),0.4,colors.HexColor("#CCC7BC")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#F8F5EE")]),("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)])); story.append(t)
    story.append(Paragraph("After every rollback: run the production monitor, reconcile queue/lead state, confirm no lead loss, assign the incident owner, and preserve the failed evidence. Never expose secrets in an incident report.",styles["AMMCallout"]))
    doc(path).build(story); return path


def build_exec():
    path=OUT/"ASK_MAGIC_MIKE_PHASE2_EXECUTIVE_SUMMARY.pdf"; story=[]
    title(story,"Ask Magic Mike - Phase 2 Executive Summary","Verified production state and controlled expansion as of 2026-08-14.")
    data=[["System","Current evidence"],["Public funnel","Live and reachable; genuine prospects can enter now"],["Canonical lead pipe","Next.js API -> Neon -> Resend internal alert"],["WordPress","Form 3 ACTIVE - CANONICAL; six other forms classified"],["Email proof","Mike + hidden audit BCC independently received verified Form 3 QA"],["Data state","6 test leads; 0 live Neon prospects; 0 unsuppressed tests at audit"],["Identity","Better Auth/Neon RBAC implemented behind disabled gate; Basic remains current"],["Web Push","Provider/code ready; 0 devices enrolled"],["Monitoring","9/9 point-in-time checks pass; hourly schedules prepared/existing"],["Crawler","40/42; two Our Town Facebook crawler paths need narrow host rule"],["SMS / paid media","Inactive; no spend"]]
    t=Table(data,colWidths=[1.55*inch,5.55*inch],repeatRows=1); t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),BLACK),("TEXTCOLOR",(0,0),(-1,0),GOLD),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTNAME",(0,1),(-1,-1),"Helvetica"),("FONTSIZE",(0,0),(-1,-1),8),("LEADING",(0,0),(-1,-1),10),("VALIGN",(0,0),(-1,-1),"TOP"),("GRID",(0,0),(-1,-1),0.35,colors.HexColor("#D8D5CD")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#F8F5EE")]),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)])); story.append(t)
    story.append(Paragraph("Immediate owner action",styles["AMMH1"])); story.append(Paragraph("Review WordPress Form 7 entry 1550 as a possible genuine lead. Do not mark it test or use it for QA.",styles["AMMCallout"]))
    story.append(Paragraph("Next controlled build action",styles["AMMH1"])); story.append(Paragraph("Approve the staff roster, then apply and test the additive RBAC migration in Preview while Forms 1 and 6 proceed through separate consent-default acceptance gates.",styles["AMMBody"]))
    doc(path).build(story); return path


def build_presentation_pdf():
    path=OUT/"ASK_MAGIC_MIKE_PHASE2_EXECUTIVE_PRESENTATION.pdf"
    c=canvas.Canvas(str(path),pagesize=landscape(letter)); W,H=landscape(letter)
    slides=[
      ("ASK MAGIC MIKE","Controlled expansion, identity hardening, and operational completion",["Our Town Properties, Inc.","Verified production evidence - 2026-08-14"]),
      ("Production is live", "The lead pipe is real, durable, and measured", ["AskMagicMike.com is reachable","Form 3 stores locally and creates one canonical Neon lead","Resend alert delivery to Mike and hidden audit BCC is verified","Replay creates no duplicate lead or message"]),
      ("Canonical architecture", "One backend, two public surfaces, one protected operations center", ["Our Town WordPress: brokerage, SEO, IDX, local entry","Ask Magic Mike: focused public funnel and widget","Neon: canonical lead, attribution, queue, and audit store","Lead Center: Basic current; per-user RBAC staged","NellySelly: isolated"]),
      ("WordPress activation status", "Evidence decides the sequence", ["Form 3 - ACTIVE / CANONICAL","Forms 1 and 6 - READY AFTER CONSENT-DEFAULT QA","Forms 2 and 5 - MAPPING REQUIRED","Form 4 - RECRUITING / NOT CONSUMER ROUTING","Form 7 - DEFERRED FOR CONSENT REVIEW"]),
      ("Identity hardening", "Per-user access without a paid identity dependency", ["Better Auth 1.6.29 + Neon","Four roles and least-privilege policy","Database sessions, throttling, secure cookies, revocation","Server page, action, API, and assigned-lead checks","Feature gate preserves Basic emergency fallback"]),
      ("Notifications", "Email proven; Web Push prepared; SMS deferred", ["Verified sender: leads@notify.askmagicmike.com","Internal alert: Mike plus hidden audit BCC","Failed email remains queued, retried, and visible","Zero Web Push devices enrolled; physical permission required","Carrier SMS inactive"]),
      ("Monitoring and first response", "Operational targets, not public promises", ["Nine of nine production monitor checks pass","Hourly GitHub synthetic prepared; Vercel SLA cron exists","Two-minute assignment acceptance target","Five-minute first human contact target","Immediate alert states for queue, assignment, duplicate, and suppression failures"]),
      ("Security and compliance", "Expansion does not weaken the boundary", ["No public sign-up and no client-only authorization","No raw PII in analytics or artifacts","Tests suppressed and excluded from KPIs","No broad firewall bypass","No protected-class scoring/routing","No spend, ads, or carrier SMS"]),
      ("Known external actions", "Precise human gates remain", ["Review possible genuine Form 7 entry 1550","Approve roster and roles","Enroll Mike and Brandon Web Push","Hosting operator identifies the exact ModSecurity rule","Brokerage/BIC approves seller-options and Form 7 consent language"]),
      ("Next action", "Review Form 7 entry 1550 now", ["Treat it as a possible genuine request","Do not mark it QA","Confirm the native notification destination","Record the actual disposition","Then continue Forms 1 and 6 one at a time"]),
    ]
    for idx,(heading,sub,items) in enumerate(slides,1):
        c.setFillColor(BLACK); c.rect(0,0,W,H,fill=1,stroke=0)
        c.setFillColor(GOLD); c.rect(0,H-10,W,10,fill=1,stroke=0)
        c.setFont("Helvetica-Bold",30 if idx>1 else 38); c.drawString(48,H-75,heading)
        c.setFillColor(CREAM); c.setFont("Helvetica",17 if idx>1 else 20); c.drawString(50,H-108,sub)
        y=H-168
        for item in items:
            c.setFillColor(GOLD); c.circle(61,y+5,3.5,fill=1,stroke=0)
            c.setFillColor(CREAM); c.setFont("Helvetica",16); c.drawString(78,y,item); y-=48
        c.setFillColor(colors.HexColor("#92856B")); c.setFont("Helvetica",9); c.drawString(50,28,"ASK MAGIC MIKE | OUR TOWN PROPERTIES")
        c.drawRightString(W-50,28,f"{idx} / {len(slides)}")
        c.showPage()
    c.save(); return path


paths=[build_push(),build_mike(),build_brandon(),build_emergency(),build_exec(),build_presentation_pdf()]
print("\n".join(str(p) for p in paths))
