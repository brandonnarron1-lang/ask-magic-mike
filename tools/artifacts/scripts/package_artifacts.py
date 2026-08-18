from __future__ import annotations

import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
OUT = REPO / "output" / "phase8"
RELEASE = OUT / "release"
RELEASE.mkdir(parents=True, exist_ok=True)


def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()


def zip_paths(target: Path, paths: list[tuple[Path,str]]) -> None:
    with ZipFile(target,"w",ZIP_DEFLATED,compresslevel=9) as z:
        for src,arcroot in sorted(paths,key=lambda x:(x[1],str(x[0]))):
            if src.is_dir():
                for p in sorted(src.rglob("*")):
                    if not p.is_file():
                        continue
                    if any(part in {"node_modules",".venv","__pycache__",".git"} for part in p.parts):
                        continue
                    if p.name.startswith(".~lock") or p.suffix in {".tmp",".env"}:
                        continue
                    z.write(p,str(Path(arcroot)/p.relative_to(src)))
            elif src.is_file():
                z.write(src,str(Path(arcroot)/src.name))


def build_manifest() -> list[dict]:
    records=[]
    roots=[OUT/"presentations",OUT/"workbooks",OUT/"pdfs",OUT/"renders",OUT/"workbook-previews",OUT/"visual-assets",OUT/"data",OUT/"verification"]
    for root in roots:
        for p in sorted(root.rglob("*")) if root.exists() else []:
            if p.is_file():
                records.append({"path":str(p.relative_to(REPO)),"bytes":p.stat().st_size,"sha256":sha256(p)})
    (OUT/"ARTIFACT_MANIFEST_PHASE8.json").write_text(json.dumps({"generated":"2026-08-18","files":records},indent=2))
    return records


if __name__ == "__main__":
    scan=json.loads((OUT/"verification"/"secret-pii-scan.json").read_text())
    if not scan.get("pass"):
        raise SystemExit("Refusing to package: secret/PII scan did not pass")
    build_manifest()

    visual_zip=RELEASE/"ASK_MAGIC_MIKE_PHASE8_VISUAL_ASSET_PACKAGE.zip"
    zip_paths(visual_zip,[(OUT/"visual-assets","visual-assets"),(OUT/"renders"/"PHASE8_PUBLIC_MOBILE_MONTAGE.png","montages"),(OUT/"renders"/"PHASE8_PUBLIC_DESKTOP_MONTAGE.png","montages")])
    (visual_zip.with_suffix(visual_zip.suffix+".sha256")).write_text(f"{sha256(visual_zip)}  {visual_zip.name}\n")

    final=RELEASE/"Ask_Magic_Mike_Phase8_Editable_Artifact_Completion_Package_2026-08-18.zip"
    selected=[
        (OUT/"presentations","presentations"),
        (OUT/"workbooks","workbooks"),
        (OUT/"pdfs","pdfs"),
        (OUT/"renders","visual-qa"),
        (OUT/"workbook-previews","workbook-previews"),
        (OUT/"visual-assets","visual-assets"),
        (OUT/"data","data"),
        (OUT/"verification","verification"),
        (REPO/"docs"/"phase8","documentation"),
        (REPO/"tools"/"artifacts","toolchain"),
        (OUT/"ARTIFACT_MANIFEST_PHASE8.json","manifest"),
        (visual_zip,"release"),
        (visual_zip.with_suffix(visual_zip.suffix+".sha256"),"release"),
    ]
    zip_paths(final,selected)
    sidecar=RELEASE/"Ask_Magic_Mike_Phase8_Editable_Artifact_Completion_Package_2026-08-18.zip.sha256"
    sidecar.write_text(f"{sha256(final)}  {final.name}\n")
    with ZipFile(final) as z:
        bad=z.testzip()
        names=z.namelist()
    report={"archive":final.name,"entries":len(names),"bad_entry":bad,"sha256":sha256(final),"pass":bad is None}
    (OUT/"verification"/"zip-verification.json").write_text(json.dumps(report,indent=2))
    print(json.dumps(report))
