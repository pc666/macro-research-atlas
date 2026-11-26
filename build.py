#!/usr/bin/env python3
"""Build the self-contained GitHub Pages entry point from editable sources."""
import json
from pathlib import Path
root=Path(__file__).resolve().parent
model=json.loads((root/'data/atlas.json').read_text(encoding='utf-8'))
ids=[p['id'] for p in model['papers']]
assert len(ids)==len(set(ids)), 'Duplicate publication ID'
assert not (set(ids)&{p['id'] for p in model['pending']}), 'Reviewed/pending overlap'
for r in model['relations']:
 assert r['from'] in ids and r['to'] in ids,(r['id'],'Missing endpoint')
 assert r['type'] in {'adopts','extends','compares','cites'}
 assert r.get('url') and r.get('locator') and r.get('claim'),(r['id'],'Missing evidence')
for p in model['papers']:
 assert p.get('evidence') and p.get('method') and p.get('access'),p['id']
 for e in p['evidence']:assert e.get('url') and e.get('locator') and e.get('claim'),p['id']
for group in model['matrixGroups']:assert all(p in ids for p in group['papers'])
encoded=json.dumps(model,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
html=(root/'src/template.html').read_text().replace('__STYLES__',(root/'src/styles.css').read_text()).replace('__DATA__',encoded).replace('__APP__',(root/'src/app.js').read_text())
(root/'index.html').write_text(html,encoding='utf-8')
print(f'Built index.html: {len(model["papers"])} reviewed, {len(model["pending"])} pending, {len(model["relations"])} documented relationships')
