/** Standalone guest collection deployment. Deploy this file alone as Code.gs.
 * Keeps contact details private in the owner's Sheet. No mail or scheduled jobs.
 */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create('Joshua & Lucia — Guest Responses');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  ss.setSpreadsheetTimeZone('Africa/Accra');
  var headers = {
    RSVPs: ['Received', 'Name', 'Email', 'Phone', 'Attending', 'Guests', 'Preferred contact', 'Notify when live', 'Message'],
    Messages: ['Received', 'Name', 'Email', 'Message'],
    Settings: ['Setting', 'Value']
  };
  Object.keys(headers).forEach(function(name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (!sh.getLastRow()) {
      sh.appendRow(headers[name]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, headers[name].length).setBackground('#3b3a36').setFontColor('#faf8f2').setFontWeight('bold');
      sh.setColumnWidths(1, headers[name].length, 180);
      sh.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
      if (name === 'Settings') sh.getRange(2, 1, 3, 2).setValues([
        ['WEBSITE_URL', 'https://joshualucia.com/'], ['IS_LIVE', 'NO'], ['LIVESTREAM_URL', '']
      ]);
    }
  });
  var dash = ss.getSheetByName('Dashboard') || ss.insertSheet('Dashboard');
  if (!dash.getLastRow()) {
    dash.getRange(1, 1, 7, 2).setValues([
      ['Joshua & Lucia — Guest Responses', ''],
      ['Wedding', '7 November 2026 · 11:00 AM'],
      ['Total responses', '=COUNTA(RSVPs!B2:B)'],
      ['In person', '=COUNTIF(RSVPs!E2:E,"In person")'],
      ['People attending', '=SUMIF(RSVPs!E2:E,"In person",RSVPs!F2:F)'],
      ['Online', '=COUNTIF(RSVPs!E2:E,"Online")'],
      ['Not attending', '=COUNTIF(RSVPs!E2:E,"Not attending")']
    ]);
    dash.setColumnWidth(1, 310); dash.setColumnWidth(2, 260);
    dash.getRange('A1:B1').setBackground('#3b3a36').setFontColor('#faf8f2').setFontWeight('bold');
    dash.getRange('A3:A7').setFontWeight('bold');
  }
  ss.setActiveSheet(dash); ss.moveActiveSheet(1);
  Logger.log('Guest responses: ' + ss.getUrl());
  return ss.getUrl();
}

function spreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Run setup first.');
  return SpreadsheetApp.openById(id);
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'config') {
    var settings = {};
    spreadsheet_().getSheetByName('Settings').getDataRange().getValues().slice(1).forEach(function(row) {
      settings[row[0]] = String(row[1]);
    });
    var url = settings.LIVESTREAM_URL || '';
    if (!/^https:\/\//i.test(url)) url = '';
    return json_({ok:true, isLive:settings.IS_LIVE === 'YES' && !!url, livestreamUrl:url,
      weddingDate:'2026-11-07', weddingTime:'11:00 AM'});
  }
  return json_({ok:true, service:'Joshua & Lucia guest responses'});
}

// Store user text literally; never interpret a name or message as a formula.
function literal_(value) {
  return /^[=+@\-\t\r]/.test(String(value)) ? "'" + value : value;
}

function doPost(e) {
  var lock;
  try {
    var p = (e && e.parameter) || {};
    var type = String(p.formType || 'rsvp');
    if (type !== 'rsvp' && type !== 'message') return json_({ok:false,error:'Please use the RSVP or message form.'});
    if (p.website) return json_({ok:false,error:'Please try again.'});
    var name = String(p.name || '').trim().slice(0,150);
    var email = String(p.email || '').trim().toLowerCase().slice(0,254);
    var phone = String(p.phone || '').trim().slice(0,40);
    var message = String(p.message || '').trim().slice(0,1000);
    if (!name) return json_({ok:false,error:'Please enter your name.'});
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json_({ok:false,error:'Please check your email address.'});
    if (type === 'message' && !message) return json_({ok:false,error:'Please enter a message.'});
    var attending = String(p.attending || '');
    if (type === 'rsvp' && (!email && !phone)) return json_({ok:false,error:'Please leave an email or phone number.'});
    if (type === 'rsvp' && ['In person','Online','Not attending'].indexOf(attending) < 0) return json_({ok:false,error:'Please choose how you will attend.'});
    var contact = p.preferredContact === 'WhatsApp' ? 'WhatsApp' : 'Email';
    if (type === 'rsvp' && contact === 'WhatsApp' && !phone) return json_({ok:false,error:'Please add a WhatsApp phone number.'});
    var row = type === 'message' ? [new Date(),name,email,message] :
      [new Date(),name,email,phone,attending,attending === 'In person' ? Math.max(1,Math.min(10,parseInt(p.guests,10)||1)) : 0,
       contact,p.notifyLive === 'Yes' ? 'Yes' : 'No',message];
    row = row.map(function(value) { return typeof value === 'string' ? literal_(value) : value; });
    lock = LockService.getScriptLock(); lock.waitLock(20000);
    spreadsheet_().getSheetByName(type === 'message' ? 'Messages' : 'RSVPs').appendRow(row);
    SpreadsheetApp.flush();
    return json_({ok:true});
  } catch (error) {
    return json_({ok:false,error:'We could not save your response. Please try again shortly.'});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}
