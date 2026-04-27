#!/usr/bin/env python3
"""Estimate generation cost from queue CSV row counts."""

from __future__ import annotations

from pathlib import Path
import argparse
import csv

# Placeholder USD rates per queue row.
RATES = {
    "heygen_queue.csv": 0.40,
    "runway_queue.csv": 0.70,
    "manual_composite_queue.csv": 1.20,
}


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "queue_dir",
        nargs="?",
        default="BNS_MACHINE/branches/01_backstreet_b_nellies/render_queues",
        help="Path to render_queues directory.",
    )
    return parser.parse_args()


def row_count(path: Path) -> int:
    """Return CSV data row count (excluding header)."""
    with path.open(newline="", encoding="utf-8") as file_obj:
        return max(sum(1 for _ in csv.reader(file_obj)) - 1, 0)


def main() -> int:
    """Compute and print per-queue and total estimated costs."""
    args = parse_args()
    queue_dir = Path(args.queue_dir)

    total = 0.0
    for file_name, rate in RATES.items():
        path = queue_dir / file_name
        if not path.exists():
            print(f"{file_name}: missing")
            continue

        count = row_count(path)
        cost = count * rate
        total += cost
        print(f"{file_name}: {count} rows x ${rate:.2f} = ${cost:.2f}")

    print(f"Estimated total: ${total:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
