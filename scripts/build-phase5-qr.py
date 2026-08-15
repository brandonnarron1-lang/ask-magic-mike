#!/usr/bin/env python3
"""Build and scan-test staged Ask Magic Mike QR assets."""

from __future__ import annotations

import csv
import re
import zipfile
from pathlib import Path
from urllib.parse import urlencode

import cv2
import qrcode
import qrcode.image.svg
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "phase5" / "qr"
OUT.mkdir(parents=True, exist_ok=True)
PACKAGE = ROOT / "output" / "phase5" / "ASK_MAGIC_MIKE_QR_ASSET_PACKAGE.zip"


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def tagged_url(row: dict[str, str]) -> str:
    return row["Base URL"] + "?" + urlencode({
        "utm_source": row["UTM source"],
        "utm_medium": row["UTM medium"],
        "utm_campaign": "owned_traffic_phase5",
        "utm_content": row["UTM content"],
    })


def make_pdf(path: Path, png: Path, placement: str, url: str) -> None:
    pdf = canvas.Canvas(str(path), pagesize=letter)
    width, height = letter
    pdf.setFillColor(HexColor("#111111")); pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#D9A441")); pdf.setFont("Helvetica-Bold", 14); pdf.drawString(48, height - 58, "ASK MAGIC MIKE")
    pdf.setFillColor(white); pdf.setFont("Helvetica-Bold", 24); pdf.drawString(48, height - 92, placement)
    pdf.setFillColor(white); pdf.roundRect(95, 210, 422, 422, 10, fill=1, stroke=0)
    pdf.drawImage(str(png), 112, 227, width=388, height=388, preserveAspectRatio=True, mask="auto")
    pdf.setFillColor(HexColor("#D9A441")); pdf.setFont("Helvetica-Bold", 12); pdf.drawCentredString(width / 2, 176, "SCAN TO OPEN THE TAGGED ASK MAGIC MIKE PATH")
    pdf.setFillColor(HexColor("#C2C2C2")); pdf.setFont("Helvetica", 7); pdf.drawCentredString(width / 2, 152, url[:120])
    pdf.setFillColor(HexColor("#C2C2C2")); pdf.setFont("Helvetica", 8); pdf.drawCentredString(width / 2, 34, "Staged asset - publication or printing requires approval")
    pdf.save()


def main() -> None:
    with (ROOT / "docs" / "ASK_MAGIC_MIKE_UTM_LINK_LIBRARY.csv").open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))
    results = []
    decoder = cv2.QRCodeDetector()
    for row in rows:
        name = slug(row["Placement"])
        url = tagged_url(row)
        qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_Q, box_size=16, border=5)
        qr.add_data(url); qr.make(fit=True)
        png = OUT / f"qr-{name}.png"
        qr.make_image(fill_color="#111111", back_color="white").save(png)
        svg = OUT / f"qr-{name}.svg"
        qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, error_correction=qrcode.constants.ERROR_CORRECT_H).save(svg)
        pdf = OUT / f"qr-{name}.pdf"
        make_pdf(pdf, png, row["Placement"], url)
        decoded, _, _ = decoder.detectAndDecode(cv2.imread(str(png)))
        results.append([row["Placement"], url, png.name, svg.name, pdf.name, "PASS" if decoded == url else "FAIL", decoded])

    manifest = OUT / "QR_SCAN_TEST_RESULTS.csv"
    with manifest.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["Placement", "Tagged URL", "PNG", "SVG", "PDF", "Decode result", "Decoded URL"])
        writer.writerows(results)
    readme = OUT / "README.txt"
    readme.write_text(
        "Ask Magic Mike Phase 5 QR Asset Package\n\n"
        "All assets are staged. Publication, printing, social posting, email sending, or WordPress changes require approval.\n"
        "Every URL uses the stable owned_traffic_phase5 campaign and a placement-specific utm_content value.\n"
        "No customer PII or secrets are encoded. Open-house placement requires a real approved property configuration before use.\n"
        "QR_SCAN_TEST_RESULTS.csv records OpenCV decoding of every generated PNG.\n",
        encoding="utf-8",
    )
    assert all(result[5] == "PASS" for result in results), "QR decode test failed"
    with zipfile.ZipFile(PACKAGE, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(OUT.iterdir()):
            if path.is_file():
                archive.write(path, arcname=path.name)
    print(PACKAGE)
    print(f"scan tests: {len(results)}/{len(results)} PASS")


if __name__ == "__main__":
    main()
