"""Sync Finder green/blue selections and red Lightroom/Finder exclusions.
Automatically writing XMP in Lightroom makes color-label changes visible here.
With --publish, a clean checkout is required and only the generated selections,
manifest and featured images are committed/pushed. Unrelated edits are skipped.
"""
import argparse,json,os,plistlib,re,subprocess,sys,xml.etree.ElementTree as ET
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('originals',type=Path);p.add_argument('--publish',action='store_true');a=p.parse_args()
root=Path(__file__).resolve().parent.parent

def git(*args):return subprocess.check_output(['git','-C',str(root),*args],text=True).strip()
if not a.originals.is_dir():raise SystemExit('Originals folder is unavailable; keeping existing exclusions.')
if a.publish:
 if git('status','--porcelain'):raise SystemExit('Checkout has pending edits; skipping automatic label publication.')
 subprocess.run(['git','-C',str(root),'pull','--rebase','origin','main'],check=True)
manifest=json.loads((root/'photos/wedding/manifest.json').read_text());red=[]
selection_folder=a.originals.parent/'Full-resolution JPEGs'
selection_enabled=selection_folder.is_dir() and any(selection_folder.glob('*.jpg'))
green=[];blue=[]
previous_red=set(json.loads((root/'photos/red-labels.json').read_text()))
def finder_tags(path):
 try:
  result=subprocess.run(['xattr','-px','com.apple.metadata:_kMDItemUserTags',str(path)],capture_output=True)
  tags=plistlib.loads(bytes.fromhex(result.stdout.decode())) if result.returncode==0 else []
  colors={'2':'green','4':'blue','6':'red'}
  return {colors.get(t.rsplit('\n',1)[-1],t.split('\n')[0].lower()) for t in tags}
 except (OSError,ValueError,plistlib.InvalidFileException):return set()

for photo in manifest['photos']:
 raw=a.originals/photo['original'];sidecar=raw.with_suffix('.xmp');is_red=False
 if not raw.exists():is_red=photo['original'] in previous_red
 if sidecar.exists():
  try:
   tree=ET.parse(sidecar)
   values=[v for el in tree.iter() for k,v in el.attrib.items() if k=='{http://ns.adobe.com/xap/1.0/}Label']
   values += [el.text or '' for el in tree.iter('{http://ns.adobe.com/xap/1.0/}Label')]
   is_red=any(v.strip().lower()=='red' for v in values)
  except ET.ParseError:raise SystemExit('Lightroom is writing metadata; retry later.')
 tags=finder_tags(raw)
 if selection_enabled:
  jpeg_tags=finder_tags(selection_folder/(Path(photo['original']).stem+'.jpg'))
  tags |= jpeg_tags
  if 'green' in jpeg_tags:green.append(photo['original'])
  if 'blue' in jpeg_tags:blue.append(photo['original'])
 is_red |= 'red' in tags
 if is_red:red.append(photo['original'])
path=root/'photos/red-labels.json';text=json.dumps(sorted(red),indent=2)+'\n'
changes=not path.exists() or path.read_text()!=text
selection_path=root/'photos/finder-selection.json'
if selection_enabled:
 selected={'include':sorted(set(green+blue)),'featured':sorted(blue)}
 selection_text=json.dumps(selected,indent=2)+'\n'
 if not selection_path.exists() or selection_path.read_text()!=selection_text:
  selection_path.write_text(selection_text);changes=True
collections_folder=Path.home()/'Downloads/Thank Yous'
if collections_folder.is_dir():
 bystem={Path(photo['original']).stem.upper():photo['original'] for photo in manifest['photos']};groups=[]
 for folder in sorted(collections_folder.iterdir()):
  if not folder.is_dir() or 'green' not in finder_tags(folder):continue
  label='Mother of the bride' if 'dede' in folder.name.lower() else folder.name.strip();names=set()
  for file in folder.rglob('*'):
   if file.suffix.lower() not in ('.jpg','.jpeg','.png','.cr3'):continue
   stem=re.sub(r' copy(?: \d+)?$','',file.stem,flags=re.I).upper()
   if stem in bystem:names.add(bystem[stem])
  groups.append({'name':label,'photos':sorted(names)})
 collection_path=root/'photos/folder-collections.json';collection_text=json.dumps({'groups':groups},indent=2)+'\n'
 if not collection_path.exists() or collection_path.read_text()!=collection_text:collection_path.write_text(collection_text);changes=True
if not changes:print(f'No label changes ({len(red)} red, {len(green)} green, {len(blue)} blue photos).');sys.exit(0)
path.write_text(text)
subprocess.run([sys.executable,str(root/'scripts/curate-wedding-photos.py')],check=True)
print(f'Selection: {len(green)} green, {len(blue)} blue, {len(red)} red; originals retained.')
if a.publish:
 subprocess.run(['git','-C',str(root),'add','photos/red-labels.json','photos/finder-selection.json','photos/folder-collections.json','photos/wedding/manifest.json','photos/featured.jpg','photos/featured-2.jpg','photos/featured-3.jpg'],check=True)
 if git('diff','--cached','--name-only'):
  subprocess.run(['git','-C',str(root),'commit','-m','Update wedding gallery from Finder photo selections'],check=True)
  subprocess.run(['git','-C',str(root),'push','origin','main'],check=True)
