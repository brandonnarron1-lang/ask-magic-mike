# Ask Magic Mike Phase 8 artifact toolchain

This isolated toolchain creates editable Office files and searchable PDFs from the redacted source at `output/phase8/data/current-system-state.json`. It is not imported by the production application and does not read deployment secrets or lead rows.

## Bootstrap

```bash
cd tools/artifacts
npm ci
npx playwright install chromium
uv venv .venv
uv pip install --python .venv/bin/python -r requirements.txt
```

## Build and verify

```bash
TARGET_URL=https://www.askmagicmike.com npm run artifacts:visuals
npm run artifacts:build
npm run artifacts:verify
npm run artifacts:package
```

The visual command never submits a lead. It intentionally uses viewport-only screenshots because full-page capture can alter responsive layout during capture in some automation environments.

Outputs are deterministic in structure but may differ in ZIP timestamps and Office metadata. LibreOffice is used to export PDFs and recalculate workbooks. Poppler/ImageMagick create visual previews; qpdf and Open XML inspection verify integrity.

Production safety: do not add these dependencies to the repository root package. Do not place `.env` files, credentials, genuine PII, provider payloads, or hidden BCC values under `output/phase8/`.
