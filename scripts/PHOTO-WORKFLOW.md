# Wedding photo publishing

The shareable page is https://joshualucia.com/photos/ and the full gallery is
https://joshualucia.com/photos/gallery/. Guest uploads remain at /photos/shared/.
Existing /photos/?photo= guest-photo links redirect to the shared album.

The public source folder is https://drive.google.com/drive/folders/1VobC_5cBIyI0ximL4USmCWjIlrF3VaAp.
The hourly GitHub Actions workflow discovers new files using the public folder
listing, converts new RAW files, commits JPEGs and deploys GitHub Pages. It never
changes Drive files or sharing. Existing conversions are reused. A failed sync
stops deployment and leaves the last successful live site intact. Scheduled
workflows can be delayed by GitHub and may be disabled after 60 days without
repository activity. Use Actions → Wedding photos and website → Run workflow for
an immediate refresh.

These are sRGB JPEG exports (up to 2400 px) with camera white balance, LibRaw
automatic exposure/highlight blending and restrained saturation. Lightroom was
not available, so these are not Lightroom edits. Thumbnails are 600 px. RAW files
stay unchanged. Apple's Vision face angles help correct camera orientation;
manual overrides are available for shots without a detectable face.

`photos/curation.json` controls featured photos, exclusions, manual rotation and
category overrides. Names are the original RAW filenames. `exclude` accepts a
filename or Drive ID and hides it from both gallery and preview; it does not
delete the original. Collection rules use camera prefixes and frame ranges checked against contact
sheets, because camera clocks differ. The `groups` array records those ranges;
explicit `category` overrides take priority. Review borderline photos visually
and add rules if a new camera sequence arrives.

Example: add `"IMGC0123.CR3"` to `exclude`; or set
`"category": {"IMGC0123.CR3": "portraits"}`. The other category values are
`ceremony` and `reception`. Rotation values are degrees counterclockwise.
Run `python scripts/curate-wedding-photos.py` after a curation edit, then commit
and push. No public delete controls are exposed to guests.

Local sync on macOS:

```
python -m pip install -r scripts/photo-requirements.txt
swiftc scripts/upright.swift -o /tmp/wedding-upright
python scripts/sync-wedding-photos.py --originals /path/to/Originals --upright /tmp/wedding-upright
```

Without `--originals`, RAW downloads are temporary (as in CI). On the initial
local run, all original files were retained separately from Git. Raw originals
and personal Google credentials are never committed to this repository.

## Full-resolution local JPEG archive

`export-original-jpegs.py` makes full sensor resolution sRGB JPEGs at quality 94,
using the same adjustments and orientation corrections. These are local archive
copies; the website serves smaller 2400 px copies for fast viewing.

```
python scripts/export-original-jpegs.py --originals /path/to/Originals --output /path/to/Full-resolution-JPEGs
```
