/**
 * Joshua & Lucia Wedding — RSVP Backend
 * =====================================
 * Runs as a Google Apps Script Web App. 100% free (Google account only).
 *
 * What it does:
 *  - Stores two guest lists: Reminders (email/SMS / "ping me when we go live")
 *    and RSVPs (people who filled the RSVP). Guestbook messages sit on a small
 *    Messages tab so they never pollute those counts.
 *  - Builds a live Dashboard tab with counts from BOTH lists
 *  - Sends email blasts (free via Gmail) and SMS blasts (via Twilio, optional)
 *  - Generates WhatsApp click-to-chat links (free way to text Ghana numbers)
 *  - Sends automatic countdown reminders (7 days before, 1 day before, and day of)
 *  - "Go Live" button: saves the livestream link, flips the website to LIVE,
 *    and notifies everyone on the Reminders tab who asked to be pinged
 *
 * SETUP (one time, ~10 minutes) — full guide in the repo README:
 *  1. Go to script.new, paste this file as Code.gs and Admin.html as a new HTML file
 *  2. Run the `setup` function once (authorize when prompted)
 *  3. Check the execution log — it prints your Sheet URL and Admin key
 *  4. Deploy > New deployment > Web app > Execute as: Me, Access: Anyone
 *  5. Paste the web app URL into js/config.js on the website
 *
 * Twilio credentials live in the Settings sheet only. Never put them in this file.
 */

// ---------------------------------------------------------------------------
// CONFIG — edit these before running setup()
// ---------------------------------------------------------------------------

var CONFIG = {
  COUPLE_NAMES: 'Joshua & Lucia',
  WEDDING_DATE: '2026-11-07',           // yyyy-MM-dd
  WEDDING_TIME: '11:00 AM',
  TIMEZONE: 'Africa/Accra',             // Ghana time (GMT)
  VENUE: 'Anagkazo Campus, Mampong-Akuapem, Ghana',
  SPREADSHEET_NAME: 'Joshua & Lucia Wedding — RSVPs',
  // Where test messages and error alerts go:
  COUPLE_EMAIL: 'joshuagbafa108@gmail.com',
  COUPLE_PHONE: '+17029458407, +233530709044, +233549556476' // comma-separated — used by "send test SMS"
};

var SHEETS = {
  REMINDERS: 'Reminders',
  RSVP: 'RSVPs',
  MESSAGES: 'Messages',
  DASH: 'Dashboard',
  SETTINGS: 'Settings',
  TEMPLATES: 'Reminder Templates',
  LOG: 'Message Log'
};

// Reminders — everyone who signed up for email/SMS reminders or "ping me when we go live"
var REM_HEADERS = ['Timestamp', 'Name', 'Email', 'Phone', 'Country', 'Contact method', 'Notify When Live', 'Source'];
var REM = { TS: 1, NAME: 2, EMAIL: 3, PHONE: 4, COUNTRY: 5, CONTACT: 6, NOTIFY: 7, SOURCE: 8 };

// RSVPs — people who filled the RSVP (guestbook messages do NOT live here)
var RSVP_HEADERS = ['Timestamp', 'Name', 'Email', 'Phone', 'Country', 'Attending', 'Guests', 'Preferred contact', 'Notify When Live', 'Message', 'Status', 'RSVP Code'];
var COL = { TS: 1, NAME: 2, EMAIL: 3, PHONE: 4, COUNTRY: 5, ATTENDING: 6, GUESTS: 7, CONTACT: 8, NOTIFY: 9, MESSAGE: 10, STATUS: 11, CODE: 12 };

var MSG_HEADERS = ['Timestamp', 'Name', 'Email', 'Message'];

var HEADER_STYLE = { weight: 'bold', bg: '#1e3d2f', fg: '#ffffff' };

// ---------------------------------------------------------------------------
// SETUP — run this once (safe to re-run; creates missing tabs, does not wipe Settings)
// ---------------------------------------------------------------------------

function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss;
  var existingId = props.getProperty('SPREADSHEET_ID');
  if (existingId) {
    try { ss = SpreadsheetApp.openById(existingId); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }
  ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE);

  setupRemindersSheet_(ss);
  setupRsvpSheet_(ss);
  setupMessagesSheet_(ss);
  setupSettingsSheet_(ss);
  setupTemplatesSheet_(ss);
  setupLogSheet_(ss);
  migrateLegacyRows_(ss);
  seedCoupleReminder_(ss);
  setupDashboard_(ss);
  installDailyTrigger_();

  var key = getSetting_('ADMIN_KEY');
  Logger.log('==============================================');
  Logger.log('SETUP COMPLETE ✅');
  Logger.log('Your Google Sheet: ' + ss.getUrl());
  Logger.log('Tabs: Reminders + RSVPs (+ Messages, Settings, Reminder Templates, Message Log, Dashboard)');
  Logger.log('Your admin key: ' + key);
  Logger.log('Next: Deploy > New deployment > Web app (Execute as Me, Anyone has access)');
  Logger.log('Admin dashboard will be at: <web app url>?action=admin&key=' + key);
  Logger.log('==============================================');
  return ss.getUrl();
}

function setupRemindersSheet_(ss) {
  var sh = getOrCreateSheet_(ss, SHEETS.REMINDERS);
  ensureHeaderRow_(sh, REM_HEADERS);
  styleHeader_(sh, REM_HEADERS.length);
  sh.setColumnWidths(1, REM_HEADERS.length, 150);
}

function setupRsvpSheet_(ss) {
  var sh = getOrCreateSheet_(ss, SHEETS.RSVP);
  ensureHeaderRow_(sh, RSVP_HEADERS);
  styleHeader_(sh, RSVP_HEADERS.length);
  sh.setColumnWidths(1, RSVP_HEADERS.length, 150);
  sh.setColumnWidth(COL.MESSAGE, 300);
}

function setupMessagesSheet_(ss) {
  var sh = getOrCreateSheet_(ss, SHEETS.MESSAGES);
  ensureHeaderRow_(sh, MSG_HEADERS);
  styleHeader_(sh, MSG_HEADERS.length);
  sh.setColumnWidths(1, MSG_HEADERS.length, 160);
  sh.setColumnWidth(4, 360);
}

function setupSettingsSheet_(ss) {
  var sh = getOrCreateSheet_(ss, SHEETS.SETTINGS);
  if (sh.getLastRow() > 0) return; // don't overwrite existing settings (incl. Twilio secrets)
  var adminKey = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  var rows = [
    ['Setting', 'Value', 'Notes'],
    ['ADMIN_KEY', adminKey, 'Secret key for the admin dashboard. Keep private.'],
    ['LIVESTREAM_URL', '', 'Paste the YouTube/Facebook live link here (or use the Go Live button in admin)'],
    ['IS_LIVE', 'NO', 'YES = website shows the Watch Live button'],
    ['WEBSITE_URL', '', 'Your GitHub Pages URL, e.g. https://username.github.io/save-the-date'],
    ['COUPLE_EMAIL', CONFIG.COUPLE_EMAIL, 'Test messages and daily digests go here'],
    ['COUPLE_PHONE', CONFIG.COUPLE_PHONE, 'For test SMS — one or more numbers, comma-separated, in +233… / +1… format'],
    ['TWILIO_SID', '', 'Optional — from twilio.com console, enables SMS. Keep in this sheet only.'],
    ['TWILIO_AUTH_TOKEN', '', 'Optional — Twilio auth token. Keep in this sheet only.'],
    ['TWILIO_FROM', '', 'Optional — your Twilio phone number, e.g. +18445551234'],
    ['SENT_MILESTONES', '', 'Auto-managed: reminder milestones already sent'],
    ['DAILY_DIGEST', 'YES', 'YES = email the couple a daily summary of new RSVPs and reminder signups']
  ];
  sh.getRange(1, 1, rows.length, 3).setValues(rows);
  styleHeader_(sh, 3);
  sh.setColumnWidth(1, 180); sh.setColumnWidth(2, 320); sh.setColumnWidth(3, 420);
}

function setupTemplatesSheet_(ss) {
  var sh = getOrCreateSheet_(ss, SHEETS.TEMPLATES);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Days Before', 'Enabled', 'Email Subject', 'Email Body', 'SMS Body']);
  }
  styleHeader_(sh, 5);
  sh.setColumnWidth(3, 280); sh.setColumnWidth(4, 500); sh.setColumnWidth(5, 400);

  // Cadence is only 7 days, 1 day, and day of. Disable any leftover 30/14-day rows.
  if (sh.getLastRow() >= 2) {
    var existing = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < existing.length; i++) {
      var days = parseInt(existing[i][0], 10);
      if (days === 30 || days === 14) sh.getRange(i + 2, 2).setValue('NO');
    }
  }

  // Warm, first-name copy. Website is always the last line. {{joinhow}} / {{cannotwait}}
  // personalize when we know they are coming in person or online; otherwise we do not guess.
  var sms7 = 'Hi {{name}}. Joshua and Lucia\'s wedding is in one week, and they are excited that you are going to join them{{joinhow}}.\nThe ceremony is Saturday, 7 November at 11am. If you want to know more about the day:\n{{website}}';
  var sms1 = 'Hi {{name}}. Tomorrow is the day. Joshua and Lucia cannot wait {{cannotwait}}. Ceremony at 11am. If you are coming in person, please arrive by 10:30. More here:\n{{website}}';
  var sms0 = 'Hi {{name}}. Today is Joshua and Lucia\'s wedding day, and they are so glad you are part of it. Ceremony at 11am. If you are watching online, the live link is on the site:\n{{website}}';
  upsertTemplate_(sh, 7, 'YES', 'One week until Joshua & Lucia\'s wedding', sms7, sms7);
  upsertTemplate_(sh, 1, 'YES', 'Tomorrow — Joshua & Lucia', sms1, sms1);
  upsertTemplate_(sh, 0, 'YES', 'Today is the day — Joshua & Lucia', sms0, sms0);
}

function upsertTemplate_(sh, days, enabled, subject, emailBody, smsBody) {
  if (sh.getLastRow() >= 2) {
    var col = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < col.length; i++) {
      if (parseInt(col[i][0], 10) === days) {
        sh.getRange(i + 2, 1, 1, 5).setValues([[days, enabled, subject, emailBody, smsBody]]);
        return;
      }
    }
  }
  sh.appendRow([days, enabled, subject, emailBody, smsBody]);
}

/** Joshua must be on the live-ping / reminder list so he receives every blast. */
function seedCoupleReminder_(ss) {
  var sh = ss.getSheetByName(SHEETS.REMINDERS);
  if (!sh) return;
  var phone = '+17029458407';
  if (findRowByPhone_(sh, phone, REM.PHONE)) return;
  sh.appendRow([new Date(), 'Joshua Gbafa', CONFIG.COUPLE_EMAIL, phone, 'USA', 'SMS', 'Yes', 'couple']);
}

function setupLogSheet_(ss) {
  var sh = getOrCreateSheet_(ss, SHEETS.LOG);
  ensureHeaderRow_(sh, ['Timestamp', 'Channel', 'Audience', 'Subject / Preview', 'Sent', 'Failed', 'Notes']);
  styleHeader_(sh, 7);
}

function setupDashboard_(ss) {
  var sh = getOrCreateSheet_(ss, SHEETS.DASH);
  sh.clear();
  var R = "'" + SHEETS.RSVP + "'";
  var M = "'" + SHEETS.REMINDERS + "'";
  var rows = [
    ['JOSHUA & LUCIA — WEDDING DASHBOARD', '', '', ''],
    ['Wedding: ' + CONFIG.WEDDING_DATE + ' at ' + CONFIG.WEDDING_TIME + ' — ' + CONFIG.VENUE, '', '', ''],
    ['Days to go', '=MAX(0, DATE(2026,11,7)-TODAY())', '', ''],
    ['', '', '', ''],
    ['RSVPs', '', 'REMINDERS', ''],
    ['Total RSVPs', '=COUNTIFS(' + R + '!B2:B,"<>",' + R + '!K2:K,"<>Message",' + R + '!K2:K,"<>Reminder",' + R + '!F2:F,"<>Reminder only")', 'Reminder signups', '=COUNTA(' + M + '!B2:B)'],
    ['Attending in person', '=COUNTIF(' + R + '!F2:F,"In person")', 'Live opt-ins', '=COUNTIF(' + M + '!G2:G,"Yes")'],
    ['Joining online', '=COUNTIF(' + R + '!F2:F,"Online")', 'From reminder form', '=COUNTIF(' + M + '!H2:H,"reminder form")'],
    ['Not attending', '=COUNTIF(' + R + '!F2:F,"Not attending")', 'From RSVP', '=COUNTIF(' + M + '!H2:H,"RSVP")'],
    ['Total in-person guests (incl. +1s)', '=SUMIF(' + R + '!F2:F,"In person",' + R + '!G2:G)', 'From live opt-in', '=COUNTIF(' + M + '!H2:H,"live opt-in")'],
    ['RSVP live opt-ins', '=COUNTIFS(' + R + '!I2:I,"Yes",' + R + '!K2:K,"<>Message",' + R + '!F2:F,"<>Reminder only")', 'Reminders in last 7 days', '=COUNTIF(' + M + '!A2:A,">"&TODAY()-7)'],
    ['RSVPs in last 7 days', '=COUNTIFS(' + R + '!A2:A,">"&TODAY()-7,' + R + '!K2:K,"<>Message",' + R + '!F2:F,"<>Reminder only")', '', ''],
    ['', '', '', ''],
    ['CONTACT PREFERENCES (RSVPs)', '', 'PHONE NUMBERS (RSVPs)', ''],
    ['Prefer Email', '=COUNTIF(' + R + '!H2:H,"Email")', 'Ghana numbers (+233)', '=COUNTIF(' + R + '!E2:E,"Ghana")'],
    ['Prefer SMS', '=COUNTIF(' + R + '!H2:H,"SMS")', 'US numbers (+1)', '=COUNTIF(' + R + '!E2:E,"USA")'],
    ['Prefer WhatsApp', '=COUNTIF(' + R + '!H2:H,"WhatsApp")', 'Other countries', '=COUNTIFS(' + R + '!E2:E,"<>Ghana",' + R + '!E2:E,"<>USA",' + R + '!E2:E,"<>")'],
    ['', '', '', ''],
    ['LATEST RSVPS', '', '', ''],
    ['=IFERROR(QUERY(' + R + '!A2:F, "select B, C, F where F <> \'Reminder only\' and F <> \'\' order by A desc limit 10 label B \'Name\', C \'Email\', F \'Attending\'"), "No RSVPs yet")', '', '', ''],
    ['', '', '', ''],
    ['LATEST REMINDERS', '', '', ''],
    ['=IFERROR(QUERY(' + M + '!A2:H, "select B, C, F, H order by A desc limit 10 label B \'Name\', C \'Email\', F \'Contact\', H \'Source\'"), "No reminder signups yet")', '', '', '']
  ];
  sh.getRange(1, 1, rows.length, 4).setValues(rows);
  sh.getRange('A1').setFontSize(16).setFontWeight('bold');
  sh.getRange('A3:B3').setFontSize(14).setFontWeight('bold').setFontColor('#c47a3d');
  ['A5', 'C5', 'A14', 'C14', 'A19', 'A22'].forEach(function (a1) {
    sh.getRange(a1).setFontWeight('bold').setBackground('#1e3d2f').setFontColor('#ffffff');
  });
  sh.getRange('B6:B12').setFontWeight('bold');
  sh.getRange('D6:D12').setFontWeight('bold');
  sh.getRange('B15:B17').setFontWeight('bold');
  sh.getRange('D15:D17').setFontWeight('bold');
  sh.setColumnWidth(1, 280); sh.setColumnWidth(2, 120); sh.setColumnWidth(3, 240); sh.setColumnWidth(4, 140);
}

function installDailyTrigger_() {
  var exists = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'dailyReminderCheck';
  });
  if (!exists) {
    ScriptApp.newTrigger('dailyReminderCheck').timeBased().everyDays(1).atHour(9).create();
  }
}

/**
 * If this Sheet was used before the split, copy reminder-only / guestbook rows
 * onto the new tabs. Leaves the original RSVP rows in place (Dashboard ignores them).
 */
function migrateLegacyRows_(ss) {
  var rsvp = ss.getSheetByName(SHEETS.RSVP);
  if (!rsvp || rsvp.getLastRow() < 2) return;
  var rem = ss.getSheetByName(SHEETS.REMINDERS);
  var msg = ss.getSheetByName(SHEETS.MESSAGES);
  var data = rsvp.getRange(2, 1, rsvp.getLastRow() - 1, RSVP_HEADERS.length).getValues();
  data.forEach(function (r) {
    var attending = String(r[COL.ATTENDING - 1] || '').trim();
    var status = String(r[COL.STATUS - 1] || '').trim();
    var notify = String(r[COL.NOTIFY - 1] || '').trim() === 'Yes' ? 'Yes' : 'No';
    var name = String(r[COL.NAME - 1] || '').trim();
    if (!name) return;

    if (status === 'Message') {
      if (msg) msg.appendRow([r[COL.TS - 1] || new Date(), name, String(r[COL.EMAIL - 1] || '').trim(), r[COL.MESSAGE - 1] || '']);
      return;
    }

    var isReminderOnly = attending === 'Reminder only' || status === 'Reminder';
    if (isReminderOnly || notify === 'Yes') {
      var email = String(r[COL.EMAIL - 1] || '').trim().toLowerCase();
      var phone = String(r[COL.PHONE - 1] || '').trim();
      if (findRowByEmail_(rem, email, REM.EMAIL) || findRowByPhone_(rem, phone, REM.PHONE)) return;
      rem.appendRow([
        r[COL.TS - 1] || new Date(),
        name,
        email,
        phone,
        r[COL.COUNTRY - 1] || '',
        reminderContact_(r[COL.CONTACT - 1]),
        'Yes',
        isReminderOnly ? 'reminder form' : 'RSVP'
      ]);
    }
  });
}

// ---------------------------------------------------------------------------
// WEB APP ENDPOINTS
// ---------------------------------------------------------------------------

/** GET: ?action=config (public, used by the website) | ?action=admin&key=… (dashboard) */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'status';

  if (action === 'config') {
    return json_({
      ok: true,
      isLive: getSetting_('IS_LIVE').toUpperCase() === 'YES',
      livestreamUrl: getSetting_('LIVESTREAM_URL'),
      weddingDate: CONFIG.WEDDING_DATE,
      weddingTime: CONFIG.WEDDING_TIME
    });
  }

  if (action === 'admin') {
    if (!checkKey_(e.parameter.key)) {
      return HtmlService.createHtmlOutput('<h3>Wrong or missing admin key.</h3>');
    }
    var t = HtmlService.createTemplateFromFile('Admin');
    t.adminKey = e.parameter.key;
    return t.evaluate().setTitle('J&L Wedding Admin').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  return json_({ ok: true, service: 'Joshua & Lucia RSVP backend', time: new Date().toISOString() });
}

/**
 * POST from the website (application/x-www-form-urlencoded → no CORS preflight).
 * Branches on formType:
 *   reminder — write the Reminders tab (Notify When Live = Yes)
 *   message  — write the Messages tab (does not affect reminder/RSVP counts)
 *   rsvp     — write the RSVPs tab; if notifyLive=Yes, also upsert Reminders
 */
function doPost(e) {
  try {
    var p = e.parameter || {};
    var formType = String(p.formType || 'rsvp').trim().toLowerCase();
    if (formType === 'reminder') return handleReminderPost_(p);
    if (formType === 'message') return handleMessagePost_(p);
    return handleRsvpPost_(p);
  } catch (err) {
    return json_({ ok: false, error: 'Something went wrong on our side. Please try again. (' + err.message + ')' });
  }
}

function handleRsvpPost_(p) {
  var name = String(p.name || '').trim();
  var email = String(p.email || '').trim().toLowerCase();
  var phoneRaw = String(p.phone || '').trim();
  var countryCode = String(p.countryCode || '').trim();
  var attending = String(p.attending || '').trim();     // 'In person' | 'Online' | 'Not attending'
  var guests = Math.max(1, Math.min(10, parseInt(p.guests, 10) || 1));
  var contact = String(p.preferredContact || '').trim();
  var notify = String(p.notifyLive || 'No') === 'Yes' ? 'Yes' : 'No';
  var message = String(p.message || '').trim().slice(0, 1000);
  var rsvpCode = String(p.rsvpCode || '').trim().slice(0, 24);

  if (!name || !attending) {
    return json_({ ok: false, error: 'Please fill in your name and whether you can attend.' });
  }
  if (email && !isValidEmail_(email)) {
    return json_({ ok: false, error: 'That email address doesn\'t look right.' });
  }
  if (!email && !phoneRaw) {
    return json_({ ok: false, error: 'Please leave an email or a phone number so we can reach you.' });
  }
  if (['In person', 'Online', 'Not attending'].indexOf(attending) === -1) {
    return json_({ ok: false, error: 'Please choose In person, Online, or Not attending.' });
  }

  var norm = normalizePhone_(phoneRaw, countryCode);
  if (!contact) {
    contact = (norm.phone && !email) ? 'SMS' : 'Email';
  }

  var result = withLock_(function () {
    var written = writeRsvpRow_({
      name: name,
      email: email,
      phone: norm.phone,
      country: norm.country || countryFromCode_(countryCode),
      attending: attending,
      guests: attending === 'In person' ? guests : 0,
      contact: contact,
      notify: notify,
      message: message,
      statusNew: 'New',
      rsvpCode: rsvpCode,
      matchEmail: email,
      matchPhone: norm.phone,
      overwrite: true
    });
    if (notify === 'Yes') {
      writeReminderRow_({
        name: name,
        email: email,
        phone: norm.phone,
        country: norm.country || countryFromCode_(countryCode),
        contact: reminderContact_(contact, email, norm.phone),
        notify: 'Yes',
        source: 'RSVP',
        matchEmail: email,
        matchPhone: norm.phone
      });
    }
    return written;
  });

  sendConfirmation_(name, email, attending);
  return json_({ ok: true, updated: result.updated });
}

/** Save-the-date reminder signup. Writes the Reminders tab only. Notify When Live = Yes. */
function handleReminderPost_(p) {
  var name = String(p.name || '').trim();
  var email = String(p.email || '').trim().toLowerCase();
  var phoneRaw = String(p.phone || '').trim();
  var countryCode = String(p.countryCode || '').trim();
  var contactMethod = String(p.contactMethod || 'Email').trim();
  var source = String(p.source || 'reminder form').trim() || 'reminder form';
  if (source !== 'reminder form' && source !== 'RSVP' && source !== 'live opt-in') {
    source = 'reminder form';
  }

  if (!name) {
    return json_({ ok: false, error: 'Please fill in your name.' });
  }

  var wantsEmail = contactMethod !== 'Phone' && contactMethod !== 'SMS' && contactMethod !== 'WhatsApp';
  var wantsPhone = contactMethod !== 'Email';
  if (contactMethod === 'Both') { wantsEmail = true; wantsPhone = true; }
  if (wantsEmail && !email) {
    return json_({ ok: false, error: 'Please fill in your email.' });
  }
  if (email && !isValidEmail_(email)) {
    return json_({ ok: false, error: 'That email address doesn\'t look right.' });
  }
  if (wantsPhone && !phoneRaw) {
    return json_({ ok: false, error: 'Please fill in your phone number.' });
  }
  if (!email && !phoneRaw) {
    return json_({ ok: false, error: 'Please leave an email or a phone number so we can reach you.' });
  }

  var norm = normalizePhone_(phoneRaw, countryCode);
  var result = withLock_(function () {
    return writeReminderRow_({
      name: name,
      email: email,
      phone: norm.phone,
      country: norm.country || countryFromCode_(countryCode),
      contact: reminderContact_(contactMethod, email, norm.phone),
      notify: 'Yes',
      source: source,
      matchEmail: email,
      matchPhone: norm.phone
    });
  });

  maybeSendReminderSms_(norm.phone, name);
  return json_({ ok: true, updated: result.updated });
}

/** Guestbook / message wall. Lives on Messages — never counted as an RSVP or reminder. */
function handleMessagePost_(p) {
  var name = String(p.name || '').trim();
  var message = String(p.message || '').trim().slice(0, 1000);
  var email = String(p.email || '').trim().toLowerCase();

  if (!name || !message) {
    return json_({ ok: false, error: 'Please fill in your name and a message.' });
  }
  if (email && !isValidEmail_(email)) {
    return json_({ ok: false, error: 'That email address doesn\'t look right.' });
  }

  withLock_(function () {
    messagesSheet_().appendRow([new Date(), name, email, message]);
  });
  return json_({ ok: true, updated: false });
}

function writeRsvpRow_(opts) {
  var sh = rsvpSheet_();
  var existingRow = 0;
  if (opts.matchEmail) existingRow = findRowByEmail_(sh, opts.matchEmail, COL.EMAIL);
  if (!existingRow && opts.matchPhone) existingRow = findRowByPhone_(sh, opts.matchPhone, COL.PHONE);

  var status = existingRow ? 'Updated' : opts.statusNew;
  var rowValues = [
    new Date(), opts.name, opts.email, opts.phone, opts.country,
    opts.attending, opts.guests, opts.contact, opts.notify, opts.message,
    status, opts.rsvpCode || ''
  ];
  if (existingRow) {
    sh.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
    return { updated: true };
  }
  sh.appendRow(rowValues);
  return { updated: false };
}

/** Upsert a Reminders row by email or phone so the live-ping list stays complete. */
function writeReminderRow_(opts) {
  var sh = remindersSheet_();
  var existingRow = 0;
  if (opts.matchEmail) existingRow = findRowByEmail_(sh, opts.matchEmail, REM.EMAIL);
  if (!existingRow && opts.matchPhone) existingRow = findRowByPhone_(sh, opts.matchPhone, REM.PHONE);

  var email = opts.email;
  var phone = opts.phone;
  var country = opts.country;
  var contact = opts.contact;
  var notify = opts.notify || 'Yes';
  var source = opts.source || 'reminder form';

  if (existingRow) {
    var prev = sh.getRange(existingRow, 1, 1, REM_HEADERS.length).getValues()[0];
    email = email || String(prev[REM.EMAIL - 1] || '').trim();
    phone = phone || String(prev[REM.PHONE - 1] || '').trim();
    country = country || prev[REM.COUNTRY - 1] || '';
    contact = contact || prev[REM.CONTACT - 1] || 'Email';
    if (String(prev[REM.NOTIFY - 1] || '').trim() === 'Yes') notify = 'Yes';
    var prevSource = String(prev[REM.SOURCE - 1] || '').trim();
    if (prevSource) source = prevSource; // keep the earliest source
    var rowValues = [new Date(), opts.name, email, phone, country, contact, notify, source];
    sh.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
    return { updated: true };
  }
  sh.appendRow([new Date(), opts.name, email, phone, country, contact, notify, source]);
  return { updated: false };
}

/**
 * Map form contactMethod (Email|Phone|SMS|WhatsApp|Both) onto Reminders "Contact method".
 */
function reminderContact_(method, email, phone) {
  var m = String(method || '').trim();
  if (m === 'Both') return 'Both';
  if (m === 'WhatsApp') return 'WhatsApp';
  if (m === 'Phone' || m === 'SMS') return 'SMS';
  if (m === 'Email') {
    if (phone && email) return 'Email';
    if (phone && !email) return 'SMS';
    return 'Email';
  }
  if (phone && email) return 'Both';
  if (phone) return 'SMS';
  return 'Email';
}

/** Optional welcome SMS on reminder signup. One message. Skips silently without Twilio. */
function maybeSendReminderSms_(phone, name) {
  if (!phone) return;
  try {
    if (!twilioConfigured_()) return;
    sendSms_(phone, merge_(
      'Hi {{name}}. Thank you for signing up. Joshua and Lucia are so glad you will be with them. If you would like to send a note or anything else, you can here:\n{{website}}',
      { name: name, attending: '' }
    ));
  } catch (e) { /* row is already saved */ }
}

function sendConfirmation_(name, email, attending) {
  if (!email) return;
  try {
    var lines = {
      'In person': 'Joshua and Lucia cannot wait to see you at ' + CONFIG.VENUE + ' on Saturday, 7 November 2026 at ' + CONFIG.WEDDING_TIME + '. Please plan to arrive by 10:30 AM.',
      'Online': 'Joshua and Lucia are so glad you will be with them online. The livestream link will appear on our website on the day, and we\'ll send it to you when we go live.',
      'Not attending': 'Joshua and Lucia will miss you — thank you for letting them know, and for your love and prayers.'
    };
    MailApp.sendEmail({
      to: email,
      subject: 'RSVP received 💍 — Joshua & Lucia, November 7, 2026',
      body: 'Hi ' + name + ',\n\nThank you — your RSVP is confirmed!\n\n' + (lines[attending] || '') +
        '\n\nNeed to change anything? Just submit the RSVP form again with the same email or phone and we\'ll update it.' +
        '\n\nWith love,\nJoshua & Lucia',
      name: CONFIG.COUPLE_NAMES
    });
  } catch (e) { /* over quota or bad address — RSVP is still saved */ }
}

// ---------------------------------------------------------------------------
// PHONE NORMALIZATION (Ghana + US aware)
// ---------------------------------------------------------------------------

function normalizePhone_(raw, countryCode) {
  var digits = String(raw).replace(/[^\d+]/g, '');
  if (!digits) return { phone: '', country: '' };

  if (digits.indexOf('+') === 0) {
    // already international
  } else if (countryCode === '+233') {
    digits = '+233' + digits.replace(/^0/, '');
  } else if (countryCode === '+1') {
    digits = '+1' + digits.replace(/^1/, '');
  } else if (/^0\d{9}$/.test(digits)) {
    digits = '+233' + digits.slice(1);          // Ghana local format 0XXXXXXXXX
  } else if (/^\d{10}$/.test(digits)) {
    digits = '+1' + digits;                      // bare 10-digit US number
  } else {
    digits = '+' + digits;
  }

  var country = digits.indexOf('+233') === 0 ? 'Ghana' : digits.indexOf('+1') === 0 ? 'USA' : 'Other';
  return { phone: digits, country: country };
}

function countryFromCode_(countryCode) {
  if (countryCode === '+233') return 'Ghana';
  if (countryCode === '+1') return 'USA';
  return '';
}

// ---------------------------------------------------------------------------
// MESSAGING — the heart of the reminder system
// ---------------------------------------------------------------------------

/**
 * Send a message blast.
 * opts = {
 *   audience: 'all' | 'inperson' | 'online' | 'attending' | 'notifylive' | 'reminders' | 'ghana' | 'usa',
 *   channel:  'preferred' | 'email' | 'sms',
 *   subject:  'Email subject',
 *   body:     'Message with {{name}}, {{date}}, {{time}}, {{venue}}, {{website}}, {{livestream}} merge tags',
 *   smsBody:  optional shorter text used for SMS (falls back to body)
 * }
 *
 * notifylive (and GO LIVE) always reads the Reminders tab — not RSVPs.
 */
function sendBlast(opts) {
  var guests = withCoupleRecipients_(getAudience_(opts.audience || 'all'));
  var sent = 0, failed = 0, notes = [];
  var smsReady = twilioConfigured_();

  guests.forEach(function (g) {
    var wantsSms = opts.channel === 'sms' || (opts.channel === 'preferred' && prefersSms_(g.contact));
    var body = merge_(opts.body, g);
    try {
      if (wantsSms && smsReady && g.phone) {
        sendSms_(g.phone, opts.smsBody ? merge_(opts.smsBody, g) : body);
        sent++;
      } else if (wantsSms && !smsReady && g.email) {
        // No Twilio configured — fall back to email so nobody is missed
        MailApp.sendEmail({ to: g.email, subject: merge_(opts.subject || 'Joshua & Lucia', g), body: body, name: CONFIG.COUPLE_NAMES });
        sent++;
        notes.push('sms→email fallback: ' + g.name);
      } else if (g.email) {
        MailApp.sendEmail({ to: g.email, subject: merge_(opts.subject || 'Joshua & Lucia', g), body: body, name: CONFIG.COUPLE_NAMES });
        sent++;
      } else {
        failed++;
        notes.push('no valid contact: ' + g.name);
      }
    } catch (err) {
      failed++;
      notes.push(g.name + ': ' + err.message);
    }
  });

  logMessage_(opts.channel, opts.audience, opts.subject || String(opts.body).slice(0, 60), sent, failed, notes.slice(0, 10).join(' | '));
  return { sent: sent, failed: failed, total: guests.length, notes: notes.slice(0, 10) };
}

function prefersSms_(contact) {
  var c = String(contact || '');
  return c === 'SMS' || c === 'WhatsApp' || c === 'Both' || c === 'Phone';
}

/**
 * Always include Joshua's Settings numbers (and couple email) so he sees every blast.
 * Dedupes against people already on the audience list. Guest-facing SMS is the template only — no extra legal footer.
 */
function withCoupleRecipients_(guests) {
  var out = (guests || []).slice();
  var seenPhone = {};
  var seenEmail = {};
  out.forEach(function (g) {
    if (g.phone) seenPhone[String(g.phone).replace(/\s/g, '')] = true;
    if (g.email) seenEmail[String(g.email).trim().toLowerCase()] = true;
  });
  var phones = String(getSetting_('COUPLE_PHONE') || CONFIG.COUPLE_PHONE || '')
    .split(',').map(function (p) { return p.trim(); }).filter(String);
  phones.forEach(function (p) {
    var key = p.replace(/\s/g, '');
    if (seenPhone[key]) return;
    seenPhone[key] = true;
    out.push({ name: 'Joshua Gbafa', email: '', phone: p, contact: 'SMS', notify: 'Yes', source: 'couple' });
  });
  var email = String(getSetting_('COUPLE_EMAIL') || CONFIG.COUPLE_EMAIL || '').trim().toLowerCase();
  if (email && !seenEmail[email]) {
    out.push({ name: 'Joshua Gbafa', email: email, phone: '', contact: 'Email', notify: 'Yes', source: 'couple' });
  }
  return out;
}

function sendSms_(to, body) {
  // Guest copy only — do not append carrier opt-out or registry legal footers.
  var sid = getSetting_('TWILIO_SID'), token = getSetting_('TWILIO_AUTH_TOKEN'), from = getSetting_('TWILIO_FROM');
  var resp = UrlFetchApp.fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json', {
    method: 'post',
    payload: { To: to, From: from, Body: body.slice(0, 320) },
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(sid + ':' + token) },
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() >= 300) {
    throw new Error('Twilio ' + resp.getResponseCode() + ': ' + JSON.parse(resp.getContentText()).message);
  }
}

function twilioConfigured_() {
  return !!(getSetting_('TWILIO_SID') && getSetting_('TWILIO_AUTH_TOKEN') && getSetting_('TWILIO_FROM'));
}

/** Free path for Ghana: build wa.me click-to-chat links with the message pre-filled. */
function getWhatsAppLinks(key, message, audience) {
  requireKey_(key);
  return getAudience_(audience || 'all')
    .filter(function (g) { return g.phone; })
    .map(function (g) {
      return {
        name: g.name,
        phone: g.phone,
        url: 'https://wa.me/' + g.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(merge_(message, g))
      };
    });
}

// ---------------------------------------------------------------------------
// GO LIVE — flips the website + notifies opt-ins on the Reminders tab
// ---------------------------------------------------------------------------

function goLive(key, livestreamUrl, announce) {
  requireKey_(key);
  setSetting_('LIVESTREAM_URL', livestreamUrl);
  setSetting_('IS_LIVE', 'YES');
  if (!announce) return { sent: 0, failed: 0, total: 0, notes: ['Saved. Website is now LIVE (no messages sent).'] };
  return sendBlast({
    audience: 'notifylive',
    channel: 'preferred',
    subject: '🔴 We\'re LIVE — Joshua & Lucia\'s wedding!',
    body: 'Hi {{name}}, the wedding is starting! Watch Joshua & Lucia say "I do" live right now:\n\n{{livestream}}\n\nWith love, J & L'
  });
}

function endLive(key) {
  requireKey_(key);
  setSetting_('IS_LIVE', 'NO');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// AUTOMATIC REMINDERS — runs daily via trigger
// ---------------------------------------------------------------------------

function dailyReminderCheck() {
  var today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  var daysLeft = Math.round((parseDate_(CONFIG.WEDDING_DATE) - parseDate_(today)) / 86400000);
  if (daysLeft < 0) return;

  var sentList = getSetting_('SENT_MILESTONES').split(',').filter(String);
  var sh = sheet_(SHEETS.TEMPLATES);
  var data = sh.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var daysBefore = parseInt(data[i][0], 10);
    var enabled = String(data[i][1]).toUpperCase() === 'YES';
    if (!enabled || daysBefore !== daysLeft || sentList.indexOf(String(daysBefore)) !== -1) continue;

    var result = sendBlast({
      audience: 'countdown',
      channel: 'preferred',
      subject: data[i][2],
      body: data[i][3],
      smsBody: data[i][4]
    });
    sentList.push(String(daysBefore));
    setSetting_('SENT_MILESTONES', sentList.join(','));
    notifyCouple_('Reminder sent (' + daysBefore + ' days before): ' + result.sent + ' delivered, ' + result.failed + ' failed.');
  }

  maybeSendDailyDigest_();
}

function maybeSendDailyDigest_() {
  if (getSetting_('DAILY_DIGEST').toUpperCase() !== 'YES') return;
  var rsvps = getRsvps_();
  var reminders = getReminders_();
  var cutoff = new Date(Date.now() - 86400000);
  var freshR = rsvps.filter(function (g) { return g.timestamp && g.timestamp > cutoff; });
  var freshM = reminders.filter(function (g) { return g.timestamp && g.timestamp > cutoff; });
  if (!freshR.length && !freshM.length) return;
  var inPerson = rsvps.filter(function (g) { return g.attending === 'In person'; }).length;
  var online = rsvps.filter(function (g) { return g.attending === 'Online'; }).length;
  var lines = [];
  if (freshR.length) {
    lines.push(freshR.length + ' new RSVP(s) in the last 24h:');
    freshR.forEach(function (g) { lines.push('• ' + g.name + ' — ' + g.attending + (g.message ? ' — "' + g.message + '"' : '')); });
  }
  if (freshM.length) {
    if (lines.length) lines.push('');
    lines.push(freshM.length + ' new reminder signup(s) in the last 24h:');
    freshM.forEach(function (g) { lines.push('• ' + g.name + ' — ' + (g.source || 'reminder')); });
  }
  lines.push('');
  lines.push('Totals: ' + rsvps.length + ' RSVPs | ' + inPerson + ' in person | ' + online + ' online | ' + reminders.length + ' reminder signups | ' +
    reminders.filter(function (g) { return g.notify === 'Yes'; }).length + ' live opt-ins');
  notifyCouple_(lines.join('\n'));
}

function notifyCouple_(body) {
  var to = getSetting_('COUPLE_EMAIL') || CONFIG.COUPLE_EMAIL;
  if (!to) return;
  try {
    MailApp.sendEmail({ to: to, subject: '💍 Wedding site update', body: body, name: 'Wedding Bot' });
  } catch (e) { /* quota */ }
}

// ---------------------------------------------------------------------------
// ADMIN API (called from Admin.html via google.script.run)
// ---------------------------------------------------------------------------

function getAdminData(key) {
  requireKey_(key);
  var rsvps = getRsvps_();
  var reminders = getReminders_();
  var countR = function (fn) { return rsvps.filter(fn).length; };
  var countM = function (fn) { return reminders.filter(fn).length; };
  return {
    weddingDate: CONFIG.WEDDING_DATE,
    daysLeft: Math.max(0, Math.round((parseDate_(CONFIG.WEDDING_DATE) - Date.now()) / 86400000)),
    isLive: getSetting_('IS_LIVE').toUpperCase() === 'YES',
    livestreamUrl: getSetting_('LIVESTREAM_URL'),
    twilioConfigured: twilioConfigured_(),
    emailQuotaLeft: MailApp.getRemainingDailyQuota(),
    sheetUrl: SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')).getUrl(),
    stats: {
      total: rsvps.length,
      reminders: reminders.length,
      inPerson: countR(function (g) { return g.attending === 'In person'; }),
      online: countR(function (g) { return g.attending === 'Online'; }),
      notAttending: countR(function (g) { return g.attending === 'Not attending'; }),
      totalGuests: rsvps.reduce(function (s, g) { return s + (g.attending === 'In person' ? g.guests : 0); }, 0),
      notifyLive: countM(function (g) { return g.notify === 'Yes'; }),
      ghana: countR(function (g) { return g.country === 'Ghana'; }),
      usa: countR(function (g) { return g.country === 'USA'; }),
      preferEmail: countR(function (g) { return g.contact === 'Email'; }),
      preferSms: countR(function (g) { return g.contact === 'SMS'; }),
      preferWhatsApp: countR(function (g) { return g.contact === 'WhatsApp'; })
    },
    guests: rsvps.map(function (g) {
      return { name: g.name, email: g.email, phone: g.phone, country: g.country, attending: g.attending, guests: g.guests, contact: g.contact, notify: g.notify, message: g.message };
    }).reverse(),
    reminders: reminders.map(function (g) {
      return { name: g.name, email: g.email, phone: g.phone, country: g.country, contact: g.contact, notify: g.notify, source: g.source };
    }).reverse()
  };
}

function sendBlastApi(key, opts) {
  requireKey_(key);
  return sendBlast(opts);
}

function sendTestApi(key, opts) {
  requireKey_(key);
  var me = { name: 'Test Guest', email: getSetting_('COUPLE_EMAIL') || CONFIG.COUPLE_EMAIL, phone: getSetting_('COUPLE_PHONE'), contact: 'Email', country: '', attending: 'In person', guests: 1, notify: 'Yes', message: '' };
  var body = merge_(opts.body, me);
  var result = { email: null, sms: null };
  if (opts.channel === 'email' || opts.channel === 'preferred') {
    MailApp.sendEmail({ to: me.email, subject: '[TEST] ' + merge_(opts.subject || 'Test', me), body: body, name: CONFIG.COUPLE_NAMES });
    result.email = 'sent to ' + me.email;
  }
  if (opts.channel === 'sms') {
    if (!twilioConfigured_()) throw new Error('Twilio not configured yet — add TWILIO_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM in the Settings tab.');
    var phones = String(me.phone).split(',').map(function (p) { return p.trim(); }).filter(String);
    if (!phones.length) throw new Error('Add COUPLE_PHONE in the Settings tab first.');
    phones.forEach(function (p) { sendSms_(p, body); });
    result.sms = 'sent to ' + phones.join(', ');
  }
  return result;
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function isRsvpRow_(g) {
  if (!g.name) return false;
  if (g.status === 'Message' || g.status === 'Reminder') return false;
  if (g.attending === 'Reminder only') return false;
  return !!(g.attending);
}

function getRsvps_() {
  var sh = rsvpSheet_();
  if (!sh || sh.getLastRow() < 2) return [];
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, RSVP_HEADERS.length).getValues();
  return data.map(function (r) {
    return {
      timestamp: r[COL.TS - 1], name: r[COL.NAME - 1], email: String(r[COL.EMAIL - 1]).trim(),
      phone: String(r[COL.PHONE - 1]).trim(), country: r[COL.COUNTRY - 1], attending: r[COL.ATTENDING - 1],
      guests: Number(r[COL.GUESTS - 1]) || 0, contact: r[COL.CONTACT - 1], notify: r[COL.NOTIFY - 1],
      message: r[COL.MESSAGE - 1], status: String(r[COL.STATUS - 1] || '').trim()
    };
  }).filter(isRsvpRow_);
}

function getReminders_() {
  var sh = remindersSheet_();
  if (!sh || sh.getLastRow() < 2) return [];
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, REM_HEADERS.length).getValues();
  return data.map(function (r) {
    return {
      timestamp: r[REM.TS - 1], name: r[REM.NAME - 1], email: String(r[REM.EMAIL - 1]).trim(),
      phone: String(r[REM.PHONE - 1]).trim(), country: r[REM.COUNTRY - 1],
      contact: r[REM.CONTACT - 1], notify: r[REM.NOTIFY - 1], source: r[REM.SOURCE - 1],
      attending: ''
    };
  }).filter(function (g) { return g.name; });
}

/** Pick the list a blast should hit. notifylive always comes from Reminders. */
function getAudience_(audience) {
  switch (audience) {
    case 'notifylive':
      return getReminders_().filter(function (g) { return g.notify === 'Yes'; });
    case 'reminders':
      return getReminders_();
    case 'inperson':
      return getRsvps_().filter(function (g) { return g.attending === 'In person'; });
    case 'online':
      return getRsvps_().filter(function (g) { return g.attending === 'Online'; });
    case 'attending':
      return getRsvps_().filter(function (g) { return g.attending === 'In person' || g.attending === 'Online'; });
    case 'countdown':
      return dedupeGuests_(getRsvps_().filter(function (g) {
        return g.attending === 'In person' || g.attending === 'Online';
      }).concat(getReminders_()));
    case 'ghana':
      return getRsvps_().filter(function (g) { return g.country === 'Ghana'; });
    case 'usa':
      return getRsvps_().filter(function (g) { return g.country === 'USA'; });
    default:
      return getRsvps_();
  }
}

function dedupeGuests_(list) {
  var seen = {};
  var out = [];
  list.forEach(function (g) {
    var key = (String(g.email || '').toLowerCase() || '') + '|' + (g.phone || '');
    if (key === '|') key = 'name:' + String(g.name || '').toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push(g);
  });
  return out;
}

function joinHow_(g) {
  var a = String((g && g.attending) || '').trim();
  if (a === 'In person') return ' in person';
  if (a === 'Online') return ' online';
  return '';
}

function cannotWait_(g) {
  var a = String((g && g.attending) || '').trim();
  if (a === 'In person') return 'to see you';
  if (a === 'Online') return 'to have you with them online';
  return 'to have you with them';
}

function merge_(text, g) {
  g = g || {};
  return String(text || '')
    .replace(/\{\{name\}\}/g, g.name ? String(g.name).split(' ')[0] : 'friend')
    .replace(/\{\{fullname\}\}/g, g.name || 'friend')
    .replace(/\{\{joinhow\}\}/g, joinHow_(g))
    .replace(/\{\{cannotwait\}\}/g, cannotWait_(g))
    .replace(/\{\{date\}\}/g, 'Saturday, 7 November 2026')
    .replace(/\{\{time\}\}/g, CONFIG.WEDDING_TIME)
    .replace(/\{\{venue\}\}/g, CONFIG.VENUE)
    .replace(/\{\{website\}\}/g, getSetting_('WEBSITE_URL') || '')
    .replace(/\{\{livestream\}\}/g, getSetting_('LIVESTREAM_URL') || '');
}

function logMessage_(channel, audience, preview, sent, failed, notes) {
  sheet_(SHEETS.LOG).appendRow([new Date(), channel, audience, preview, sent, failed, notes || '']);
}

function findRowByEmail_(sh, email, col) {
  if (!email || !sh || sh.getLastRow() < 2) return 0;
  var emails = sh.getRange(2, col || COL.EMAIL, sh.getLastRow() - 1, 1).getValues();
  var needle = String(email).trim().toLowerCase();
  for (var i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).trim().toLowerCase() === needle) return i + 2;
  }
  return 0;
}

function findRowByPhone_(sh, phone, col) {
  if (!phone || !sh || sh.getLastRow() < 2) return 0;
  var phones = sh.getRange(2, col || COL.PHONE, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < phones.length; i++) {
    if (String(phones[i][0]).trim() === phone) return i + 2;
  }
  return 0;
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function ensureHeaderRow_(sh, headers) {
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    return;
  }
  var existing = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  var empty = existing.every(function (c) { return String(c || '').trim() === ''; });
  if (empty) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function styleHeader_(sh, nCols) {
  sh.getRange(1, 1, 1, nCols).setFontWeight(HEADER_STYLE.weight).setBackground(HEADER_STYLE.bg).setFontColor(HEADER_STYLE.fg);
  sh.setFrozenRows(1);
}

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Run setup() first.');
  return SpreadsheetApp.openById(id);
}
function sheet_(name) { return ss_().getSheetByName(name); }
function rsvpSheet_() { return sheet_(SHEETS.RSVP); }
function remindersSheet_() { return sheet_(SHEETS.REMINDERS); }
function messagesSheet_() { return sheet_(SHEETS.MESSAGES); }
function getOrCreateSheet_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }

function getSetting_(key) {
  var sh = sheet_(SHEETS.SETTINGS);
  var data = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) return String(data[i][1] || '').trim();
  }
  return '';
}

function setSetting_(key, value) {
  var sh = sheet_(SHEETS.SETTINGS);
  var data = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) { sh.getRange(i + 2, 2).setValue(value); return; }
  }
  sh.appendRow([key, value, '']);
}

function checkKey_(key) { return key && key === getSetting_('ADMIN_KEY'); }
function requireKey_(key) { if (!checkKey_(key)) throw new Error('Invalid admin key.'); }
function parseDate_(ymd) { var p = ymd.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getTime(); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
