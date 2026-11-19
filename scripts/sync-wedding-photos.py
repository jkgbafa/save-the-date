"""Discover current public Drive contents and incrementally convert new originals.
Never changes files or permissions in Drive. Existing JPEGs are reused.
"""
import argparse, json, subprocess, sys, tempfile
from pathlib import Path
import gdown
p=argparse.ArgumentParser();p.add_argument('--originals');p.add_argument('--workers',default='6');p.add_argument('--upright');a=p.parse_args()
root=Path(__file__).resolve().parent.parent
files=gdown.download_folder(id='1VobC_5cBIyI0ximL4USmCWjIlrF3VaAp',skip_download=True,quiet=True)
if not files:raise RuntimeError('Drive returned no photos; preserving the published album')
entries=[{'id':f.id,'title':f.path} for f in files if Path(f.path).suffix.lower() in ('.cr3','.cr2','.nef','.arw','.dng','.jpg','.jpeg','.png')]
with tempfile.TemporaryDirectory() as temp:
 manifest=Path(temp)/'drive.json';manifest.write_text(json.dumps(entries))
 cmd=[sys.executable,str(root/'scripts/process-wedding-photos.py'),str(manifest),'--originals',a.originals or str(Path(temp)/'originals'),'--output',str(root/'photos/wedding'),'--workers',a.workers]
 if not a.originals:cmd+=['--temporary-downloads']
 if a.upright:cmd+=['--upright',a.upright]
 subprocess.run(cmd,check=True)
 subprocess.run([sys.executable,str(root/'scripts/curate-wedding-photos.py')],check=True)
 report=json.loads((root/'photos/wedding/processing-report.json').read_text());failed=[x for x in report if not x['ok']]
 if failed:raise RuntimeError(str(len(failed))+' photos failed conversion. Review processing-report.json before publishing.')
