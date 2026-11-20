"""Read red Lightroom XMP labels / Finder tags; hide, never delete, those photos.
Automatically writing XMP in Lightroom makes color-label changes visible here.
With --publish, a clean checkout is required and only the generated exclusions,
manifest and featured images are committed/pushed. Unrelated edits are skipped.
"""
import argparse,json,os,plistlib,subprocess,sys,xml.etree.ElementTree as ET
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('originals',type=Path);p.add_argument('--publish',action='store_true');a=p.parse_args()
root=Path(__file__).resolve().parent.parent

def git(*args):return subprocess.check_output(['git','-C',str(root),*args],text=True).strip()
if not a.originals.is_dir():raise SystemExit('Originals folder is unavailable; keeping existing exclusions.')
if a.publish:
 if git('status','--porcelain'):raise SystemExit('Checkout has pending edits; skipping automatic label publication.')
 subprocess.run(['git','-C',str(root),'pull','--rebase','origin','main'],check=True)
manifest=json.loads((root/'photos/wedding/manifest.json').read_text());red=[]
for photo in manifest['photos']:
 raw=a.originals/photo['original'];sidecar=raw.with_suffix('.xmp');is_red=False
 if not raw.exists():raise SystemExit('Originals are incomplete; keeping existing exclusions.')
 if sidecar.exists():
  try:
   tree=ET.parse(sidecar)
   values=[v for el in tree.iter() for k,v in el.attrib.items() if k=='{http://ns.adobe.com/xap/1.0/}Label']
   values += [el.text or '' for el in tree.iter('{http://ns.adobe.com/xap/1.0/}Label')]
   is_red=any(v.strip().lower()=='red' for v in values)
  except ET.ParseError:raise SystemExit('Lightroom is writing metadata; retry later.')
 try:
  result=subprocess.run(['xattr','-px','com.apple.metadata:_kMDItemUserTags',str(raw)],capture_output=True)
  tags=plistlib.loads(bytes.fromhex(result.stdout.decode())) if result.returncode==0 else []
  is_red |= any(t.lower().split('\n')[0]=='red' or t.endswith('\n6') for t in tags)
 except OSError:pass
 if is_red:red.append(photo['original'])
path=root/'photos/red-labels.json';text=json.dumps(sorted(red),indent=2)+'\n'
if path.exists() and path.read_text()==text:print(f'No label changes ({len(red)} red photos).');sys.exit(0)
path.write_text(text)
subprocess.run([sys.executable,str(root/'scripts/curate-wedding-photos.py')],check=True)
print(f'{len(red)} red-labeled photos hidden; all originals retained.')
if a.publish:
 subprocess.run(['git','-C',str(root),'add','photos/red-labels.json','photos/wedding/manifest.json','photos/featured.jpg','photos/featured-2.jpg','photos/featured-3.jpg'],check=True)
 if git('diff','--cached','--name-only'):
  subprocess.run(['git','-C',str(root),'commit','-m','Update wedding gallery from red photo labels'],check=True)
  subprocess.run(['git','-C',str(root),'push','origin','main'],check=True)
