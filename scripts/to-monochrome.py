"""One-off migration: convert legacy brand colors to monochrome HYPERGLASS theme."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

FAMILIES = ['teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'orange', 'emerald']

def rules_for(family):
    return [
        (rf'bg-{family}-600 hover:bg-{family}-700', 'bg-foreground text-background hover:bg-foreground/85'),
        (rf'dark:bg-{family}-\d+(/\d+)?', 'dark:bg-muted/20'),
        (rf'dark:border-{family}-\d+(/\d+)?', 'dark:border-border'),
        (rf'dark:text-{family}-\d+(/\d+)?', 'dark:text-foreground'),
        (rf'hover:bg-{family}-\d+(/\d+)?', 'hover:bg-muted/50'),
        (rf'hover:text-{family}-\d+(/\d+)?', 'hover:text-foreground'),
        (rf'text-{family}-\d+(/\d+)?', 'text-foreground'),
        (rf'bg-{family}-\d+(/\d+)?', 'bg-muted/60'),
        (rf'border-{family}-\d+(/\d+)?', 'border-border'),
        (rf'shadow-{family}-\d+(/\d+)?', 'shadow-neutral-400/30'),
        (rf'ring-{family}-\d+(/\d+)?', 'ring-foreground/30'),
        (rf'from-{family}-\d+(/\d+)?', 'from-neutral-500'),
        (rf'via-{family}-\d+(/\d+)?', 'via-neutral-400'),
        (rf'to-{family}-\d+(/\d+)?', 'to-neutral-800'),
    ]

RULES = []
for fam in FAMILIES:
    RULES.extend(rules_for(fam))

# Solid primary buttons should be foreground, not muted
POST_RULES = [(rf'(?<![:\w-])bg-{fam}-600\b', 'bg-foreground') for fam in FAMILIES]

changed = []
for path in (ROOT / 'src').rglob('*.tsx'):
    text = path.read_text(encoding='utf-8')
    original = text
    for pattern, repl in RULES + POST_RULES:
        text = re.sub(pattern, repl, text)
    if text != original:
        path.write_text(text, encoding='utf-8')
        changed.append(str(path.relative_to(ROOT)))

print(f'Changed {len(changed)} files:')
for f in changed:
    print(' -', f)
