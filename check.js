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
must(index, ">Give a gift</a>", "quiet Give a gift button");
must(index, 'href="#fund"', "gift button goes to existing fund section");
must(index, 'property="og:title" content="Joshua & Lucia — Save the Date"', "OG title is save-the-date, not a fund link");
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

mustNot(code, /SK[0-9a-fA-F]{20,}/, "no Twilio-looking secrets in Code.gs");
mustNot(code, /AC[0-9a-fA-F]{20,}/, "no Twilio SID secrets in Code.gs");
mustNot(fs.readFileSync("js/config.js", "utf8") + code, /AuthToken|auth_token\s*[:=]\s*['\"][^'\"]+['\"]/, "no auth tokens committed");
mustNot(index, /og:(?:title|description|image)[^>]*honeymoon/i, "do not label OG / share preview a honeymoon-fund link");
mustNot(code, /honeymoon fund/i, "gift stays off reminder texts");

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
