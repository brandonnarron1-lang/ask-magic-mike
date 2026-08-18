#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$TOOL_DIR/../.." && pwd)"
OUT_DIR="$REPO_DIR/output/phase8"
PRESENTATION_DIR="$OUT_DIR/presentations"
WORKBOOK_DIR="$OUT_DIR/workbooks"
PDF_DIR="$OUT_DIR/pdfs"
RECALC_DIR="$OUT_DIR/.recalculated"

mkdir -p "$PDF_DIR" "$RECALC_DIR"

for deck in "$PRESENTATION_DIR"/*.pptx; do
  [ -e "$deck" ] || continue
  soffice --headless --convert-to pdf --outdir "$PDF_DIR" "$deck" >/dev/null
done

for workbook in "$WORKBOOK_DIR"/*.xlsx; do
  [ -e "$workbook" ] || continue
  soffice --headless --convert-to xlsx --outdir "$RECALC_DIR" "$workbook" >/dev/null
  recalculated="$RECALC_DIR/$(basename "$workbook")"
  if [ -f "$recalculated" ]; then
    mv "$recalculated" "$workbook"
  fi
done

rmdir "$RECALC_DIR" 2>/dev/null || true
