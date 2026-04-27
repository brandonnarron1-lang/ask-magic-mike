#!/usr/bin/env python3
from pathlib import Path
import sys

REQUIRED = [
    'README.md',
    'character_bible.md',
    'visual_style_guide.md',
    'capture_checklist.md',
    'suno/title.txt',
    'suno/style.txt',
    'suno/exclude.txt',
    'suno/lyrics_v1.txt',
    'visual_prompts/group_lineup_prompt.txt',
    'motion_prompts/member_motion_prompts.md',
    'shot_matrices/60_second_proof_shot_matrix.csv',
    'render_queues/heygen_queue.csv',
    'render_queues/runway_queue.csv',
    'render_queues/manual_composite_queue.csv',
    'qa/identity_qa.md',
    'qa/lipsync_qa.md',
    'qa/group_composite_qa.md',
    'qa/final_60s_proof_gate.md',
]

CHAR_FILES = [
    'characters/01_clean_lead.yml',
    'characters/02_leather_rebel.yml',
    'characters/03_blond_spark.yml',
    'characters/04_soul_edge.yml',
    'characters/05_sporty_charm.yml',
]


def main() -> int:
    branch = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('BNS_MACHINE/branches/01_backstreet_b_nellies')
    missing = []
    for rel in REQUIRED + CHAR_FILES:
        if not (branch / rel).exists():
            missing.append(rel)

    if missing:
        print('Missing files:')
        for rel in missing:
            print(f' - {rel}')
        return 1

    print(f'Branch package is complete: {branch}')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
