"""Apply reproducible collection labels, featured picks and optional exclusions."""
import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent;base=root/'photos/wedding';path=base/'manifest.json';data=json.loads(path.read_text())
settings=json.loads((root/'photos/curation.json').read_text());excluded=set(settings.get('exclude',[]));overrides=settings.get('category',{})
for p in data['photos']:
 clock=p.get('capture','')[11:16]
 # Camera clocks put the ceremony before 15:30, reception from 15:45 to
 # 16:40, with outdoor portraits around those events. Explicit overrides win.
 p['category']=overrides.get(p['original'], 'ceremony' if clock and clock<'15:30' else 'reception' if '15:45'<=clock<'16:40' else 'portraits')
 p['hidden']=p['id'] in excluded or p['original'] in excluded
 # Optional manual rotation is applied once, preserving the RAW original.
 wanted=settings.get('rotate',{}).get(p['original'],0);applied=p.get('manualRotation',0)
 if wanted!=applied:
  for name in [p['file'],p['thumbnail']]:
   im=Image.open(base/name);icc=im.info.get('icc_profile');im=im.rotate(wanted-applied,expand=True);im.save(base/name,quality=88,optimize=True,icc_profile=icc)
  if abs(wanted-applied)%180:p['width'],p['height']=p.get('height'),p.get('width')
  p['manualRotation']=wanted
byname={p['original']:p for p in data['photos'] if not p['hidden']}
featured=[byname[n] for n in settings.get('featured',[]) if n in byname]
data['featured']=[p['id'] for p in featured];data['photos'].sort(key=lambda p:(p.get('capture',''),p['original']))
# The timestamp reflects new photos, rather than changing on every scheduled run.
data.pop('updated',None)
for i,p in enumerate(featured[:3]):
 target=root/'photos'/('featured'+('-'+str(i+1) if i else '')+'.jpg');source=base/p['file']
 if not target.exists() or target.read_bytes()!=source.read_bytes():target.write_bytes(source.read_bytes())
path.write_text(json.dumps(data,indent=2)+'\n')
print('Collections:',{c:sum(p['category']==c and not p['hidden'] for p in data['photos']) for c in ['ceremony','portraits','reception']})
