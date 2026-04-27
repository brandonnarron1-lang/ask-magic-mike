#!/usr/bin/env python3
from pathlib import Path
import sys

LIMITS = {
    'title.txt': 80,
    'style.txt': 200,
    'lyrics_v1.txt': 3000,
    'exclude.txt': 200,
}

def main() -> int:
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('BNS_MACHINE/branches/01_backstreet_b_nellies/suno')
    ok = True
    for filename, limit in LIMITS.items():
        path = folder / filename
        if not path.exists():
            print(f'MISSING: {path}')
            ok = False
            continue
        text = path.read_text(encoding='utf-8').strip()
        count = len(text)
        status = 'OK' if count <= limit else 'OVER'
        print(f'{filename}: {count}/{limit} [{status}]')
        if count > limit:
            ok = False
    return 0 if ok else 1

if __name__ == '__main__':
    raise SystemExit(main())
