#!/usr/bin/env python3
from pathlib import Path
import csv
import sys

# Flat placeholder estimates in USD per queue row
RATES = {
    'heygen_queue.csv': 0.40,
    'runway_queue.csv': 0.70,
    'manual_composite_queue.csv': 1.20,
}


def row_count(path: Path) -> int:
    with path.open(newline='', encoding='utf-8') as f:
        return max(sum(1 for _ in csv.reader(f)) - 1, 0)


def main() -> int:
    queue_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('BNS_MACHINE/branches/01_backstreet_b_nellies/render_queues')
    total = 0.0
    for name, rate in RATES.items():
        path = queue_dir / name
        if not path.exists():
            print(f'{name}: missing')
            continue
        count = row_count(path)
        cost = count * rate
        total += cost
        print(f'{name}: {count} rows x ${rate:.2f} = ${cost:.2f}')
    print(f'Estimated total: ${total:.2f}')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
