# Phase 8 artifact toolchain attempt log

| Attempt | Result | Evidence |
|---|---|---|
| Workspace dependency loader | Unavailable | Prior Phase 7 blocker; superseded by explicit fallback authorization |
| PptxGenJS discovery | Pass | npm registry reports 4.0.1 |
| LibreOffice discovery | Pass | `soffice` reports LibreOfficeDev 26.8.0.0.alpha0 |
| Poppler discovery | Pass | `pdftotext` and `pdfinfo` 26.06.0 |
| ImageMagick discovery | Pass | 7.1.2-16 |
| qpdf discovery | Pass | 12.3.2 |
| openpyxl discovery | Not preinstalled | Install pinned 3.1.5 in isolated `.venv` |
| Playwright discovery | Not preinstalled | Installed pinned 1.60.0 in the isolated toolchain; Chromium 148 provisioned by Playwright |
| PptxGenJS build | Pass | 15-slide executive deck and 25-slide sales deck generated with editable content |
| Workbook build | Pass | 13 multi-sheet workbooks generated |
| Office export/recalculation | Pass | Both decks and all workbooks opened/exported or recalculated by LibreOffice |
| Public visual capture | Pass after one harness correction | Full-page in-app capture reflowed responsive pages; reproducible viewport-only Playwright capture passed 72 checks |
| Artifact verification | Pass | `npm run artifacts:verify` validated Open XML, PDFs, formulas, images, and the secret/PII scan |
| npm audit | Accepted development-tool risk | Two high findings originate in PptxGenJS's transitive `image-size <=2.0.2`; the isolated generator processes only trusted repository assets and is excluded from the production bundle |

Failed methods are retained here rather than being relabeled as success.
