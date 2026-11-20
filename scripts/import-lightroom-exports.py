"""Publish Lightroom Classic JPEG exports, keeping original RAWs untouched.
Run after exporting sRGB JPEGs with original filenames. Existing orientation
corrections are preserved unless --orientation-in-lightroom is passed.
"""
import argparse,json,hashlib,subprocess,sys
from pathlib import Path
from PIL import Image,ImageOps,ImageCms
p=argparse.ArgumentParser();p.add_argument('exports',type=Path);p.add_argument('--orientation-in-lightroom',action='store_true');a=p.parse_args()
root=Path(__file__).resolve().parent.parent;base=root/'photos/wedding';path=base/'manifest.json';data=json.loads(path.read_text());profile=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes();count=0
# Validate the whole batch first so an incomplete export cannot partially replace it.
files={x.stem.lower():x for x in a.exports.iterdir() if x.suffix.lower() in ('.jpg','.jpeg')}
missing=[p['original'] for p in data['photos'] if Path(p['original']).stem.lower() not in files]
if missing:raise SystemExit(f'Export incomplete: {len(missing)} photos missing; first: {missing[:5]}')
for photo in data['photos']:
 source=files[Path(photo['original']).stem.lower()]
 with Image.open(source) as check:
  if check.format!='JPEG':raise SystemExit(f'Not a JPEG: {source.name}')
  check.verify()
for photo in data['photos']:
 source=files[Path(photo['original']).stem.lower()];im=ImageOps.exif_transpose(Image.open(source)).convert('RGB')
 if not a.orientation_in_lightroom:im=im.rotate(photo.get('rotation',0)+photo.get('manualRotation',0),expand=True)
 im.thumbnail((2400,2400));im.save(base/photo['file'],'JPEG',quality=90,optimize=True,icc_profile=profile)
 photo['width'],photo['height']=im.size
 im.thumbnail((600,600));im.save(base/photo['thumbnail'],'JPEG',quality=80,optimize=True,icc_profile=profile)
 photo['editor']='Adobe Lightroom Classic';photo['lightroomExportSHA256']=hashlib.sha256(source.read_bytes()).hexdigest();count+=1
path.write_text(json.dumps(data,indent=2)+'\n');subprocess.run([sys.executable,str(root/'scripts/curate-wedding-photos.py')],check=True);print(f'Published {count} Lightroom Classic edits.')
