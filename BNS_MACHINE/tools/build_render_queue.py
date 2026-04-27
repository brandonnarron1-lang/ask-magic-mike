#!/usr/bin/env python3
from pathlib import Path
import csv
import sys


def main() -> int:
    branch = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('BNS_MACHINE/branches/01_backstreet_b_nellies')
    output = branch / 'render_queues' / 'combined_queue.csv'
    output.parent.mkdir(parents=True, exist_ok=True)

    sources = [
        branch / 'render_queues' / 'heygen_queue.csv',
        branch / 'render_queues' / 'runway_queue.csv',
        branch / 'render_queues' / 'manual_composite_queue.csv',
    ]

    rows = []
    for source in sources:
        if not source.exists():
            print(f'Skipping missing file: {source}')
            continue
        with source.open(newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                row['_source'] = source.name
                rows.append(row)

    if not rows:
        print('No queue rows found.')
        return 1

    keys = sorted({k for row in rows for k in row.keys()})
    with output.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(rows)

    print(f'Wrote {len(rows)} rows to {output}')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
