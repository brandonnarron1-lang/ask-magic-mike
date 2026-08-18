# Phase 8 artifact build commands

Run from `tools/artifacts/`:

```bash
npm ci
npx playwright install chromium
uv venv .venv
uv pip install --python .venv/bin/python -r requirements.txt
TARGET_URL=https://www.askmagicmike.com npm run artifacts:visuals
npm run artifacts:build
npm run artifacts:verify
npm run artifacts:package
```

Individual targets:

```bash
npm run artifacts:presentations
npm run artifacts:workbooks
npm run artifacts:pdf
npm run artifacts:render
npm run artifacts:visuals
```

Outputs are written under `output/phase8/`. The scripts read only `output/phase8/data/current-system-state.json` and approved repository assets. They never read deployment secrets or genuine lead rows.
