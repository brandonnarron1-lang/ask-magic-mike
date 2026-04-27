# Validation Report

Date: 2026-04-27 (UTC)

## Scripts checked
- `BNS_MACHINE/tools/count_prompt_chars.py`
- `BNS_MACHINE/tools/validate_branch_package.py`
- `BNS_MACHINE/tools/build_render_queue.py`
- `BNS_MACHINE/tools/estimate_generation_cost.py`

## Syntax check
Command:
```bash
python -m py_compile \
  BNS_MACHINE/tools/count_prompt_chars.py \
  BNS_MACHINE/tools/validate_branch_package.py \
  BNS_MACHINE/tools/build_render_queue.py \
  BNS_MACHINE/tools/estimate_generation_cost.py
```

Result: passed (no output, exit code 0).

## Command outputs

### 1) Suno character counts
Command:
```bash
python BNS_MACHINE/tools/count_prompt_chars.py BNS_MACHINE/branches/01_backstreet_b_nellies/suno
```
Output:
```text
title.txt: 18/80 [OK]
style.txt: 175/200 [OK]
lyrics_v1.txt: 1002/3000 [OK]
exclude.txt: 114/200 [OK]
```

### 2) Branch validation
Command:
```bash
python BNS_MACHINE/tools/validate_branch_package.py BNS_MACHINE/branches/01_backstreet_b_nellies
```
Output:
```text
Branch package is complete: BNS_MACHINE/branches/01_backstreet_b_nellies
```

### 3) Combined render queue build
Command:
```bash
python BNS_MACHINE/tools/build_render_queue.py BNS_MACHINE/branches/01_backstreet_b_nellies
```
Output:
```text
Wrote 11 rows to BNS_MACHINE/branches/01_backstreet_b_nellies/render_queues/combined_queue.csv
```

Combined render queue row count: **11** data rows.

### 4) Cost estimate
Command:
```bash
python BNS_MACHINE/tools/estimate_generation_cost.py BNS_MACHINE/branches/01_backstreet_b_nellies/render_queues
```
Output:
```text
heygen_queue.csv: 5 rows x $0.40 = $2.00
runway_queue.csv: 3 rows x $0.70 = $2.10
manual_composite_queue.csv: 3 rows x $1.20 = $3.60
Estimated total: $7.70
```

Estimated cost: **$7.70**.

## Unicode control character scan
Hidden/bidirectional Unicode character scan on `BNS_MACHINE` text/code files:
- Result: none found.
