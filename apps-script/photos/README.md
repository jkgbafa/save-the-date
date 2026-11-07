# Wedding guest album

Live page: https://joshualucia.com/photos/
Programme: https://joshualucia.com/programme/Joshua-and-Lucia.pdf
Storage owner: quicknlabs@gmail.com
Originals folder: https://drive.google.com/drive/folders/1X6CnLz2pk8yMtgIgdv0zQjhTvN-N2hDH
Apps Script editor: https://script.google.com/home/projects/10lv8pjUn8UNXJQmJJ7lA5HBZ0J0plWFEGZtFtJTJxE6fbipxhM2BVjgp/edit

## Updating

`photos/index.html` is the live GitHub Pages frontend. `Gallery.html` is its source copy.
`Code.gs` is the backend; `Deploy.gs` is a copy for pasting into Apps Script.
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
