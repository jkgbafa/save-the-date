# Joshua & Lucia — Wedding Website 💍

Saturday, November 7, 2026 · 9:30 AM · Anagkazo Campus, Mampong-Akuapem, Ghana

A free, self-hosted version of what The Knot / Zola charge for:

| The Knot feature | This site |
|---|---|
| Wedding website + RSVP form | GitHub Pages (free) |
| Guest list that syncs with RSVPs | Google Sheet, updated instantly |
| RSVP dashboard (counts, meals, etc.) | **Dashboard tab** in the Sheet + web **Admin panel** |
| "Guest Messages" reminder tool | Admin panel → send email / SMS / WhatsApp blasts |
| RSVP confirmation emails | Automatic, free via Gmail |
| Livestream page | Built in — flips to LIVE with one button, and messages everyone who opted in |
| Automatic countdown reminders | 30 / 14 / 7 / 1 days before (editable templates) |

**Total cost: $0** — except optional SMS (see [Costs](#costs--the-honest-part) below).

---

## How it fits together

```
Guest visits site (GitHub Pages, free)
        │  submits RSVP, reminder signup, or guestbook message
        ▼
Google Apps Script web app (free)
        │  saves to Google Sheet ──► Dashboard tab (live stats)
        │  emails confirmation to guest (free; RSVPs)
        ▼
You open the Admin panel (secret link)
        │  see stats + guest list
        │  send blasts: Email (free) / SMS (Twilio) / WhatsApp links (free)
        └  on the big day: paste stream link → GO LIVE → everyone gets pinged
```

---

## Setup — about 15 minutes

### Step 1 — Create the backend (Google Sheet + web app)

1. Go to **[script.new](https://script.new)** (creates a new Google Apps Script project — use the Google account you want to own the guest list).
2. Name the project (top left) e.g. `Wedding RSVP Backend`.
3. Delete the placeholder code, and paste the entire contents of **`apps-script/Code.gs`** from this repo.
4. Near the top of the file, `COUPLE_EMAIL` defaults to **joshuagbafa108@gmail.com**. Set `COUPLE_PHONE` if you need to. Twilio credentials are **not** in this file — they belong only in the Sheet **Settings** tab after `setup`.
5. Click **+ → HTML** in the Files sidebar, name it exactly **`Admin`**, and paste the contents of **`apps-script/Admin.html`**.
6. In the toolbar, pick the function **`setup`** and press **Run**. Google will ask you to authorize — approve it (it needs Sheets + Gmail on *your own account*). `setup` creates **two guest-list tabs**: **Reminders** and **RSVPs**, plus Settings, Reminder Templates, Message Log, Dashboard, and a small **Messages** tab for the guestbook.
7. Open **Executions** (left sidebar) → click the run → the log shows:
   - ✅ your **Google Sheet URL** (guest lists + dashboard — bookmark it)
   - ✅ your **admin key** (keep it secret)

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

### Step 4 — Put it on GitHub Pages

```bash
git add -A && git commit -m "Wedding site"
git push origin main
```

Then on GitHub: **Settings → Pages → Source: Deploy from branch → main / (root)**.
Your site goes live at `https://<username>.github.io/<repo>/` in ~1 minute.

Finally, open your Google Sheet → **Settings** tab → paste that URL into **WEBSITE_URL** (it's used in reminder messages).

### Step 5 — Test it right now ✅

1. Open the site (GitHub Pages URL, or locally: `python3 -m http.server` then http://localhost:8000).
2. Submit an **RSVP** at `rsvp.html` with your own email and/or phone. Tick live-notify if you want the go-live ping.
3. Watch it appear in the **RSVPs** tab. If you opted into live notify, a matching row appears on **Reminders** too. The **Dashboard** tab counts both lists.
4. Submit a **reminder-only** signup from the homepage — that writes **Reminders** only, not RSVPs.
5. Check your inbox — RSVPs get a confirmation email.
6. Open the **Admin panel** → RSVPs and reminder signups are listed separately. Write a message and hit **"Send test to me first."**
7. Test go-live: paste any YouTube link → **GO LIVE** → the site flips LIVE and **Reminders** (not RSVPs) who asked to be pinged get messaged. Then hit **End live**.

---

## Two guest lists (Google Sheet)

`setup()` creates two lists so reminder people are never mixed into RSVPs as the only roster:

| Tab | Who | Typical columns |
|---|---|---|
| **Reminders** | Everyone who signed up for email/SMS reminders or “ping me when we go live” | Timestamp, Name, Email, Phone, Country, Contact method (Email/SMS/WhatsApp/Both), Notify When Live, Source (`reminder form` / `RSVP` / `live opt-in`) |
| **RSVPs** | People who filled the RSVP | Timestamp, Name, Email, Phone, Country, Attending (In person / Online / Not attending), Guests, Preferred contact, Notify When Live, Message, Status |

Guestbook notes go on a small **Messages** tab so they don’t inflate reminder or RSVP counts. Settings, Reminder Templates, Message Log, and Dashboard stay. Dashboard formulas count **both** tabs (reminder signups vs RSVPs, in-person vs online vs not attending, live opt-ins).

Website `doPost` `formType`s:

- **`reminder`** — write **Reminders**. Notify When Live = Yes.
- **`message`** — write **Messages**.
- **`rsvp`** — write **RSVPs**. If `notifyLive=Yes`, also **upsert Reminders** (Source = RSVP) so the live-ping list is complete.

**GO LIVE** / audience `notifylive` reads the **Reminders** tab (not RSVPs). Twilio stays in the Sheet **Settings** tab only (`TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`). Never commit those secrets.

### Manual blasts (Admin panel)
Pick the audience (RSVPs / attending / in-person / online / reminder signups / live opt-ins from Reminders / Ghana / USA), the channel, write your message, test it on yourself, send. Merge tags personalize each message: `{{name}}`, `{{date}}`, `{{time}}`, `{{venue}}`, `{{website}}`, `{{livestream}}`.

### Automatic reminders
A daily trigger (installed by `setup`) checks the calendar each morning and sends the templates in the **Reminder Templates** sheet tab at **30, 14, 7, and 1 days** before the wedding — to attending RSVPs **and** everyone on the Reminders tab (deduped). Edit the text, add rows, or set Enabled to NO — it's all in the sheet.

### Go-live alert
The **GO LIVE** button saves the stream link, flips the website to LIVE (red banner + watch button appear within ~90 seconds for anyone on the page), and messages everyone on **Reminders** with Notify When Live = Yes.

---

## Costs — the honest part

| Channel | Cost | Notes |
|---|---|---|
| **Email** | **Free** | Gmail allows ~100 recipients/day on a free account (1,500/day on Google Workspace). The admin panel shows your remaining daily quota. For a 300-guest blast on a free account, send in batches over 3 days or split by audience. |
| **WhatsApp links** | **Free** | The admin panel generates one tap-to-send link per guest with your message pre-filled. ~5 seconds per guest of your time. **This is the recommended channel for Ghana** — nearly everyone is on WhatsApp and it costs nothing. |
| **SMS (Twilio)** | $0.0079/msg US, **$0.1468/msg Ghana** (all Ghana carriers, as of mid-2026) | There is genuinely **no free way to send real SMS to Ghana + US programmatically** — every provider charges. Twilio gives **~$15 free trial credit** (≈ 1,900 US texts or ≈ 100 Ghana texts). Trial accounts can only text numbers you've verified, so real guest blasts require upgrading (adding a card) — your remaining free credit still gets used first. To enable: create a [twilio.com](https://twilio.com) account, get a number, and paste `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` into the **Settings** tab of your Sheet. Given Ghana's SMS price, use **WhatsApp for Ghana + SMS for US** — or skip Twilio entirely; SMS-preferring guests automatically get email instead, so nobody is missed. |

Everything else — hosting, database, dashboard, confirmation emails, automatic reminders, livestream page — is $0 forever.

---

## Files

```
index.html              the website (countdown, livestream, reminders, guestbook)
rsvp.html               RSVP + live-opt-in (cream/gold, matching the save-the-date)
css/style.css           design
js/config.js            ← the one file you edit (backend URL) — leave empty until Joshua deploys Apps Script
js/main.js              countdown, live-status polling, reminder + guestbook posts
js/rsvp.js              invitation-code (optional) + RSVP form + live-notify confirm
photos/                 your photos
apps-script/Code.gs     backend: Reminders + RSVPs tabs, dashboard, messaging
apps-script/Admin.html  admin dashboard UI
```

## Day-of checklist (Nov 7, 2026)

- [ ] Start the YouTube/Facebook live stream (start it *unlisted/private* first to grab the link early)
- [ ] Open the admin panel on a phone
- [ ] Paste link → **🔴 GO LIVE + notify opt-ins**
- [ ] Enjoy your wedding — the website does the rest 💛
