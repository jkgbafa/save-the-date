"""Incremental, non-destructive RAW -> sRGB JPEG processing. Originals stay local.
Requires rawpy, Pillow, numpy, requests. Input: Drive metadata JSON (id,title,size).
"""
import argparse, concurrent.futures, json, os, time, shutil
from pathlib import Path
import subprocess, io, exifread
import requests, rawpy, numpy as np
from PIL import Image, ImageOps, ImageEnhance, ImageCms
p=argparse.ArgumentParser();p.add_argument('manifest');p.add_argument('--originals',required=True);p.add_argument('--output',required=True);p.add_argument('--workers',type=int,default=3);p.add_argument('--upright');p.add_argument('--temporary-downloads',action='store_true',help='Remove temporary downloaded RAW copies after conversion (CI only)');a=p.parse_args()
originals=Path(a.originals);output=Path(a.output);originals.mkdir(parents=True,exist_ok=True);output.mkdir(parents=True,exist_ok=True)
files=json.load(open(a.manifest));previous={x['id']:x for x in json.loads((output/'manifest.json').read_text()).get('photos',[])} if (output/'manifest.json').exists() else {};profile=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
def process(f):
    name=Path(f['title']).name; key=f['id'];src=originals/(key+'_'+name);dest=output/(key+'.jpg');thumb=output/(key+'-thumb.jpg')
    if dest.exists() and thumb.exists() and previous.get(key,{}).get('version')==2:return previous[key]
    try:
        expected=int(f.get('size') or 0)
        if not src.exists() or (expected and src.stat().st_size!=expected):
            if shutil.disk_usage(originals).free<4*1024**3:raise RuntimeError('Less than 4 GB free; download paused to protect disk space')
            for attempt in range(4):
                try:
                    r=requests.get('https://drive.google.com/uc',params={'export':'download','id':key},stream=True,timeout=(15,60));r.raise_for_status()
                    if 'text/html' in r.headers.get('content-type',''):raise RuntimeError('Drive returned a download permission/quota page')
                    temp=src.with_suffix(src.suffix+'.part')
                    with temp.open('wb') as out:
                        for chunk in r.iter_content(1024*1024):out.write(chunk)
                    if expected and temp.stat().st_size!=expected:raise RuntimeError('Incomplete download')
                    temp.replace(src);break
                except Exception:
                    if attempt==3:raise
                    time.sleep(2**attempt)
        if src.suffix.lower() in ('.cr3','.cr2','.arw','.nef','.dng'):
            with rawpy.imread(str(src)) as raw:
                # Camera white balance preserves the scene; LibRaw automatic exposure,
                # restrained brightness and highlight blending protect dresses/skin.
                rgb=raw.postprocess(use_camera_wb=True,no_auto_bright=False,auto_bright_thr=0.01,bright=1.0,highlight_mode=rawpy.HighlightMode.Blend,output_color=rawpy.ColorSpace.sRGB,output_bps=8,half_size=True)
            im=Image.fromarray(rgb)
        else:
            im=ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        capture=f.get('modified_time','')
        try:
            head=src.open('rb').read(200000);start=head.find(b'II*\0')
            if start>=0:
                tags=exifread.process_file(io.BytesIO(head[start:]),details=False)
                capture=str(tags.get('EXIF DateTimeOriginal') or tags.get('Image DateTime') or capture)
        except Exception:pass
        rotation=0
        if a.upright:
            probe=im.copy();probe.thumbnail((600,600));probe.save(thumb,'JPEG',quality=80)
            try:rotation=int(subprocess.check_output([a.upright,str(thumb)],timeout=15).decode().strip())
            except Exception:pass
            if rotation:im=im.rotate(rotation,expand=True)
        im=ImageEnhance.Color(im).enhance(1.025)
        im.thumbnail((2400,2400));im.save(dest,'JPEG',quality=88,optimize=True,icc_profile=profile)
        small=im.copy();small.thumbnail((600,600));small.save(thumb,'JPEG',quality=78,optimize=True,icc_profile=profile)
        gray=np.asarray(im.resize((128,128)).convert('L'));sharp=float(np.abs(np.diff(gray.astype(float),axis=0)).mean());brightness=float(gray.mean())
        result={'id':key,'file':dest.name,'thumbnail':thumb.name,'original':name,'version':2,'capture':capture,'rotation':rotation,'width':im.width,'height':im.height,'sharpness':round(sharp,2),'brightness':round(brightness,2),'ok':True}
        if a.temporary_downloads:src.unlink()
        return result
    except Exception as e:return {'id':key,'original':name,'ok':False,'error':str(e)}
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as pool:
    for future in concurrent.futures.as_completed([pool.submit(process,f) for f in files]):
        result=future.result()
        results.append(result)
        (output/'processing-report.json').write_text(json.dumps(results,indent=2))
        good=[x for x in results if x['ok']]
        # Atomic manifest: readers never see a half-written gallery.
        temp=output/'manifest.tmp';temp.write_text(json.dumps({'updated':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'photos':good},indent=2));temp.replace(output/'manifest.json')
        print(len(results),'/',len(files),result['original'],'OK' if result['ok'] else result['error'],flush=True)
print('Finished:',sum(r['ok'] for r in results),'converted;',sum(not r['ok'] for r in results),'failed',flush=True)
