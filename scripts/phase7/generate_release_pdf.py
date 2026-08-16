from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "phase7" / "pdfs" / "ASK_MAGIC_MIKE_PHASE7_MESSAGING_AI_RELEASE_CANDIDATE.pdf"
SCREENSHOT = ROOT / "output" / "phase7" / "screenshots" / "before" / "desktop-1440-message-previews-viewport.png"

GOLD = colors.HexColor("#D9A441")
INK = colors.HexColor("#101010")
CREAM = colors.HexColor("#F4EBDD")
RED = colors.HexColor("#7A111B")
MUTED = colors.HexColor("#5E5A54")


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(INK)
    canvas.rect(0, 0, landscape(letter)[0], 0.34 * inch, fill=1, stroke=0)
    canvas.setFillColor(CREAM)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(0.45 * inch, 0.13 * inch, "Ask Magic Mike | Our Town Properties, Inc. | Phase 7 release candidate")
    canvas.drawRightString(landscape(letter)[0] - 0.45 * inch, 0.13 * inch, f"{doc.page}")
    canvas.restoreState()


def bullet(text, style):
    return Paragraph(f"• {text}", style)


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    title = ParagraphStyle("TitleAMM", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=27, leading=31, textColor=INK, alignment=TA_CENTER, spaceAfter=12)
    subtitle = ParagraphStyle("SubtitleAMM", parent=styles["Normal"], fontName="Helvetica", fontSize=13, leading=18, textColor=MUTED, alignment=TA_CENTER)
    h1 = ParagraphStyle("H1AMM", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=21, leading=24, textColor=INK, spaceAfter=10)
    h2 = ParagraphStyle("H2AMM", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=RED, spaceAfter=5)
    body = ParagraphStyle("BodyAMM", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=15, textColor=INK, spaceAfter=6)
    small = ParagraphStyle("SmallAMM", parent=body, fontSize=8.5, leading=11, textColor=MUTED)
    callout = ParagraphStyle("CalloutAMM", parent=body, fontName="Helvetica-Bold", fontSize=13, leading=18, textColor=INK, backColor=CREAM, borderColor=GOLD, borderWidth=1, borderPadding=10, spaceBefore=8, spaceAfter=10)

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=landscape(letter),
        leftMargin=0.55 * inch,
        rightMargin=0.55 * inch,
        topMargin=0.48 * inch,
        bottomMargin=0.5 * inch,
        title="Ask Magic Mike Phase 7 Messaging and AI Release Candidate",
        author="Ask Magic Mike / Our Town Properties, Inc.",
        subject="Production acceptance and controlled release evidence",
    )

    story = [
        Spacer(1, 0.65 * inch),
        Paragraph("ASK MAGIC MIKE", title),
        Paragraph("Phase 7 Messaging + Advisory AI Release Candidate", subtitle),
        Spacer(1, 0.25 * inch),
        Paragraph("Production deployed • Consumer automation disabled • Mike deferred", callout),
        Spacer(1, 0.1 * inch),
        Paragraph("Evidence date: August 16, 2026", subtitle),
        Paragraph("No genuine lead PII, credentials, hidden BCC values, or provider secrets are included.", small),
        PageBreak(),
        Paragraph("1. Executive result", h1),
        Table(
            [
                ["Production", "Ready", "dpl_3TCT4xrVCdh55xMzCoCC1qzhJrbV"],
                ["Commit", "Merged", "fb6312d60c287477fc030d13804bde9f7c8884b2"],
                ["Database", "Migrated", "Neon bitter-star-20214385 / production branch"],
                ["Live prospects", "0", "No prospect fabricated for QA"],
                ["Suppressed QA leads", "6", "0 unsuppressed"],
                ["Form 3", "Active", "Canonical WordPress home-value path"],
            ],
            colWidths=[1.55 * inch, 1.25 * inch, 6.2 * inch],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), INK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#B8AA96")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]),
        ),
        Spacer(1, 0.18 * inch),
        Paragraph("The public funnel, canonical storage, attribution, consent evidence, deterministic routing, notification outbox, Lead Center controls, and WordPress Form 3 bridge remain operational. Phase 7 adds governed permissions, versioned templates, test-only sequences, provider-event handling, and advisory AI without changing the genuine-lead delivery path.", body),
        PageBreak(),
        Paragraph("2. Communication control plane", h1),
        Paragraph("Authoritative permission decisions", h2),
        bullet("Requested-service responses remain distinct from marketing.", body),
        bullet("Ambiguous consent fails closed; phone presence never implies SMS consent.", body),
        bullet("QA recipient override requires both test and suppressed state.", body),
        Paragraph("Governed messaging", h2),
        bullet("Immutable template versions reject unknown variables and escape untrusted content.", body),
        bullet("Sequences support approval, scheduling, claim-before-send, quiet hours, frequency caps, bounded retries, stop conditions, and idempotency.", body),
        bullet("Carrier SMS uses the mock provider only; consumer email and SMS remain disabled.", body),
        Paragraph("Resend webhook ingestion is code-complete but remains disabled until a signing secret and deployed signed-event replay test are available.", callout),
        PageBreak(),
        Paragraph("3. Advisory AI acceptance", h1),
        Table(
            [
                ["Architecture", "OpenAI Responses API with structured output"],
                ["Model observed", "gpt-5.6-luna"],
                ["Fixture", "Synthetic, suppressed, non-contactable QA record"],
                ["Latency", "7,698 ms"],
                ["Usage", "491 input / 796 output tokens"],
                ["Estimated cost", "$0.005267"],
                ["Automatic action", "Disabled"],
            ],
            colWidths=[2.05 * inch, 6.75 * inch],
            style=TableStyle([
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#B8AA96")),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CREAM, colors.white]),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]),
        ),
        Spacer(1, 0.18 * inch),
        Paragraph("The system keeps recorded facts, deterministic controls, and AI recommendations visibly separate. AI cannot infer consent, change assignment, send messages, or block lead capture. Provider failure falls back to a deterministic advisory summary.", body),
        PageBreak(),
        Paragraph("4. Brandon-only email acceptance", h1),
        Table(
            [
                ["Authorized audience", "Brandon QA only"],
                ["Subject", "[TEST — BRANDON QA] Phase 7 messaging release-candidate review"],
                ["Provider", "Resend"],
                ["Provider message ID", "871e5b96-a10b-492a-bb23-9898824f0cd3"],
                ["Provider result", "Accepted; sent and delivered; duplicate=false"],
                ["Mike / consumer / BCC / SMS", "Not requested"],
                ["Inbox receipt", "Verified in brandonnarron1@gmail.com Inbox"],
            ],
            colWidths=[2.25 * inch, 6.55 * inch],
            style=TableStyle([
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#B8AA96")),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CREAM, colors.white]),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]),
        ),
        Spacer(1, 0.18 * inch),
        Paragraph("Authenticated Resend inspection showed sent and delivered events at 10:50 AM. Read-only inspection of the authorized Gmail inbox independently confirmed the expected sender, subject prefix, QA banner, HTML render, and protected review link. No mailbox write occurred.", callout),
        PageBreak(),
        Paragraph("5. Message Review Studio", h1),
    ]

    if SCREENSHOT.exists():
        img = Image(str(SCREENSHOT), width=8.8 * inch, height=5.87 * inch)
        story.extend([img, Paragraph("Authenticated read-only review surface; previews do not queue, schedule, or send.", small)])
    else:
        story.append(Paragraph("Screenshot unavailable in this package build.", body))

    story.extend([
        PageBreak(),
        Paragraph("6. Verification", h1),
        bullet("172 test files; 2,621 tests passed.", body),
        bullet("Strict typecheck, ESLint, and Production build passed.", body),
        bullet("70 active routes verified; release-safety scan passed 14/14.", body),
        bullet("Production smoke passed 19 checks with 2 intentional read-only skips.", body),
        bullet("Funnel verification passed 15/15; monitor passed 9/9.", body),
        bullet("Dependency audit found no known vulnerabilities.", body),
        bullet("NellySelly isolation passed; canonical project ID remained unchanged.", body),
        Paragraph("No automated test is represented as a penetration test. No skipped test is represented as passed.", callout),
        PageBreak(),
        Paragraph("7. Controlled next gate", h1),
        Paragraph("FORM 3 HOME VALUE CONSUMER ACKNOWLEDGMENT EMAIL PILOT", callout),
        bullet("Eligible source: canonical WordPress Form 3 only.", body),
        bullet("Purpose: one transactional requested-service acknowledgment only.", body),
        bullet("Excludes nurture, SMS, property alerts, other forms, and Mike activation.", body),
        bullet("Requires exact permission evidence, duplicate prevention, suppression, bounce/complaint handling, monitoring, and one-line rollback.", body),
        Spacer(1, 0.3 * inch),
        Paragraph("REVIEW BRANDON’S PHASE 7 QA INBOX AND VISUAL ACCEPTANCE PACKAGE.", title),
        Paragraph("If approved, reply: APPROVE FORM 3 CONSUMER ACKNOWLEDGMENT EMAIL PILOT.", subtitle),
    ])

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUT)


if __name__ == "__main__":
    main()
