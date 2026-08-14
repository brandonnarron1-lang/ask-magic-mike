#!/usr/bin/env python3

from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "phase3" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)

GOLD = colors.HexColor("#D3A94F")
CREAM = colors.HexColor("#F4EAD4")
INK = colors.HexColor("#17140F")
MUTED = colors.HexColor("#5D564B")
RUBY = colors.HexColor("#A72820")

SOURCES = [
    ("docs/MIKE_DAILY_LEAD_WORKFLOW.md", "MIKE_DAILY_LEAD_WORKFLOW.pdf"),
    ("docs/BRANDON_SYSTEM_OWNER_GUIDE.md", "BRANDON_SYSTEM_OWNER_GUIDE.pdf"),
    ("docs/ASK_MAGIC_MIKE_AGENT_QUICK_START.md", "ASK_MAGIC_MIKE_AGENT_QUICK_START.pdf"),
    ("docs/LEAD_CENTER_OWNER_GUIDE.md", "LEAD_CENTER_OWNER_GUIDE.pdf"),
    ("docs/EMERGENCY_ROLLBACK_ONE_PAGE.md", "ASK_MAGIC_MIKE_EMERGENCY_ROLLBACK_ONE_PAGE.pdf"),
    ("docs/WEB_PUSH_ENROLLMENT_GUIDE.md", "WEB_PUSH_ENROLLMENT_GUIDE.pdf"),
    ("docs/PHASE3_EXECUTIVE_SUMMARY.md", "ASK_MAGIC_MIKE_PHASE3_EXECUTIVE_SUMMARY.pdf"),
]


def safe_text(value: str) -> str:
    value = value.replace("—", "-").replace("–", "-").replace("‑", "-")
    value = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    value = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)
    return value


base = getSampleStyleSheet()
styles = {
    "title": ParagraphStyle(
        "AMMTitle",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=25,
        textColor=INK,
        alignment=TA_LEFT,
        spaceAfter=10,
    ),
    "h2": ParagraphStyle(
        "AMMH2",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=17,
        textColor=RUBY,
        spaceBefore=7,
        spaceAfter=4,
    ),
    "body": ParagraphStyle(
        "AMMBody",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=9.2,
        leading=12.4,
        textColor=INK,
        spaceAfter=3,
    ),
    "bullet": ParagraphStyle(
        "AMMBullet",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=9.2,
        leading=12.4,
        leftIndent=15,
        firstLineIndent=-8,
        bulletIndent=5,
        textColor=INK,
        spaceAfter=2.5,
    ),
    "footer": ParagraphStyle(
        "AMMFooter",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=7.5,
        textColor=MUTED,
        alignment=TA_CENTER,
    ),
}


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setFillColor(INK)
    canvas.rect(0, height - 0.31 * inch, width, 0.31 * inch, stroke=0, fill=1)
    canvas.setFillColor(GOLD)
    canvas.rect(0, height - 0.34 * inch, width, 0.03 * inch, stroke=0, fill=1)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.setFillColor(CREAM)
    canvas.drawString(0.58 * inch, height - 0.21 * inch, "OUR TOWN PROPERTIES, INC.  |  ASK MAGIC MIKE")
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(width / 2, 0.31 * inch, f"Internal operations  |  2026-08-14  |  Page {doc.page}")
    canvas.restoreState()


def story_from_markdown(path: Path):
    story = []
    lines = path.read_text(encoding="utf-8").splitlines()
    for raw in lines:
        line = raw.strip()
        if not line:
            story.append(Spacer(1, 3))
            continue
        if line.startswith("# "):
            story.append(Spacer(1, 7))
            story.append(Paragraph(safe_text(line[2:]), styles["title"]))
        elif line.startswith("## "):
            story.append(Paragraph(safe_text(line[3:]), styles["h2"]))
        elif re.match(r"^\d+\.\s+", line):
            number, text = line.split(". ", 1)
            story.append(Paragraph(safe_text(text), styles["bullet"], bulletText=f"{number}."))
        elif line.startswith("- "):
            story.append(Paragraph(safe_text(line[2:]), styles["bullet"], bulletText="-"))
        else:
            story.append(Paragraph(safe_text(line), styles["body"]))
    return story


def build(source: Path, destination: Path):
    doc = SimpleDocTemplate(
        str(destination),
        pagesize=letter,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title=source.stem.replace("_", " ").title(),
        author="Our Town Properties, Inc. / Ask Magic Mike",
        subject="Phase 3 internal operating guide",
    )
    doc.build(
        story_from_markdown(source),
        onFirstPage=header_footer,
        onLaterPages=header_footer,
    )


for source_name, output_name in SOURCES:
    build(ROOT / source_name, OUTPUT / output_name)

print(f"created {len(SOURCES)} phase3 PDFs in {OUTPUT}")
