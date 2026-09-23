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
must(code, "Joshua Gbafa", "seed Joshua on Reminders tab for admin tests");
must(code, "source: 'couple'", "couple source on seeded / blast recipients");
must(code, "+17029458407", "Joshua's phone on couple seed");
must(code, "withCoupleRecipients_", "every sendBlast includes couple phones");
must(code, "Standalone reminder signups are no longer available", "public reminder POST is disabled");
must(code, "disabled: true", "reminder endpoint returns disabled");
must(code, "do not append carrier opt-out", "do not SMS registry / opt-out footer copy");
must(index, ">Send a message</a>", "quiet Send a message button");
must(index, 'href="#fund">Gifts</a>', "Gifts button/nav scrolls to gifts section");
must(index, '<h2 class="sec-title light fade-up">Gifts</h2>', "section heading is Gifts");
mustNot(index, />Give a gift</, "do not use Give a gift as a button");
mustNot(index, /Honeymoon Fund/i, "do not use Honeymoon Fund as a heading or nav label");
mustNot(index, /Give a gift or something/i, "do not use Give a gift or something");
must(index, 'href="#fund"', "gifts button still scrolls to #fund");
must(index, 'property="og:title" content="Joshua &amp; Lucia — Save the Date"', "OG title is save-the-date, not a fund link");
must(index, "assets/joshua-lucia-share.jpg", "OG image is the couple photo");
must(index, 'class="cover-damask"', "hero uses repeating damask, not leaf branches");
must(fs.readFileSync("css/style.css", "utf8"), "floral-cream-gold.png", "hero tiles the cream-gold floral");
(function () {
  var css = fs.readFileSync("css/style.css", "utf8");
  var coverRule = css.match(/\.cover-damask\s*\{[^}]+\}/);
  var giftsRule = css.match(/\.section-floral\s+\.cover-damask\s*\{[^}]+\}/);
  must(coverRule ? coverRule[0] : "", "opacity: .025", "hero damask is softened to 2.5%");
  must(giftsRule ? giftsRule[0] : "", "opacity: .04", "Gifts floral overlay is ~4%");
  mustNot(coverRule ? coverRule[0] : "", /opacity:\s*\.(?:[1-9]\d|[2-9]\d*)/, "hero damask must stay a whisper, not 20%+");
})();
mustNot(fs.readFileSync("css/style.css", "utf8"), /#243656|#152033/, "cover and Gifts must not use navy/blue fills");
mustNot(fs.readFileSync("css/style.css", "utf8"), /texture-white\.png/, "do not tile the navy-era white toile on cover/Gifts");
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
must(fs.readFileSync("js/main.js", "utf8"), "You will get a message from Joshua and Lucia soon.", "guestbook thanks stays generic");
mustNot(fs.readFileSync("js/main.js", "utf8"), /You will get a text from Joshua and Lucia soon/, "homepage must not promise SMS");
mustNot(fs.readFileSync("js/rsvp.js", "utf8"), /You will get a text from Joshua and Lucia soon/, "RSVP must not promise SMS");
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
mustNot(index, /id="remCountry"/, "no Ghana/USA country-code dropdown");
mustNot(rsvpHtml, /id="fCountry"/, "no Ghana/USA country-code dropdown on RSVP");
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
must(rsvpHtml, "confirmModal", "RSVP form has join-online confirm modal");
must(rsvpHtml, 'id="rsvpForm"', "main RSVP form is on the page");
must(rsvpHtml, 'id="stepForm"', "RSVP form section is present");
mustNot(rsvpHtml, /id="stepCode"/, "no RSVP code-gate panel");
mustNot(rsvpHtml, /id="codeInput"/, "no RSVP code input");
mustNot(rsvpHtml, /id="codeBtn"/, "no RSVP Continue code button");
mustNot(rsvpHtml, /I don.t have a code/, "no I don’t have a code link");
mustNot(rsvpHtml, /rsvpCode/, "no hidden RSVP code field");
mustNot(rsvpHtml, /we can ping you/, "no ping-when-live reminder framing");
mustNot(rsvpJs, /stepCode/, "RSVP JS must not drive a code step");
mustNot(rsvpJs, /codeBtn|codeInput|noCodeBtn/, "RSVP JS must not handle invitation codes");
must(rsvpJs, 'formType', "RSVP posts formType");
must(rsvpHtml, "Join us online instead?", "modal offers Online when they cannot be in Ghana");
must(rsvpHtml, 'value="Online"', "RSVP has Online livestream option");
must(rsvpHtml, 'value="In person"', "RSVP has in-person option");
must(rsvpHtml, 'value="WhatsApp"', "RSVP prefers WhatsApp over SMS");
mustNot(rsvpHtml, /value="SMS"/, "RSVP contact preference must not offer SMS");
must(index, 'href="rsvp.html"', "main nav/live links to RSVP");
mustNot(index, /id="reminders"/, "homepage must not have a reminders section");
mustNot(index, /id="remForm"/, "homepage must not have a reminders form");
mustNot(index, /href="#reminders"/, "no leftover #reminders links");
mustNot(rsvpHtml, /index\.html#reminders/, "RSVP nav must not link to reminders");
mustNot(index, /Keep me posted/, "no reminders-only CTA");
mustNot(index, /sign up for reminders/i, "Watch live / Q&A must not push reminder signup");
mustNot(index, /Wedding reminders/, "no Wedding reminders heading");
mustNot(rsvpHtml, /fSmsConsent/, "no RSVP SMS consent checkbox");
mustNot(rsvpHtml, /welcome, 7 days before, 1 day before, and the day of/, "no Twilio cadence copy on RSVP");
mustNot(index, /welcome, 7 days before, 1 day before, and the day of/, "no Twilio cadence copy on homepage");
mustNot(fs.readFileSync("js/main.js", "utf8"), /formType:\s*"reminder"/, "main.js must not post reminder signups");
mustNot(fs.readFileSync("js/rsvp.js", "utf8"), /smsConsent/, "RSVP JS must not send SMS consent");
must(fs.readFileSync("js/rsvp.js", "utf8"), "Yes, I’ll join online", "confirm path can switch Not attending → Online");
must(code, "function smsConsented_", "legacy SMS helper may remain unused");
mustNot(code, /if \(smsOk\) maybeSendReminderSms_/, "disabled reminder POST must not send welcome SMS");
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
  must(privacy, "We do not sell", "privacy says we do not sell data");
  must(privacy, "do not share or sell phone numbers", "privacy says numbers are not sold or shared");
  must(privacy, "name", "privacy mentions name");
  must(privacy, "email", "privacy mentions email");
  must(privacy, "phone", "privacy mentions phone");
  must(privacy, "index,follow", "privacy is crawlable");
  must(privacy, "https://joshualucia.com/privacy.html", "privacy canonical URL");
  mustNot(privacy, /Twilio/, "privacy must not describe Twilio SMS reminders");
  mustNot(privacy, /\bSTOP\b/, "privacy must not describe SMS STOP opt-out");
  mustNot(privacy, /up to 4 messages/, "privacy must not list reminder SMS cadence");
  must(terms, "11:00 AM", "terms have 11:00 AM");
  must(terms, "7 November 2026", "terms have ceremony date");
  must(terms, "index,follow", "terms are crawlable");
  must(terms, "https://joshualucia.com/terms.html", "terms canonical URL");
  mustNot(terms, /SMS reminders/, "terms must not have an SMS reminders section");
  mustNot(terms, /\bSTOP\b/, "terms must not describe SMS STOP opt-out");
  mustNot(privacy, /noindex/i, "privacy must not be noindex");
  mustNot(terms, /noindex/i, "terms must not be noindex");
}

mustNot(code, /SK[0-9a-fA-F]{20,}/, "no Twilio-looking secrets in Code.gs");
mustNot(code, /AC[0-9a-fA-F]{20,}/, "no Twilio SID secrets in Code.gs");
mustNot(fs.readFileSync("js/config.js", "utf8") + code, /AuthToken|auth_token\s*[:=]\s*['\"][^'\"]+['\"]/, "no auth tokens committed");
mustNot(index, /og:(?:title|description|image)[^>]*honeymoon/i, "do not label OG / share preview a honeymoon-fund link");
mustNot(index, /twitter:(?:title|description|image)[^>]*honeymoon/i, "twitter cards must not be a fund link");
mustNot(code, /honeymoon fund/i, "gift stays off reminder texts");

if (!fs.existsSync("images/wedding-icon.png") || !fs.existsSync("assets/og-share.png") || !fs.existsSync("assets/floral-cream-gold.png")) {
  console.error("images/wedding-icon.png, assets/og-share.png, and assets/floral-cream-gold.png must exist");
  process.exitCode = 1;
}

["index.html", "rsvp.html", "js/config.js", "apps-script/Code.gs", "apps-script/Admin.html", "README.md"].forEach(function (f) {
  mustNot(fs.readFileSync(f, "utf8"), /9:30/, f + " must not say 9:30");
});

must(fs.readFileSync("README.md", "utf8"), "Automated wedding-reminder SMS is not used", "README notes reminders removed");
must(fs.readFileSync("README.md", "utf8"), "APPS_SCRIPT_URL", "README still documents the backend URL");
must(fs.readFileSync("README.md", "utf8"), "no invitation-code gate", "README notes RSVP form is shown directly");

if (!process.exitCode) console.log("OK — backend + RSVP contracts hold");
else {
  console.error("check.js failed");
  process.exit(1);
}
