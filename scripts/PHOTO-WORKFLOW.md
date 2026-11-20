# Wedding photo publishing

The shareable page is https://joshualucia.com/photos/ and the full gallery is
https://joshualucia.com/photos/gallery/. Guest uploads remain at /photos/shared/.
Existing /photos/?photo= guest-photo links redirect to the shared album.
The compact photo landing page puts the carousel first and the livestream below.
Carousel selections are shuffled on each visit; the duplicate strip keeps the loop
continuous. The carousel starts automatically without a play/pause button; keyboard
focus and dragging temporarily hold it. The full gallery initially shows 120 photos
and adds 120 per click.
`curation.json`'s `earlyFeatured` filenames are shuffled among other highlights near
the beginning of the carousel. Only photos still selected for the carousel qualify.
The album has separate Portraits (52 reviewed photos of Joshua and Lucia), Ceremony,
Groups, and Reception tabs. `couplePortraits` in curation explicitly identifies the
couple-only photos; other former portraits belong to Groups.
Green-tagged folders in `~/Downloads/Thank Yous` supply the nine People & groups
filters and photo tags through `photos/folder-collections.json`. Nested files inherit
their green parent folder's label. Mummy Dede is publicly labelled Mother of the bride.
The local two-minute label watcher refreshes this mapping without importing new pixels.
The gallery defaults to Most loved using shared backend heart counts; Wedding order
retains chronological browsing. Heart counts update immediately and refresh each minute.
Ranking changes wait until a photo viewer is closed, so typing and swiping stay stable.
Top navigation links the original programme PDF and `/gifts/`. The gifts page
transcribes the programme's page 10, including Zelle's phone number and Stanbic Bank
account; each number has a clipboard copy button.

The public source folder is https://drive.google.com/drive/folders/1VobC_5cBIyI0ximL4USmCWjIlrF3VaAp.
The hourly GitHub Actions workflow discovers new files using the public folder
listing, converts new RAW files, commits JPEGs and deploys GitHub Pages. It never
changes Drive files or sharing. Existing conversions are reused. A failed sync
stops deployment and leaves the last successful live site intact. Scheduled
workflows can be delayed by GitHub and may be disabled after 60 days without
repository activity. Use Actions → Wedding photos and website → Run workflow for
an immediate refresh.

The initial 1,039 photos were imported into Adobe Lightroom Classic on 20 November
2026, individually processed with Auto Settings, Adobe Color, lens corrections and
chromatic aberration removal, and exported as full-resolution quality-90 sRGB JPEGs
with standard screen sharpening. The 63 indoor signing photos received individual
Auto White Balance corrections after review. The site uses 2400 px copies and 600 px thumbnails.
Each manifest entry records its editor and export checksum; image URLs include that
checksum so visitors receive the updated edit. RAW files stay unchanged. Existing
reviewed orientation corrections were carried into Lightroom using XMP sidecars.

Seven user-supplied PNG replacements were matched to EA2A0138, EA2A0134, EA2A0141,
EA2A0150, EA2A0158, EA2A0164 and EA2A0169. Their web JPEGs and thumbnails retain the
existing photo IDs and links. `sourceEditSHA256` and `sourceEditFile` record the
provided version and take precedence in image cache keys. The editor is recorded
as `User-supplied edit`. Existing version-2 files are preserved by Drive sync.
A later explicit Lightroom reimport clears these replacement fields.
Full-resolution replacement JPEGs are in the local `Replacement JPEGs` folder;
the corresponding seven files in both Downloads selections were refreshed.
`~/Downloads/Joshua & Lucia - Edited Green Photos` contains all 536 green selections,
with replacements taking precedence over the original Lightroom exports.
EA2A0045's existing Lightroom edit replaces EA2A0044 in the green selection and
Downloads folder. Finder tags were updated accordingly; the green count stays 536.

New Drive arrivals use LibRaw camera white balance and automatic exposure until
they are imported, reviewed and exported through Lightroom locally. The hourly
sync preserves existing Lightroom edits. It cannot run desktop Lightroom in CI.

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

## Lightroom Classic and Finder selections

The local Lightroom RAWs folder contains links to the same unchanged camera files,
using their original camera filenames. Existing reviewed orientation corrections
are carried into XMP sidecars. Import with **Add**, apply Auto settings to the
selected photos in Library Grid view, then export original-filename sRGB JPEGs.
`import-lightroom-exports.py /path/to/exports --orientation-in-lightroom` replaces
the web JPEGs and thumbnails while preserving IDs, links, categories and exclusions.
It refuses an incomplete export batch. Never apply one photo's exposure values to
all photos: Lightroom Auto should analyze each image separately.

Apply Finder tags to the original-name JPEGs in the sibling `Full-resolution JPEGs`
folder. **Green** selects photos for the gallery; **Blue** selects the front-page
carousel and also includes the photo in the gallery. The site uses the corresponding
Lightroom-edited JPEGs, rather than those older selection copies. Removing both
selection tags hides a photo. `photos/finder-selection.json` records the selected
original filenames and is reapplied during every Drive sync, so new arrivals stay
hidden until selected locally. The current blue edited full-resolution exports
were also copied to `~/Downloads/Joshua & Lucia - Carousel Photos`.

`sync-red-labels.py /path/to/Lightroom-RAWs` reads these selections, Lightroom's red
XMP color labels, and macOS red Finder tags on RAWs or selection JPEGs. It writes
`photos/red-labels.json`, which curation combines with the manual `exclude` list.
Red always hides a photo from the album and carousel, even when green or blue,
while retaining RAWs and JPEGs. Removing red restores a selected photo unless
manually excluded too. Lightroom must write XMP (Catalog Settings → Metadata → Automatically
write changes into XMP, or select photos and save metadata).

`--publish` updates a clean checkout and commits only generated gallery selections.
It skips publication while other work is pending. The local label watcher, when
installed, runs every two minutes while this Mac is awake; GitHub Pages deployment
then usually takes a few minutes. It does not permanently delete photos.
