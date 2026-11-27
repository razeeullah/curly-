#!/usr/bin/env python3
"""Check media/reference preservation and the deployable HTML's local resources."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib
import json
import sys

root = Path(__file__).resolve().parents[1]
errors = []
class Inspect(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids = set(); self.refs = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            if a['id'] in self.ids: errors.append('Duplicate id: ' + a['id'])
            self.ids.add(a['id'])
        for key in ('src', 'href', 'poster'):
            value = a.get(key, '')
            if value and not value.startswith(('#','http:','https:','data:','mailto:','tel:')):
                self.refs.append(value)

pages = []
for html_file in sorted(list(root.glob('*.html')) + list((root / 'insights').glob('*.html'))):
    page = Inspect(); page.feed(html_file.read_text()); pages.append(page)
    for ref in page.refs:
        if not (html_file.parent / ref.split('#')[0].split('?')[0]).is_file():
            errors.append(f'{html_file.name}: Missing local asset: {ref}')
expected = json.loads((root / 'tools/verification/checksums.json').read_text())
checked = 0
for path, digest in expected.items():
    p = Path(path)
    if p.name in ('logo.png', 'sk-films-ident.mp4'): p = root / 'assets' / p.name
    if not p.is_file():
        if p.name in ('logo.png','sk-films-ident.mp4'): errors.append('Missing official media: ' + str(p))
        continue
    checked += 1
    if hashlib.sha256(p.read_bytes()).hexdigest() != digest: errors.append('Preservation checksum changed: ' + str(p))
inventory = json.loads((root / 'tools/verification/source-inventory.json').read_text())
if len(inventory) != 30: errors.append('Expected exactly 30 audited components')
print(f'Checked {sum(len(p.ids) for p in pages)} HTML IDs across {len(pages)} pages, {sum(len(p.refs) for p in pages)} local references, {checked} preserved files and {len(inventory)} component records.')
if errors:
    print('\n'.join(errors)); sys.exit(1)
print('PASS: assets resolve; official media and available original references are unchanged.')
