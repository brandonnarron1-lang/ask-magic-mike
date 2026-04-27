#!/usr/bin/env python3
"""Count Suno prompt characters and enforce simple per-file limits."""

from __future__ import annotations

from pathlib import Path
import argparse

LIMITS = {
    "title.txt": 80,
    "style.txt": 200,
    "lyrics_v1.txt": 3000,
    "exclude.txt": 200,
}


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "suno_dir",
        nargs="?",
        default="BNS_MACHINE/branches/01_backstreet_b_nellies/suno",
        help="Path to a directory containing Suno prompt text files.",
    )
    return parser.parse_args()


def main() -> int:
    """Validate character counts for required Suno files."""
    args = parse_args()
    folder = Path(args.suno_dir)

    ok = True
    for filename, limit in LIMITS.items():
        path = folder / filename
        if not path.exists():
            print(f"MISSING: {path}")
            ok = False
            continue

        text = path.read_text(encoding="utf-8").strip()
        count = len(text)
        status = "OK" if count <= limit else "OVER"
        print(f"{filename}: {count}/{limit} [{status}]")

        if count > limit:
            ok = False

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
