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
must(code, "Hi {{name}}. These are reminders from Joshua and Lucia\\'s wedding. You are on the list. Ceremony is Saturday, 7 November 2026 at 11am. If you want to know more:\\n{{website}}", "welcome SMS — on the list, months away, website last");
must(code, "You are on the list", "welcome SMS says they are on the list");
must(code, "Joshua and Lucia\\'s wedding is in one week, and they are excited that you are going to join them{{joinhow}}.", "warm 7-day SMS");
must(code, "Tomorrow is the day. Joshua and Lucia cannot wait {{cannotwait}}.", "warm day-before SMS");
must(code, "Today is Joshua and Lucia\\'s wedding day, and they are so glad you are part of it.", "warm day-of SMS");
must(code, "7 November at 11am", "7-day SMS has 11am");
must(code, "upsertTemplate_(sh, 0,", "day-of template (Days Before = 0)");
must(code, "Joshua Gbafa", "seed Joshua on Reminders");
must(code, "source: 'couple'", "couple source on seeded / blast recipients");
must(code, "+17029458407", "Joshua's reminder phone");
must(code, "withCoupleRecipients_", "every sendBlast includes couple phones");
must(code, "These are reminders from Joshua and Lucia", "welcome SMS copy");
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
must(index, 'class="cover-damask"', "hero uses repeating damask, not leaf branches");
must(fs.readFileSync("css/style.css", "utf8"), "texture-white.png", "hero tiles the original toile floral");
must(fs.readFileSync("css/style.css", "utf8"), "width: 100%;", "cover / cover-inner are full width for centering");
must(index, 'id="fund"', "gifts section exists");
mustNot(index, /sil-doves/, "gifts must not use the doves silhouette");
mustNot(index, /By card/, "no pay-by-card gift option");
mustNot(index, /Give by card/, "no Give by card button");
mustNot(index, /id="cardBtn"/, "no card giving button");
mustNot(config, /CARD_FUND_URL/, "no CARD_FUND_URL stub");
mustNot(fs.readFileSync("js/main.js", "utf8"), /cardBtn/, "main.js must not wire a card button");
mustNot(index, /Stripe|PayPal/i, "no Stripe/PayPal stubs on the homepage");
(function () {
  var start = index.indexOf('id="fund"');
  var end = index.indexOf('id="faq"');
  var fund = start >= 0 && end > start ? index.slice(start, end) : "";
  must(fund, "images/wedding-icon.png", "gifts section uses the gold emblem");
  must(fund, "cover-damask", "gifts section tiles the floral damask");
  must(fund, "MTN", "gifts keep MTN");
  must(fund, "Zelle", "gifts keep Zelle");
  must(fund, "Venmo", "gifts keep Venmo");
})();
mustNot(fs.readFileSync("css/style.css", "utf8"), /damask\.svg/, "do not use the simple sprig SVG on the hero");
must(index, "images/wedding-icon.png", "committed wedding emblem asset");
must(index, "thanksModal", "thank-you popup on homepage");
must(index, "thanksModalBody", "popup body is set in HTML");
must(index, ">Thank you</h3>", "popup title is Thank you");
must(index, "You will get a message from Joshua and Lucia soon.", "popup fallback copy");
must(rsvpHtml, "thanksModal", "thank-you popup on RSVP");
must(rsvpHtml, "thanksModalBody", "RSVP popup body");
must(fs.readFileSync("js/main.js", "utf8"), "You will get a text from Joshua and Lucia soon.", "text signups get a text-from-us line");
must(fs.readFileSync("js/main.js", "utf8"), "You will get an email from Joshua and Lucia soon.", "email-only signups get an email line");
must(fs.readFileSync("js/main.js", "utf8"), "unconfigured", "empty APPS_SCRIPT_URL is an error, not a silent save");
must(fs.readFileSync("js/rsvp.js", "utf8"), "guest list isn’t connected", "RSVP shows a clear error when backend URL is empty");
mustNot(fs.readFileSync("js/main.js", "utf8"), /ok: true, local: true/, "do not fake a successful save without a backend");
mustNot(fs.readFileSync("js/rsvp.js", "utf8"), /if \(!APPS_SCRIPT_URL\) \{ thankYou/, "do not thank-you RSVP when backend URL is empty");
(function () {
  var start = index.indexOf('id="home"');
  var end = index.indexOf('id="welcome"');
  var cover = start >= 0 && end > start ? index.slice(start, end) : "";
  must(cover, "cover-damask", "cover has damask layer");
  mustNot(cover, /emboss/, "cover must not keep the two embossed branches");
  must(cover, "images/wedding-icon.png", "gold emblem stays on the hero");
})();
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

if (!fs.existsSync("images/wedding-icon.png") || !fs.existsSync("assets/og-share.png") || !fs.existsSync("assets/texture-white.png")) {
  console.error("images/wedding-icon.png, assets/og-share.png, and assets/texture-white.png must exist");
  process.exitCode = 1;
}

["index.html", "rsvp.html", "js/config.js", "apps-script/Code.gs", "apps-script/Admin.html", "README.md"].forEach(function (f) {
  mustNot(fs.readFileSync(f, "utf8"), /9:30/, f + " must not say 9:30");
});

const guestSms = [
  "Hi {{name}}. These are reminders from Joshua and Lucia's wedding. You are on the list. Ceremony is Saturday, 7 November 2026 at 11am. If you want to know more:",
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
