#!/usr/bin/env python3
"""Export only the static website; never include editor passwords, drafts or history."""
from pathlib import Path
import json,zipfile
from content_engine import validate,build
root=Path(__file__).resolve().parents[1]
state=validate(json.loads((root/'.admin-state/content.json').read_text()),root);build(state,root)
paths=[p for p in root.glob('*.html') if p.name!='admin.html']
paths += [p for p in root.glob('*.css') if p.name!='admin.css']
paths += [root/n for n in ['script.js','motion.js','robots.txt','sitemap.xml','LICENSE-CINEMATIC-MODULES.txt','content/public.json']]
paths += [p for folder in ['assets','insights'] for p in (root/folder).rglob('*') if p.is_file()] if (root/'insights').exists() else [p for p in (root/'assets').rglob('*') if p.is_file()]
target=root/'archive/public-site.zip';target.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(set(paths)):z.write(p,p.relative_to(root))
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    assert all(not any(x.startswith('.') for x in Path(n).parts) and not n.startswith(('tools/','archive/')) and Path(n).name not in ['admin.html','admin.js','admin.css','admin_server.py'] for n in z.namelist())
print(f'Exported {len(set(paths))} public files to {target.relative_to(root)}. Private editor data and draft articles excluded.')
