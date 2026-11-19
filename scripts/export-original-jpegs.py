"""Export full-resolution JPEG copies; original RAWs remain unchanged."""
import argparse,json,time,concurrent.futures
from pathlib import Path
import rawpy
from PIL import Image,ImageEnhance,ImageCms
p=argparse.ArgumentParser();p.add_argument('--originals',required=True);p.add_argument('--output',required=True);p.add_argument('--watch-until',type=int,default=0);a=p.parse_args()
root=Path(__file__).resolve().parent.parent;output=Path(a.output).expanduser();output.mkdir(parents=True,exist_ok=True);profile=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
def export(p):
 dest=output/Path(p['original']).with_suffix('.jpg').name
 if dest.exists():return
 src=Path(a.originals)/(p['id']+'_'+p['original'])
 settings=json.loads((root/'photos/curation.json').read_text());rotation=p.get('rotation',0)+settings.get('rotate',{}).get(p['original'],0)
 with rawpy.imread(str(src)) as raw:
  rgb=raw.postprocess(use_camera_wb=True,no_auto_bright=False,auto_bright_thr=.01,bright=1.0,highlight_mode=rawpy.HighlightMode.Blend,output_color=rawpy.ColorSpace.sRGB,output_bps=8,half_size=False)
 im=Image.fromarray(rgb)
 if rotation:im=im.rotate(rotation,expand=True)
 im=ImageEnhance.Color(im).enhance(1.025)
 exif=Image.Exif();exif[274]=1
 if p.get('capture'):exif[306]=p['capture'];exif[34665]={36867:p['capture'],36868:p['capture']}
 temp=dest.with_suffix('.part');im.save(temp,'JPEG',quality=94,optimize=True,icc_profile=profile,exif=exif);temp.replace(dest)
 print(dest.name,im.size,flush=True)
while True:
 data=json.loads((root/'photos/wedding/manifest.json').read_text());photos=data['photos'];pending=[p for p in photos if not (output/Path(p['original']).with_suffix('.jpg').name).exists()]
 with concurrent.futures.ThreadPoolExecutor(2) as pool:
  for _ in pool.map(export,pending):pass
 count=len(list(output.glob('*.jpg')));print('Full-resolution JPEGs:',count,flush=True)
 if not a.watch_until or count>=a.watch_until:break
 time.sleep(20)
