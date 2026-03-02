/**
 * Vinny Waitlist - Google Apps Script
 * Paste this into Extensions → Apps Script, then Deploy as Web app (Anyone).
 * Collects: email + pre-launch metrics (referrer, UTM, timezone, language, device).
 */

var HEADERS = ['Email', 'Date', 'Referrer', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Timezone', 'Language', 'Device'];

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, message: 'Use POST with waitlist payload' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    const data = JSON.parse(e.postData.contents);
    const email = (data.email || '').trim().toLowerCase();
    if (!email) return jsonOut({ success: false, message: 'Email required' });

    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const emails = sheet.getRange(2, 1, lastRow, 1).getValues();
      const alreadyExists = emails.some(function (r) { return (r[0] || '').toString().trim().toLowerCase() === email; });
      if (alreadyExists) return jsonOut({ success: true, alreadyRegistered: true });
    }

    const row = [
      email,
      data.timestamp || new Date().toISOString(),
      data.referrer || '',
      data.utm_source || '',
      data.utm_medium || '',
      data.utm_campaign || '',
      data.timezone || '',
      data.language || '',
      data.device || '',
    ];
    sheet.appendRow(row);
    return jsonOut({ success: true });
  } catch (err) {
    return jsonOut({ success: false, message: err.toString() });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
