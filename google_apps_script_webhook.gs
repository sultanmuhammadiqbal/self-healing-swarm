/**
 * ============================================================================
 * GOOGLE APPS SCRIPT REST BRIDGE — THE SELF-HEALING AD & SEO SWARM
 * ============================================================================
 * Cara Pakai (30 Detik, Tanpa Google Cloud Console):
 * 1. Buka Google Sheets kamu -> klik menu Extensions -> Apps Script
 * 2. Paste kode ini, lalu klik tombol Deploy -> New deployment
 * 3. Pilih type: "Web app", Execute as: "Me", Who has access: "Anyone"
 * 4. Copy URL Web App dan masukkan ke .env sebagai GOOGLE_APPS_SCRIPT_WEBHOOK_URL
 */

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "ok", records: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName("Approval_Queue") || ss.insertSheet("Approval_Queue");
  if (ws.getLastRow() === 0) {
    ws.appendRow([
      "Timestamp", "Run ID", "Product Name", "URL", "Approval Status",
      "Critic Score", "Rounds", "Approved Title", "Approved Meta Description",
      "Ad Headline", "Ad Body", "Schema JSON-LD"
    ]);
  }
  ws.appendRow([
    payload.timestamp || new Date().toISOString(),
    payload.id || "",
    payload.product_name || "",
    payload.product_url || "",
    payload.approval_status || "APPROVED",
    payload.final_score || 0,
    payload.iterations || 1,
    payload.approved_title || "",
    payload.approved_meta_description || "",
    payload.approved_ad_headline || "",
    payload.approved_ad_body || "",
    payload.schema_json_ld || ""
  ]);
  return ContentService.createTextOutput(JSON.stringify({ status: "pushed_to_sheets" }))
    .setMimeType(ContentService.MimeType.JSON);
}
