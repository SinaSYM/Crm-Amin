#!/usr/bin/env python3
"""Fix dark-mode contrast: drop `text-white` from classNames that also use
`bg-primary` or `bg-foreground`. In dark mode those backgrounds flip to white,
so a hardcoded `text-white` becomes invisible. The theme tokens
(text-primary-foreground / text-background) already flip correctly on their own.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGETS = [
    ROOT / 'src/components/crm',
    ROOT / 'src/components/ui',
    ROOT / 'src/app/page.tsx',
]

# A className string (single- or double-quoted) that contains bg-primary or bg-foreground
# AND text-white. We drop the `text-white` token only.
# Match patterns:  bg-primary, bg-primary/90, bg-foreground, bg-foreground/85, etc.
BG_RE = re.compile(r'\bbg-(?:primary|foreground)(?:/[0-9]+)?\b')
TEXT_WHITE_RE = re.compile(r'\btext-white\b')

changed_files = 0
changed_lines = 0

for base in TARGETS:
    files = [base] if base.is_file() else sorted(base.rglob('*.tsx'))
    for f in files:
        if not f.is_file():
            continue
        original = f.read_text(encoding='utf-8')
        lines = original.splitlines(keepends=True)
        new_lines = []
        file_changed = False
        for line in lines:
            if BG_RE.search(line) and TEXT_WHITE_RE.search(line):
                new_line = TEXT_WHITE_RE.sub('', line)
                # tidy up double spaces left behind
                new_line = new_line.replace('  ', ' ').replace('" ', '"').replace("' ", "'")
                new_lines.append(new_line)
                file_changed = True
                changed_lines += 1
            else:
                new_lines.append(line)
        if file_changed:
            f.write_text(''.join(new_lines), encoding='utf-8')
            changed_files += 1
            print(f'  fixed {f.relative_to(ROOT)}')

print(f'\nDone: {changed_files} file(s), {changed_lines} line(s) cleaned.')