# BNS Machine

Vendor-agnostic internal production scaffold for **Be Nelly's Superstars (BNS)**.

## Purpose
This folder is an isolated production system for managing:
- avatar branches
- song prompts
- Suno prompt blocks
- video workflow planning
- render queues
- QA gates
- prompt packs
- reusable branch templates

## Primary scaffolded branch
- `branches/01_backstreet_b_nellies/`

Backstreet B-Nellies is a five-member controlled pop-group variant set of one BNelly founder identity. The members are not five unrelated people.

## Structure overview
- `canon/`: identity, rules, quality gates, and release constraints
- `branches/`: per-project branch packages
- `tools/`: lightweight Python utilities (run from repo root)
- `schemas/`: placeholder for machine-readable schemas
- `render_queues/`: shared queue outputs
- `qa/`: shared QA artifacts
- `exports/`: export bundles
- `docs/`: internal notes and workflow docs

## Quickstart
1. Fill in canon files first.
2. Duplicate `branches/01_backstreet_b_nellies/` as a template for new branches.
3. Update character YAML files and prompt blocks.
4. Validate Suno block lengths:
   - title <= 80 chars
   - style <= 200 chars
   - lyrics <= 3000 chars
   - exclude <= 200 chars
5. Build render queue CSVs and run branch validation before generation.

## Tools
Run tools from repository root:

```bash
python BNS_MACHINE/tools/count_prompt_chars.py BNS_MACHINE/branches/01_backstreet_b_nellies/suno
python BNS_MACHINE/tools/validate_branch_package.py BNS_MACHINE/branches/01_backstreet_b_nellies
python BNS_MACHINE/tools/build_render_queue.py BNS_MACHINE/branches/01_backstreet_b_nellies
python BNS_MACHINE/tools/estimate_generation_cost.py BNS_MACHINE/branches/01_backstreet_b_nellies/render_queues
```

## Guardrails
- Late-1990s/early-2000s inspired mature male pop-group energy only.
- Do not copy real groups, artists, exact choreography, logos, branding, or costumes.
- Keep all variants tied to the BNelly founder identity lock.
