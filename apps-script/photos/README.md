# Wedding guest album

Wedding memories: https://joshualucia.com/photos/
Guest uploads and shared album: https://joshualucia.com/photos/shared/
Programme: https://joshualucia.com/programme/Joshua-and-Lucia.pdf
Storage owner: quicknlabs@gmail.com
Originals folder: https://drive.google.com/drive/folders/1X6CnLz2pk8yMtgIgdv0zQjhTvN-N2hDH
Apps Script editor: https://script.google.com/home/projects/10lv8pjUn8UNXJQmJJ7lA5HBZ0J0plWFEGZtFtJTJxE6fbipxhM2BVjgp/edit

## Updating

`photos/shared/index.html` is the guest-upload frontend. `photos/index.html` is the memories landing page; the photographer gallery lives at `photos/gallery/`. See `scripts/PHOTO-WORKFLOW.md` for Drive imports and photo curation. `Gallery.html` is its source copy.
`Code.gs` handles routing and uploads; `Interactions.gs` handles photo comments and
hearts. Both files are deployed in the existing project. `Deploy.gs` concatenates
both for a one-file installation; do not add that copy alongside the separate files.
Deploy new backend versions through Manage deployments > Edit > New version, keeping the existing deployment URL. Execute as QuicknLabs, access Anyone. No OAuth token is sent to visitors. `setupGallery` is run once in the script editor, never exposed through the public API.

## Behaviour

- Guests upload photos and videos, including iPhone DNG/ProRAW (200 MB per file; 20 selected at a time). DNG filenames and MIME aliases are normalized to image/x-adobe-dng on both client and server.
- Browser sends 2 MB chunks, retries transient failures, and reports success only after Drive confirms the file and sharing permission.
- Optional name defaults to Anonymous; name and caption are stored in each file's description.
- Guests explicitly agree that uploaded media may be viewed/downloaded by anyone with the gallery link.
- Only uploaded media receive unlisted public read permission. The folder is private; the API cannot list other Drive folders or invoke arbitrary functions.
- 1,500 upload starts / 60 GB per UTC day are capped to protect the account from accidental or abusive usage. Google service quotas and available Drive storage also apply.
- 60 items per gallery page; newest first. Refreshes every 30 seconds while visible, without resetting an expanded gallery. Video playback uses Drive's player; Google may need processing time before a new video can play.
- Originals are kept uncompressed. Photo previews use Drive thumbnails. HEIC and DNG previews depend on Google's thumbnail support; the original files remain intact in Drive.
- To remove media from the gallery, move the file to Trash in this dedicated folder. First-page gallery cache expires in 15 seconds; the next refresh/reload removes it.
- To close uploads, disable the deployment or edit beginUpload to reject new files. Do not delete the originals folder.

## Verification performed

- Existing site checks and backend unit checks passed.
- Real browser photo upload with name and caption saved and appeared in the gallery.
- Downloaded original SHA-1 matched the uploaded source exactly.
- Anonymous 2.7 MB MP4 uploaded in two chunks and appeared with a Drive video player and thumbnail.
- Temporary video test was moved to Trash after verification.

### iPhone DNG / ProRAW
The browser accepts DNG extensions even when iOS supplies an empty, TIFF, or generic MIME type. Originals are uploaded without conversion. When a DNG contains an embedded JPEG, `photos/dng-preview.js` reads it in bounded slices and produces a gallery preview. A separate JPEG preview is saved in the same Drive folder, shared only when the original finishes, and excluded from the gallery as a duplicate. DNGs without a browser-readable embedded JPEG still upload, but depend on Drive for a thumbnail.

Run `node photos/test-dng-preview.cjs` and `node apps-script/photos/test-backend.cjs` from the repository root to check parsing and upload/gallery contracts.

## Comments and hearts

Version 6 was published on 20 November 2026 at the existing public web-app URL.
The official photographer gallery uses `listPhotoComments`, `addPhotoComment`,
`listPhotoHearts`, and `setPhotoHeart`. Comments have an optional name (Anonymous
when blank), a 1,000-character limit, timestamps and retry IDs. The sidebar follows
the selected photo. Text is rendered with `textContent`, never HTML. Heart state is
one toggle per browser UUID, stored as a SHA-256 hash server-side; public responses
contain counts and that visitor's own liked IDs, never other visitor identifiers.

Data live in private JSON files within `Photo comments and hearts`, under the
existing private guest-upload folder. `INTERACTIONS_FOLDER_ID` records that folder.
Nothing in this feature shares the JSON files or changes Drive permissions.
Comments are isolated per photo; hearts share a locked JSON record so the counts
agree across visitors. Mutations use a script lock, idempotent comment IDs / explicit
heart state, per-visitor and daily rate limits, and a visible-photo allowlist from
the published manifest. Comments are limited to 200 per photo. Private records can
be managed by the storage owner through Drive.

Run `node apps-script/photos/test-interactions.cjs` for persistence, anonymity,
validation, duplicate retries, limits, shared hearts, undo and voter privacy checks.
Browser comment-submit tests use isolated intercepted responses and do not publish
test messages. A real backend heart was added, persisted across reload and removed.
