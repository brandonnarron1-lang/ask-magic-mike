#!/usr/bin/env python3
"""Build a combined render queue CSV from branch queue source files."""

from __future__ import annotations

from pathlib import Path
import argparse
import csv


QUEUE_FILES = [
    "heygen_queue.csv",
    "runway_queue.csv",
    "manual_composite_queue.csv",
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
    """Merge queue CSV rows and write combined_queue.csv."""
    args = parse_args()
    branch = Path(args.branch_dir)
    queue_dir = branch / "render_queues"
    output = queue_dir / "combined_queue.csv"

    rows: list[dict[str, str]] = []
    for queue_name in QUEUE_FILES:
        source = queue_dir / queue_name
        if not source.exists():
            print(f"Skipping missing file: {source}")
            continue

        with source.open(newline="", encoding="utf-8") as file_obj:
            reader = csv.DictReader(file_obj)
            for row in reader:
                row["_source"] = queue_name
                rows.append(row)

    if not rows:
        print("No queue rows found.")
        return 1

    all_columns = sorted({key for row in rows for key in row.keys()})
    with output.open("w", newline="", encoding="utf-8") as file_obj:
        writer = csv.DictWriter(file_obj, fieldnames=all_columns)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
