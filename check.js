// Self-check: every element ID the JS touches must exist in the matching HTML.
// Also asserts backend contracts (two Sheet tabs, no secrets).
// Run with: node check.js
"use strict";
const fs = require("fs");

function assertIds(htmlPath, jsPath, label) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const js = fs.readFileSync(jsPath, "utf8");
  const ids = new Set();
  for (const m of js.matchAll(/\$\("([^"]+)"\)|getElementById\("([^"]+)"\)/g)) {
    ids.add(m[1] || m[2]);
  }
  const missing = [...ids].filter((id) => !html.includes('id="' + id + '"'));
  console.assert(ids.size > 5, label + ": expected to find IDs, found " + ids.size);
  console.assert(missing.length === 0, label + ": IDs missing from HTML: " + missing.join(", "));
  if (missing.length) process.exitCode = 1;
  else console.log("OK — all " + ids.size + " IDs used by " + jsPath + " exist in " + htmlPath);
}

assertIds("index.html", "js/main.js", "main");
assertIds("rsvp.html", "js/rsvp.js", "rsvp");

const code = fs.readFileSync("apps-script/Code.gs", "utf8");
const config = fs.readFileSync("js/config.js", "utf8");
const rsvpHtml = fs.readFileSync("rsvp.html", "utf8");
const rsvpJs = fs.readFileSync("js/rsvp.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");

function must(hay, needle, msg) {
  console.assert(hay.indexOf(needle) !== -1, msg);
  if (hay.indexOf(needle) === -1) process.exitCode = 1;
}
function mustNot(hay, re, msg) {
  console.assert(!re.test(hay), msg);
  if (re.test(hay)) process.exitCode = 1;
}

must(code, "SHEETS.REMINDERS", "Code.gs must define Reminders tab");
must(code, "SHEETS.RSVP", "Code.gs must define RSVPs tab");
must(code, "setupRemindersSheet_", "setup() must create Reminders");
must(code, "joshuagbafa108@gmail.com", "COUPLE_EMAIL default");
must(code, "WEDDING_TIME: '11:00 AM'", "ceremony time is 11:00 AM");
must(code, "arrive by 10:30", "in-person arrive-by is 10:30");
must(code, "{{joinhow}}", "personalize in person / online when known");
must(code, "{{cannotwait}}", "personalize cannot-wait line when known");
must(code, "Hi {{name}}. Thank you for signing up. Joshua and Lucia are so glad you will be with them. If you would like to send a note or anything else, you can here:\\n{{website}}", "warm welcome SMS");
must(code, "Joshua and Lucia\\'s wedding is in one week, and they are excited that you are going to join them{{joinhow}}.", "warm 7-day SMS");
must(code, "Tomorrow is the day. Joshua and Lucia cannot wait {{cannotwait}}.", "warm day-before SMS");
must(code, "Today is Joshua and Lucia\\'s wedding day, and they are so glad you are part of it.", "warm day-of SMS");
must(code, "7 November at 11am", "7-day SMS has 11am");
must(code, "upsertTemplate_(sh, 0,", "day-of template (Days Before = 0)");
must(code, "Joshua Gbafa", "seed Joshua on Reminders");
must(code, "source: 'couple'", "couple source on seeded / blast recipients");
must(code, "+17029458407", "Joshua's reminder phone");
must(code, "withCoupleRecipients_", "every sendBlast includes couple phones");
must(code, "Thank you for signing up. Joshua and Lucia are so glad you will be with them. If you would like to send a note or anything else, you can here:", "welcome SMS copy");
must(code, "do not append carrier opt-out", "do not SMS registry / opt-out footer copy");
must(index, ">Send a message</a>", "quiet Send a message button");
must(index, 'href="#fund">Gifts</a>', "Gifts button/nav scrolls to gifts section");
must(index, '<h2 class="sec-title light fade-up">Gifts</h2>', "section heading is Gifts");
mustNot(index, />Give a gift</, "do not use Give a gift as a button");
mustNot(index, /Honeymoon Fund/i, "do not use Honeymoon Fund as a heading or nav label");
mustNot(index, /Give a gift or something/i, "do not use Give a gift or something");
must(index, 'href="#fund"', "gifts button still scrolls to #fund");
must(index, 'property="og:title" content="Joshua &amp; Lucia — Save the Date"', "OG title is save-the-date, not a fund link");
must(index, "assets/og-share.png", "OG image is the cream invitation card");
must(index, 'class="hero-mark"', "hero uses the static gold emblem");
must(index, "images/wedding-icon.png", "committed wedding emblem asset");
mustNot(index, /pathLength/, "hero must not use SVG path draw-in");
mustNot(index, /id="remCountry"/, "no Ghana/USA country-code dropdown on reminders");
mustNot(rsvpHtml, /id="fCountry"/, "no Ghana/USA country-code dropdown on RSVP");
must(index, "or any country", "reminder phone accepts any country code");
must(rsvpHtml, "or any country", "RSVP phone accepts any country code");
must(code, "countryFromE164_", "normalizePhone_ maps any E.164 country");
must(code, "return 'Other'", "do not reject Other country codes");
must(code, "+44", "UK E.164 is accepted");
must(rsvpHtml, 'href="index.html#fund">Gifts</a>', "RSVP nav label is Gifts");
must(code, "audience: 'notifylive'", "goLive must blast notifylive");
must(code, "case 'notifylive':", "notifylive audience must be handled");
must(code, "getReminders_().filter", "notifylive must read Reminders tab");
must(code, "writeReminderRow_", "RSVP live-opt-in must upsert Reminders");
must(code, "source: 'RSVP'", "RSVP notifyLive writes Source=RSVP");
must(code, "SHEETS.MESSAGES", "guestbook should use Messages tab");
must(code, "TWILIO_SID", "Twilio still read from Settings");
must(rsvpHtml, 'name="notifyLive"', "RSVP form has live-opt-in");
must(rsvpHtml, "confirmModal", "RSVP form has live-notify confirm modal");
must(rsvpHtml, "I don’t have a code", "invitation code is optional");
must(rsvpJs, 'formType', "RSVP posts formType");
must(rsvpHtml, "Would you like to be reminded when we go live?", "modal copy");
must(index, 'href="rsvp.html"', "main nav/live links to RSVP");
must(index, 'id="remForm"', "homepage still has reminders form");
must(config, 'var APPS_SCRIPT_URL = "";', "do not fill a fake APPS_SCRIPT_URL");
must(config, "2026-11-07T11:00:00Z", "countdown target is 11:00 AM Ghana time");
must(index, "11:00 am", "homepage shows 11:00 am");
must(rsvpHtml, "11:00 am", "RSVP page shows 11:00 am");
must(index, 'href="privacy.html"', "homepage footer links to privacy.html");
must(index, 'href="terms.html"', "homepage footer links to terms.html");
must(rsvpHtml, 'href="privacy.html"', "RSVP footer links to privacy.html");
must(rsvpHtml, 'href="terms.html"', "RSVP footer links to terms.html");

if (!fs.existsSync("privacy.html") || !fs.existsSync("terms.html")) {
  console.error("privacy.html and terms.html must sit beside index.html");
  process.exitCode = 1;
} else {
  const privacy = fs.readFileSync("privacy.html", "utf8");
  const terms = fs.readFileSync("terms.html", "utf8");
  must(privacy, "joshuagbafa108@gmail.com", "privacy contact email");
  must(privacy, "Twilio", "privacy names Twilio");
  must(privacy, "STOP", "privacy mentions STOP");
  must(privacy, "We do not sell", "privacy says we do not sell data");
  must(privacy, "name", "privacy mentions name");
  must(privacy, "email", "privacy mentions email");
  must(privacy, "phone", "privacy mentions phone");
  must(privacy, "index,follow", "privacy is crawlable");
  must(privacy, "https://jkgbafa.github.io/save-the-date/privacy.html", "privacy canonical URL");
  must(terms, "STOP", "terms mention STOP");
  must(terms, "11:00 AM", "terms have 11:00 AM");
  must(terms, "7 November 2026", "terms have ceremony date");
  must(terms, "index,follow", "terms are crawlable");
  must(terms, "https://jkgbafa.github.io/save-the-date/terms.html", "terms canonical URL");
  must(terms, "opt into", "terms describe opt-in via the site");
  mustNot(privacy, /noindex/i, "privacy must not be noindex");
  mustNot(terms, /noindex/i, "terms must not be noindex");
}

mustNot(code, /SK[0-9a-fA-F]{20,}/, "no Twilio-looking secrets in Code.gs");
mustNot(code, /AC[0-9a-fA-F]{20,}/, "no Twilio SID secrets in Code.gs");
mustNot(fs.readFileSync("js/config.js", "utf8") + code, /AuthToken|auth_token\s*[:=]\s*['\"][^'\"]+['\"]/, "no auth tokens committed");
mustNot(index, /og:(?:title|description|image)[^>]*honeymoon/i, "do not label OG / share preview a honeymoon-fund link");
mustNot(index, /twitter:(?:title|description|image)[^>]*honeymoon/i, "twitter cards must not be a fund link");
mustNot(code, /honeymoon fund/i, "gift stays off reminder texts");

if (!fs.existsSync("images/wedding-icon.png") || !fs.existsSync("assets/og-share.png")) {
  console.error("images/wedding-icon.png and assets/og-share.png must exist");
  process.exitCode = 1;
}

["index.html", "rsvp.html", "js/config.js", "apps-script/Code.gs", "apps-script/Admin.html", "README.md"].forEach(function (f) {
  mustNot(fs.readFileSync(f, "utf8"), /9:30/, f + " must not say 9:30");
});

const guestSms = [
  "Hi {{name}}. Thank you for signing up. Joshua and Lucia are so glad you will be with them. If you would like to send a note or anything else, you can here:",
  "Joshua and Lucia's wedding is in one week, and they are excited that you are going to join them{{joinhow}}.",
  "Tomorrow is the day. Joshua and Lucia cannot wait {{cannotwait}}.",
  "Today is Joshua and Lucia's wedding day, and they are so glad you are part of it."
].join("\n");
mustNot(guestSms, /Campaign Registry|10DLC|\bTCR\b|Reply STOP|STOP to opt/i, "guest SMS copy must not include registry / opt-out legal text");
must(code, "\\n{{website}}", "website link is its own last line in reminder SMS");

if (!process.exitCode) console.log("OK — backend + RSVP contracts hold");
else {
  console.error("check.js failed");
  process.exit(1);
}
