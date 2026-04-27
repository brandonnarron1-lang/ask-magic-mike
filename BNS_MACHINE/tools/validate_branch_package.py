#!/usr/bin/env python3
"""Validate that a branch package contains required scaffold files."""

from __future__ import annotations

from pathlib import Path
import argparse

REQUIRED = [
    "README.md",
    "character_bible.md",
    "visual_style_guide.md",
    "capture_checklist.md",
    "suno/title.txt",
    "suno/style.txt",
    "suno/exclude.txt",
    "suno/lyrics_v1.txt",
    "visual_prompts/group_lineup_prompt.txt",
    "motion_prompts/member_motion_prompts.md",
    "shot_matrices/60_second_proof_shot_matrix.csv",
    "render_queues/heygen_queue.csv",
    "render_queues/runway_queue.csv",
    "render_queues/manual_composite_queue.csv",
    "qa/identity_qa.md",
    "qa/lipsync_qa.md",
    "qa/group_composite_qa.md",
    "qa/final_60s_proof_gate.md",
]

CHARACTER_FILES = [
    "characters/01_clean_lead.yml",
    "characters/02_leather_rebel.yml",
    "characters/03_blond_spark.yml",
    "characters/04_soul_edge.yml",
    "characters/05_sporty_charm.yml",
]


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "branch_dir",
        nargs="?",
        default="BNS_MACHINE/branches/01_backstreet_b_nellies",
        help="Path to branch package directory.",
    )
    return parser.parse_args()


def main() -> int:
    """Check branch package completeness and print missing files."""
    args = parse_args()
    branch = Path(args.branch_dir)

    missing: list[str] = []
    for rel_path in REQUIRED + CHARACTER_FILES:
        if not (branch / rel_path).exists():
            missing.append(rel_path)

    if missing:
        print("Missing files:")
        for rel_path in missing:
            print(f" - {rel_path}")
        return 1

    print(f"Branch package is complete: {branch}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
