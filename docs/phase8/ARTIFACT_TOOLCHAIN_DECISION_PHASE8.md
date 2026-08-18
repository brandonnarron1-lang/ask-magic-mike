# Phase 8 artifact toolchain decision

The artifact toolchain is isolated under `tools/artifacts/` and is excluded from the production Next.js dependency graph.

| Artifact | Primary tool | Verification/export | Reason |
|---|---|---|---|
| PPTX | PptxGenJS 4.0.1 | LibreOfficeDev 26.8 headless, Open XML inspection, Poppler/ImageMagick rendering | Editable text, shapes, charts, connectors, notes, and embedded media |
| XLSX | openpyxl 3.1.5 | LibreOfficeDev 26.8 recalculation, Open XML/formula scan, PDF/PNG previews | Real multi-sheet workbooks with formulas, validation, filters, and freeze panes |
| PDF | LibreOfficeDev 26.8 plus ReportLab 4.4.4 | qpdf, pdfinfo, pdftotext, Poppler rendering | Searchable text, predictable export, page and image verification |
| Images/montages | Pillow 12.1.1 and ImageMagick 7.1.2 | Pixel dimensions and montage inspection | Reproducible previews without altering production assets |
| Public route evidence | Playwright 1.60.0 with Chromium 148 | 72 responsive checks and viewport-only screenshots | Reproducible capture that does not submit leads or pollute production telemetry |
| Packages | Python `zipfile`, `shasum`, `unzip`, qpdf | Integrity, checksum, secret/PII scan | Deterministic package assembly and evidence |

The proprietary workspace dependency loader was unavailable. The user expressly authorized open-source fallbacks; PptxGenJS/openpyxl/LibreOffice are therefore the canonical Phase 8 artifact path. No PDF-as-PowerPoint, Markdown-as-Excel, or full-slide screenshot substitution is allowed.

`npm audit` reports two high-severity findings in PptxGenJS's transitive `image-size <=2.0.2`. This is accepted only for the isolated development toolchain: it is not bundled with the Next.js application, reads only trusted repository-owned PNG assets, and never processes user uploads or production lead data. A breaking-force upgrade was not applied because it would reduce reproducibility without reducing production exposure.
