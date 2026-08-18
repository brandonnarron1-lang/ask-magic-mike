from __future__ import annotations

import html
import json
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
OUT = REPO / "output" / "phase8"
PDFS = OUT / "pdfs"
VIS = OUT / "visual-assets"
DIAGRAMS = VIS / "editable-diagrams"
NOTIFICATIONS = VIS / "notification-visuals"
STATES = VIS / "lead-states"
for p in (PDFS, DIAGRAMS, NOTIFICATIONS, STATES):
    p.mkdir(parents=True, exist_ok=True)

DATA = json.loads((OUT / "data" / "current-system-state.json").read_text())
BLACK = "#080808"
INK = "#151515"
GOLD = "#d5af58"
CREAM = "#f6eedb"
WHITE = "#ffffff"
RUBY = "#a82e39"
GREEN = "#2d7a59"
AMBER = "#a56b1f"


def pdf_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("TitleGold", parent=base["Title"], fontName="Helvetica-Bold", fontSize=24, leading=29, textColor=colors.HexColor(GOLD), spaceAfter=14),
        "h1": ParagraphStyle("H1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=colors.HexColor("#4d3714"), spaceBefore=12, spaceAfter=7),
        "h2": ParagraphStyle("H2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=12.5, leading=16, textColor=colors.HexColor(RUBY), spaceBefore=9, spaceAfter=5),
        "body": ParagraphStyle("Body", parent=base["BodyText"], fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=colors.HexColor("#202020"), spaceAfter=6),
        "bullet": ParagraphStyle("Bullet", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13, leftIndent=14, firstLineIndent=-8, bulletIndent=4, textColor=colors.HexColor("#202020"), spaceAfter=4),
        "small": ParagraphStyle("Small", parent=base["BodyText"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=colors.HexColor("#555555")),
        "gate": ParagraphStyle("Gate", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=11, leading=15, textColor=colors.white, backColor=colors.HexColor(RUBY), borderPadding=8, alignment=TA_CENTER, spaceBefore=12, spaceAfter=12),
    }


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor(BLACK))
    canvas.rect(0, 0, letter[0], 0.35 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor(GOLD))
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawString(0.55 * inch, 0.13 * inch, "ASK MAGIC MIKE  •  OUR TOWN PROPERTIES  •  PHASE 8")
    canvas.drawRightString(letter[0] - 0.55 * inch, 0.13 * inch, f"{doc.page}")
    canvas.restoreState()


def markdown_story(path: Path, title_override: str | None = None):
    st = pdf_styles()
    lines = path.read_text().splitlines()
    story = []
    in_table = []

    def flush_table():
        nonlocal in_table
        if not in_table:
            return
        rows = []
        for line in in_table:
            vals = [v.strip() for v in line.strip().strip("|").split("|")]
            if all(re.fullmatch(r"[-: ]+", v or "-") for v in vals):
                continue
            rows.append([Paragraph(html.escape(v), st["small"]) for v in vals])
        if rows:
            tbl = Table(rows, repeatRows=1, hAlign="LEFT", colWidths=[(letter[0] - 1.1 * inch) / len(rows[0])] * len(rows[0]))
            tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(BLACK)),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor(GOLD)),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#b79b5a")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6f2e8")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.extend([tbl, Spacer(1, 8)])
        in_table = []

    first_title = False
    for line in lines:
        if line.startswith("|"):
            in_table.append(line)
            continue
        flush_table()
        text = line.strip()
        if not text:
            story.append(Spacer(1, 4))
        elif text.startswith("# "):
            actual = title_override or text[2:]
            story.append(Paragraph(html.escape(actual), st["title"]))
            first_title = True
        elif text.startswith("## "):
            story.append(Paragraph(html.escape(text[3:]), st["h1"]))
        elif text.startswith("### "):
            story.append(Paragraph(html.escape(text[4:]), st["h2"]))
        elif text.startswith("- "):
            story.append(Paragraph("• " + html.escape(text[2:]), st["bullet"]))
        elif text.startswith("Future approval phrase:"):
            story.append(Paragraph(html.escape(text), st["gate"]))
        else:
            safe = html.escape(text)
            safe = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", safe)
            safe = safe.replace("**", "")
            story.append(Paragraph(safe, st["body"]))
    flush_table()
    if not first_title:
        story.insert(0, Paragraph(html.escape(title_override or path.stem), st["title"]))
    return story


def build_pdf(source: str, output: str, title: str):
    doc = SimpleDocTemplate(str(PDFS / output), pagesize=letter, rightMargin=0.55 * inch, leftMargin=0.55 * inch, topMargin=0.55 * inch, bottomMargin=0.55 * inch, title=title, author="Our Town Properties / Ask Magic Mike")
    doc.build(markdown_story(REPO / "docs" / "phase8" / source, title), onFirstPage=header_footer, onLaterPages=header_footer)


def svg_wrap(title: str, subtitle: str, body: str, width: int = 1600, height: int = 900) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
<title id="title">{html.escape(title)}</title><desc id="desc">{html.escape(subtitle)}</desc>
<rect width="100%" height="100%" fill="{BLACK}"/><rect y="0" width="100%" height="10" fill="{GOLD}"/>
<text x="70" y="78" font-family="Verdana" font-size="24" font-weight="700" letter-spacing="4" fill="{GOLD}">ASK MAGIC MIKE • OUR TOWN PROPERTIES</text>
<text x="70" y="150" font-family="Georgia" font-size="48" fill="{CREAM}">{html.escape(title)}</text>
<text x="70" y="198" font-family="Verdana" font-size="22" fill="#b9b1a0">{html.escape(subtitle)}</text>
{body}
<text x="70" y="860" font-family="Verdana" font-size="18" fill="#b9b1a0">Synthetic/redacted Phase 8 artifact • 18 Aug 2026</text>
</svg>'''


def boxes(items: list[tuple[str, str]], y: int = 310, box_w: int = 220, gap: int = 32, start_x: int = 70, accent: str = GOLD) -> str:
    out = []
    for i, (label, state) in enumerate(items):
        x = start_x + i * (box_w + gap)
        out.append(f'<rect x="{x}" y="{y}" width="{box_w}" height="150" rx="18" fill="{INK}" stroke="{accent}" stroke-width="3"/>')
        out.append(f'<text x="{x+box_w/2}" y="{y+62}" text-anchor="middle" font-family="Verdana" font-size="23" font-weight="700" fill="{CREAM}">{html.escape(label)}</text>')
        out.append(f'<text x="{x+box_w/2}" y="{y+108}" text-anchor="middle" font-family="Verdana" font-size="17" fill="{accent}">{html.escape(state)}</text>')
        if i < len(items) - 1:
            x1 = x + box_w + 5
            x2 = x + box_w + gap - 5
            out.append(f'<line x1="{x1}" y1="{y+75}" x2="{x2}" y2="{y+75}" stroke="{GOLD}" stroke-width="4"/><polygon points="{x2},{y+75} {x2-13},{y+67} {x2-13},{y+83}" fill="{GOLD}"/>')
    return "".join(out)


def write_visuals():
    diagrams = {
        "canonical-architecture": ("Canonical architecture", "Public surfaces, protected operations, one database", [("Public app", "LIVE"), ("Canonical API", "LIVE"), ("Neon", "LIVE"), ("Lead Center", "RBAC"), ("Providers", "GATED")]),
        "lead-journey": ("Lead journey", "Durable capture before outbound delivery", [("Capture", "INPUT"), ("Persist", "DURABLE"), ("Score", "EXPLAIN"), ("Route", "AUDIT"), ("Notify", "RETRY"), ("Measure", "KPI")]),
        "wordpress-bridge": ("WordPress bridge", "Form 3 only; held forms stay in WordPress", [("Gravity Form 3", "ALLOWLIST"), ("Signed bridge", "1.1.0"), ("Canonical API", "LIVE"), ("Neon", "ONE RECORD")]),
        "communication-permission-flow": ("Communication permission flow", "Purpose-specific decisions fail closed", [("Purpose", "EXPLICIT"), ("Consent", "EVIDENCE"), ("Holds", "CHECK"), ("Decision", "AUDIT"), ("Send", "GATED")]),
        "sequence-state-machine": ("Sequence state machine", "Human approval and stop conditions are explicit", [("Draft", "SAFE"), ("Approval", "HUMAN"), ("Scheduled", "GATED"), ("Sent", "EVENT"), ("Stopped", "TERMINAL")]),
        "provider-event-flow": ("Provider event flow", "Signed, idempotent, payload-minimized", [("Webhook", "SIGNED"), ("Verify", "REQUIRED"), ("Deduplicate", "EVENT ID"), ("Update", "NO REGRESS"), ("Audit", "HASH ONLY")]),
        "ai-intelligence-flow": ("AI intelligence flow", "Advisory output cannot mutate lead state", [("Redact", "PII"), ("Schema", "STRICT"), ("Provider", "BOUNDED"), ("Persist", "USAGE"), ("Human", "DECIDES")]),
        "copilot-tool-flow": ("Copilot tool flow", "RBAC and object scope wrap every tool", [("Session", "RBAC"), ("Scope", "ASSIGNED"), ("Read", "MINIMUM"), ("Advise", "LABELLED"), ("Audit", "DURABLE")]),
        "failure-and-recovery": ("Failure and recovery", "A failed notification never loses the lead", [("Lead stored", "SAFE"), ("Attempt", "BOUNDED"), ("Retry", "BACKOFF"), ("Terminal", "VISIBLE"), ("Admin", "RESOLVES")]),
        "form3-release-gate": ("Form 3 release gate", "One transactional message behind one reversible flag", [("Form 3", "ONLY"), ("Permission", "ALLOWED"), ("Template", "PINNED"), ("Provider", "MONITOR"), ("Rollback", "ONE FLAG")]),
    }
    assets = []
    for stem, (title, subtitle, items) in diagrams.items():
        bw = min(230, int((1460 - 30 * (len(items)-1)) / len(items)))
        body = boxes(items, box_w=bw, gap=30)
        path = DIAGRAMS / f"{stem}.svg"
        path.write_text(svg_wrap(title, subtitle, body))
        assets.append([str(path.relative_to(OUT)), "1600x900", subtitle, "current-system-state.json", "Approved internal evidence"])

    notification_specs = {
        "internal-alert": ("Internal lead alert", "[HOT] SELLER LEAD | AskMagicMike.com | Home Value | Wilson | TEST RECORD | Score 91", ["Priority and SLA", "Validated contact actions", "Source + consent + score", "Secure Lead Center link"]),
        "brandon-qa-message": ("Brandon-only QA", "[TEST — BRANDON QA] Phase 7 messaging release-candidate review", ["Suppressed synthetic record", "Provider delivered", "No Mike / consumer / SMS", "Excluded from reporting"]),
        "consumer-acknowledgment": ("Form 3 acknowledgment preview", "Your home-value review request was received", ["Human review only", "Not an appraisal or offer", "No appointment promise", "Prepared — disabled"]),
        "plain-text-email": ("Plain-text email", "Equivalent wording without HTML dependency", ["Readable", "Versioned", "No tracking PII", "Separate lifecycle record"]),
        "sms-preview": ("SMS preview", "Ask Magic Mike / Our Town Properties", ["Consent required", "Quiet hours", "STOP / HELP", "Carrier sending disabled"]),
        "push-preview": ("Push preview", "New lead ready for protected review", ["No consumer PII", "Secure deep link", "Device-specific", "Operator enrollment required"]),
        "daily-digest": ("Daily digest preview", "Operational counts—not consumer content", ["New genuine leads", "Overdue SLA", "Notification failures", "QA excluded"]),
    }
    for stem, (title, subject, lines) in notification_specs.items():
        rows = "".join(f'<text x="155" y="{375+i*62}" font-family="Verdana" font-size="28" fill="{WHITE}">• {html.escape(line)}</text>' for i,line in enumerate(lines))
        body = f'<rect x="115" y="255" width="1370" height="430" rx="26" fill="{INK}" stroke="{GOLD}" stroke-width="3"/><text x="155" y="325" font-family="Verdana" font-size="25" font-weight="700" fill="{GOLD}">{html.escape(subject)}</text>{rows}<rect x="1120" y="590" width="290" height="62" rx="12" fill="{RUBY}"/><text x="1265" y="630" text-anchor="middle" font-family="Verdana" font-size="21" font-weight="700" fill="{WHITE}">SYNTHETIC PREVIEW</text>'
        p = NOTIFICATIONS / f"{stem}.svg"
        p.write_text(svg_wrap(title, "Redacted notification design", body))
        assets.append([str(p.relative_to(OUT)), "1600x900", f"Redacted {title.lower()}", "Phase 8 source", "Preview only"])

    state_specs = [
        ("hot", "HOT", RUBY, "80–100"), ("active", "ACTIVE", GOLD, "60–79"), ("new", "NEW", GREEN, "Below 60"),
        ("test", "TEST", "#555555", "Synthetic only"), ("permission-blocked", "PERMISSION BLOCKED", AMBER, "Fail closed"),
        ("consent-ambiguous", "CONSENT AMBIGUOUS", AMBER, "Manual review"), ("delivery-failed", "DELIVERY FAILED", RUBY, "Visible + retry"),
        ("sequence-paused", "SEQUENCE PAUSED", "#555555", "No send")
    ]
    for stem, label, color, sub in state_specs:
        body = f'<rect x="280" y="290" width="1040" height="280" rx="34" fill="{INK}" stroke="{color}" stroke-width="7"/><text x="800" y="415" text-anchor="middle" font-family="Verdana" font-size="64" font-weight="800" fill="{color}">{html.escape(label)}</text><text x="800" y="490" text-anchor="middle" font-family="Verdana" font-size="28" fill="{CREAM}">{html.escape(sub)}</text>'
        p = STATES / f"lead-state-{stem}.svg"
        p.write_text(svg_wrap(f"Lead state: {label}", "Synthetic status asset", body))
        assets.append([str(p.relative_to(OUT)), "1600x900", f"Lead status {label}", "Phase 8 source", "Approved component"])

    manifest = VIS / "ALT_TEXT_AND_ASSET_REGISTER.csv"
    manifest.write_text("path,dimensions,alt_text,source,approval_status\n" + "\n".join(",".join(f'"{str(v).replace(chr(34), chr(34)*2)}"' for v in row) for row in assets) + "\n")

    # Searchable PDF contact sheet for editable diagrams.
    st = pdf_styles()
    story = [Paragraph("Ask Magic Mike Phase 8 editable diagrams", st["title"])]
    for stem, (title, subtitle, items) in diagrams.items():
        story += [Paragraph(title, st["h1"]), Paragraph(subtitle, st["body"]), Table([[Paragraph(a, st["small"]), Paragraph(b, st["small"])] for a,b in items], colWidths=[2.7*inch,2.2*inch], style=TableStyle([("GRID",(0,0),(-1,-1),0.5,colors.HexColor(GOLD)),("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#f6f2e8"))])), Spacer(1,10)]
    doc = SimpleDocTemplate(str(PDFS / "ASK_MAGIC_MIKE_PHASE8_SYSTEM_DIAGRAMS.pdf"), pagesize=landscape(letter), rightMargin=0.55*inch,leftMargin=0.55*inch,topMargin=0.55*inch,bottomMargin=0.55*inch,title="Ask Magic Mike Phase 8 System Diagrams")
    doc.build(story)


if __name__ == "__main__":
    build_pdf("FORM3_CONSUMER_ACKNOWLEDGMENT_RELEASE_GATE.md", "FORM3_CONSUMER_ACKNOWLEDGMENT_RELEASE_GATE.pdf", "Form 3 Consumer Acknowledgment Release Gate")
    build_pdf("ASK_MAGIC_MIKE_PHASE8_EXECUTIVE_SUMMARY.md", "ASK_MAGIC_MIKE_PHASE8_EXECUTIVE_SUMMARY.pdf", "Ask Magic Mike Phase 8 Executive Summary")
    build_pdf("BRANDON_PHASE8_REVIEW_GUIDE.md", "BRANDON_PHASE8_REVIEW_GUIDE.pdf", "Brandon Phase 8 Review Guide")
    write_visuals()
    print(f"Generated decision PDFs and editable visual sources under {OUT}")
