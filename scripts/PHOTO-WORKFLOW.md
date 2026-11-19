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
delete the original. Categories are initially grouped by camera capture time,
with overrides for exceptions: ceremony before 15:30, reception 15:45–16:40,
and portraits at other times. Camera clocks, rather than wall-clock wedding
times, determine these boundaries. Review borderline photos visually.

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
