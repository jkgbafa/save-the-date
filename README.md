# Joshua & Lucia — Wedding Website 💍

Saturday, November 7, 2026 · 11:00 AM · Anagkazo Campus, Mampong-Akuapem, Ghana

A free, self-hosted version of what The Knot / Zola charge for:

| The Knot feature | This site |
|---|---|
| Wedding website + RSVP form | GitHub Pages (free) |
| Guest list that syncs with RSVPs | Google Sheet, updated instantly |
| RSVP dashboard (counts, meals, etc.) | **Dashboard tab** in the Sheet + web **Admin panel** |
| Guest messages / guestbook | Homepage wall + **Messages** tab |
| RSVP confirmation emails | Automatic, free via Gmail |
| Livestream page | Built in — flips to LIVE with one button |

**Automated wedding-reminder SMS is not used.** Twilio was dropped; there is no public “sign up for reminders” form. Guests **RSVP** instead (in person, or **Online / livestream** if they cannot come to Ghana). Optional live-notify on the RSVP is only a preference stored in the Sheet — it does not promise SMS blasts.

**Total cost: $0** for hosting, RSVPs, guestbook, and confirmation emails. WhatsApp tap-to-send from Admin is also free. See [Costs](#costs--the-honest-part) if you ever enable SMS later.

---

## How it fits together

```
Guest visits site (GitHub Pages, free)
        │  submits RSVP or guestbook message
        ▼
Google Apps Script web app (free)
        │  saves to Google Sheet ──► Dashboard tab (live stats)
        │  emails confirmation to guest (free; RSVPs)
        ▼
You open the Admin panel (secret link)
        │  see stats + guest list
        │  send notes: Email (free) / WhatsApp links (free)
        └  on the big day: paste stream link → GO LIVE
```

`js/config.js` has `APPS_SCRIPT_URL = ""` until you deploy the Apps Script Web App and paste the real URL. Forms will not save until then — do not invent a fake URL.

---

## Setup — about 15 minutes

### Step 1 — Create the backend (Google Sheet + web app)

1. Go to **[script.new](https://script.new)** (creates a new Google Apps Script project — use the Google account you want to own the guest list; preferred owner is **joshuagbafa108@gmail.com**).
2. Name the project (top left) e.g. `Wedding RSVP Backend`.
3. Delete the placeholder code, and paste the entire contents of **`apps-script/Code.gs`** from this repo.
4. Near the top of the file, `COUPLE_EMAIL` defaults to **joshuagbafa108@gmail.com**. Set `COUPLE_PHONE` if you need to. Twilio credentials are **not** in this file.
5. Click **+ → HTML** in the Files sidebar, name it exactly **`Admin`**, and paste the contents of **`apps-script/Admin.html`**.
6. In the toolbar, pick the function **`setup`** and press **Run**. Google will ask you to authorize — approve it (it needs Sheets + Gmail on *your own account*). `setup` creates an **RSVPs** tab (guest list), a **Messages** tab (guestbook), plus Settings, Dashboard, Message Log, and a **Reminders** tab used only for optional live-notify preferences from RSVPs (legacy / unused public signup is disabled).
7. Open **Executions** (left sidebar) → click the run → the log shows:
   - ✅ your **Google Sheet URL** (guest lists + dashboard — bookmark it)
   - ✅ your **admin key** (keep it secret)

The Sheet title is **Joshua & Lucia Wedding — RSVPs**.

### Step 2 — Deploy the web app

1. **Deploy → New deployment → ⚙️ Web app**
2. *Execute as:* **Me** · *Who has access:* **Anyone**
3. Click **Deploy**, copy the **Web app URL** (`https://script.google.com/macros/s/…/exec`).

Your admin dashboard now lives at:

```
<web app URL>?action=admin&key=<your admin key>
```

Bookmark it on your phone — that's mission control.

### Step 3 — Connect the website

Open **`js/config.js`** and paste the web app URL:

```js
var APPS_SCRIPT_URL = "https://script.google.com/macros/s/…/exec";
```

Leave it empty until that URL exists. Empty means “not connected yet,” not a silent fake save.

### Step 4 — Put it on GitHub Pages

```bash
git add -A && git commit -m "Wedding site"
git push origin main
```

Then on GitHub: **Settings → Pages → Source: Deploy from branch → main / (root)**.
Your site goes live at `https://<username>.github.io/<repo>/` in ~1 minute.

Finally, open your Google Sheet → **Settings** tab → paste that URL into **WEBSITE_URL**.

### Step 5 — Test it right now ✅

1. Open the site (GitHub Pages URL, or locally: `python3 -m http.server` then http://localhost:8000).
2. Submit an **RSVP** at `rsvp.html` with your own email and/or phone. Choose **In person** or **Online (livestream)**. Live-notify is optional.
3. Watch it appear in the **RSVPs** tab. Guestbook notes go on **Messages**.
4. Check your inbox — RSVPs get a confirmation email.
5. Open the **Admin panel** → RSVPs are listed. Write a message and hit **"Send test to me first."**
6. Test go-live: paste any YouTube link → **GO LIVE**. Then hit **End live**.

There is **no** homepage reminder-signup form. A leftover `formType=reminder` POST returns a disabled error and is not written as a new signup.

---

## Guest lists (Google Sheet)

`setup()` creates:

| Tab | Who | Typical columns |
|---|---|---|
| **RSVPs** | People who filled the RSVP | Timestamp, Name, Email, Phone, Country, Attending (In person / Online / Not attending), Guests, Preferred contact, Notify When Live, Message, Status |
| **Messages** | Guestbook notes | Timestamp, Name, Email, Message |
| **Reminders** | Optional live-notify rows copied from RSVP (`notifyLive=Yes`) | Timestamp, Name, Email, Phone, Contact method, Notify When Live, Source |

Website `doPost` `formType`s:

- **`rsvp`** — write **RSVPs**. If `notifyLive=Yes`, also **upsert Reminders** (Source = RSVP).
- **`message`** — write **Messages**.
- **`reminder`** — **disabled**. Returns `{ ok: false, disabled: true }` so old clients cannot create reminder-only signups.

**GO LIVE** still flips the site. Manual Admin blasts (email / WhatsApp) can still reach RSVPs. Automated countdown SMS is not a guest-facing product.

---

## Costs — the honest part

| Channel | Cost | Notes |
|---|---|---|
| **Email** | **Free** | Gmail allows ~100 recipients/day on a free account. Confirmation emails for RSVPs use this. |
| **WhatsApp links** | **Free** | Admin can generate tap-to-send links. Recommended if you need to reach Ghana numbers. |
| **SMS (Twilio)** | Not used for this wedding | Guest-facing automated reminders were dropped. Do not put Twilio secrets in the repo. |

Everything else — hosting, spreadsheet, dashboard, confirmation emails, livestream page — is $0.

---

## Files

```
index.html              save-the-date (countdown, livestream, guestbook, gifts) — no reminders form
rsvp.html               RSVP: in person / online / not attending
css/style.css           design
js/config.js            ← the one file you edit (backend URL) — leave empty until Apps Script is deployed
js/main.js              countdown, live-status polling, guestbook posts
js/rsvp.js              invitation-code (optional) + RSVP form
privacy.html / terms.html
apps-script/Code.gs     backend: RSVPs + Messages tabs, dashboard, messaging
apps-script/Admin.html  admin dashboard UI
```

## Day-of checklist (Nov 7, 2026)

- [ ] Start the YouTube/Facebook live stream (start it *unlisted/private* first to grab the link early)
- [ ] Open the admin panel on a phone
- [ ] Paste link → **🔴 GO LIVE**
- [ ] Enjoy your wedding — the website does the rest 💛
