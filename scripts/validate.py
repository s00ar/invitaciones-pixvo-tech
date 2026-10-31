from pathlib import Path
import json, xml.etree.ElementTree as ET, hashlib
root=Path(__file__).resolve().parents[1]
catalog=json.loads((root/'templates/catalog.json').read_text())
assert len(catalog)==27
assert len({t['id'] for t in catalog})==27
assert {t['family'] for t in catalog}=={'editorial','ornamental','party','kids','corporate'}
expected={'weddings':6,'xv':6,'parties':4,'kids':7,'corporate':4}
for cat,n in expected.items(): assert sum(t['category']==cat for t in catalog)==n
for t in catalog:
 p=root/t['backgroundAsset'];assert p.is_file();ET.parse(p)
 assert t['reference']['url'].startswith('https://invita.somosweb.ar/preview/')
for folder in ('templates','schemas','examples','brand','research'):
 for p in (root/folder).rglob('*.json'):json.loads(p.read_text(encoding='utf-8'))
example=json.loads((root/'examples/quince.json').read_text());assert example['templateId'] in {t['id'] for t in catalog}
for p in root.glob('brand/*.webp'):
 b=p.read_bytes();assert b[:4]==b'RIFF' and b[8:12]==b'WEBP'
manifest=root/'research/asset-manifest.json'
if manifest.exists():
 for a in json.loads(manifest.read_text()):
  if a['status']=='downloaded' and (root/a['path']).exists(): assert hashlib.sha256((root/a['path']).read_bytes()).hexdigest()==a['sha256']
print('OK: 27 presets, 5 categorías y familias, SVG/JSON válidos, ejemplo enlazado, logos WebP y checksums de referencias.')
print('Esta comprobación valida recursos del kit. Las pruebas de la aplicación se ejecutan con npm test y npm run test:e2e.')
