from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
OUT = REPO / "output" / "phase8"
PDFS = OUT / "pdfs"
RENDERS = OUT / "renders"
SLIDES = RENDERS / "slides"
PREVIEWS = OUT / "workbook-previews"
INTERFACES = OUT / "visual-assets" / "interface-visuals"
for p in (SLIDES, PREVIEWS, INTERFACES):
    p.mkdir(parents=True, exist_ok=True)


def run(*args: str) -> None:
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def label_image(path: Path, label: str, size=(300, 190)) -> Image.Image:
    src = Image.open(path).convert("RGB")
    src.thumbnail((size[0], size[1]-30))
    canvas = Image.new("RGB", size, "#080808")
    x = (size[0]-src.width)//2
    y = 30 + (size[1]-30-src.height)//2
    canvas.paste(src, (x,y))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0,0,size[0],29), fill="#171717")
    draw.text((8,8), label[:45], fill="#e6c977", font=ImageFont.load_default())
    return canvas


def montage(paths: list[Path], target: Path, cols: int, tile=(300,190), labels: bool=True) -> None:
    rows = (len(paths)+cols-1)//cols
    canvas = Image.new("RGB", (tile[0]*cols, tile[1]*rows), "#080808")
    for i,p in enumerate(paths):
        img = label_image(p, p.stem, tile) if labels else Image.open(p).convert("RGB")
        if not labels:
            img.thumbnail(tile)
        canvas.paste(img, ((i%cols)*tile[0], (i//cols)*tile[1]))
    canvas.save(target, optimize=True)


def render_presentations() -> None:
    deck_pdfs = [PDFS / "ASK_MAGIC_MIKE_PHASE8_EXECUTIVE_PRESENTATION.pdf", PDFS / "ASK_MAGIC_MIKE_CURRENT_SYSTEM_SALES_PRESENTATION.pdf"]
    slide_images=[]
    for pdf in deck_pdfs:
        deck_dir=SLIDES/pdf.stem
        deck_dir.mkdir(parents=True,exist_ok=True)
        prefix=deck_dir/"slide"
        run("pdftoppm","-png","-r","110",str(pdf),str(prefix))
        imgs=sorted(deck_dir.glob("slide-*.png"))
        slide_images.extend(imgs)
        montage(imgs, RENDERS/f"{pdf.stem}_MONTAGE.png", cols=5, tile=(320,205))
    montage(slide_images, RENDERS/"PHASE8_PRESENTATION_VISUAL_QA_MONTAGE.png", cols=5, tile=(320,205))


def render_workbooks() -> None:
    requested = sorted((OUT / "workbooks").glob("*.xlsx"))
    for book in requested:
        run("soffice","--headless","--convert-to","pdf","--outdir",str(PREVIEWS),str(book))
        pdf=PREVIEWS/(book.stem+".pdf")
        preview=PREVIEWS/(book.stem+".png")
        run("pdftoppm","-f","1","-singlefile","-png","-r","150",str(pdf),str(PREVIEWS/book.stem))
        trimmed=PREVIEWS/(book.stem+".trimmed.png")
        run("magick",str(preview),"-fuzz","3%","-trim","+repage","-bordercolor","white","-border","32",str(trimmed))
        trimmed.replace(preview)
    previews=sorted(
        p for p in PREVIEWS.glob("*.png")
        if p.name != "PHASE8_WORKBOOK_PREVIEW_MONTAGE.png"
    )
    montage(previews, PREVIEWS/"PHASE8_WORKBOOK_PREVIEW_MONTAGE.png", cols=2, tile=(650,430))


def render_visual_assets() -> None:
    for svg in sorted((OUT/"visual-assets").rglob("*.svg")):
        png=svg.with_suffix(".png")
        webp=svg.with_suffix(".webp")
        run("sips","-s","format","png",str(svg),"--out",str(png))
        run("magick",str(png),str(webp))
    public=OUT/"screenshots"/"public"
    for shot in public.glob("*.png"):
        shutil.copy2(shot, INTERFACES/shot.name)
    lead_center=OUT/"screenshots"/"lead-center"
    for shot in lead_center.glob("*.png"):
        shutil.copy2(shot, INTERFACES/("lead-center-"+shot.name))
    for legacy in [
        REPO/"output/phase6/screenshots/after/desktop-1280-message-previews-viewport.png",
        REPO/"output/phase6/screenshots/after/mobile-390-message-previews-viewport.png",
    ]:
        if legacy.exists():
            shutil.copy2(legacy, INTERFACES/("accepted-"+legacy.name))


def render_public_montages() -> None:
    public=OUT/"screenshots"/"public"
    mobile=sorted(public.glob("*-390.png"))
    desktop=sorted(public.glob("*-1440.png"))
    montage(mobile, RENDERS/"PHASE8_PUBLIC_MOBILE_MONTAGE.png", cols=2, tile=(420,620))
    montage(desktop, RENDERS/"PHASE8_PUBLIC_DESKTOP_MONTAGE.png", cols=2, tile=(720,450))


def render_lead_center_montages() -> None:
    lead_center=OUT/"screenshots"/"lead-center"
    mobile=sorted(lead_center.glob("*-390.png"))
    desktop=sorted(lead_center.glob("*-1440.png"))
    montage(mobile, RENDERS/"PHASE8_LEAD_CENTER_MOBILE_MONTAGE.png", cols=2, tile=(420,620))
    montage(desktop, RENDERS/"PHASE8_LEAD_CENTER_DESKTOP_MONTAGE.png", cols=2, tile=(720,450))


if __name__ == "__main__":
    render_presentations()
    render_workbooks()
    render_visual_assets()
    render_public_montages()
    render_lead_center_montages()
    print(f"Rendered slide, workbook, public, Lead Center, and visual previews under {OUT}")
