/**
 * ============================================================================
 * GOOGLE APPS SCRIPT REST BRIDGE — THE SELF-HEALING AD & SEO SWARM
 * ============================================================================
 * Cara Pakai (Cuma 1 Menit, Tanpa Google Cloud Console!):
 * 1. Buka Google Sheets baru/lama kamu -> klik menu Extensions -> Apps Script
 * 2. Hapus kode bawaan, lalu PASTE seluruh kode ini dan tekan Ctrl+S (Save)
 * 3. (Opsional) Jika Sheet masih kosong, pilih fungsi "setupSampleSheet" di atas
 *    lalu klik tombol "Run" agar tabel metrik GSC/GMC otomatis dibuatkan!
 * 4. Klik tombol biru "Deploy" (kanan atas) -> "New deployment"
 * 5. Klik ikon Roda Gigi (Select type) -> pilih "Web app"
 *    - Description: Swarm Bridge
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (WAJIB pilih Anyone!)
 * 6. Klik "Deploy" -> Copy "Web app URL" (berakhiran /exec)
 * 7. Masukkan URL tersebut ke .env & Vercel dengan nama:
 *    GOOGLE_APPS_SCRIPT_WEBHOOK_URL
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return ContentService.createTextOutput(JSON.stringify({ status: "empty", records: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = String(headers[j]).trim();
      obj[key] = data[i][j];
    }
    if (obj.url || obj.product_name) {
      rows.push(obj);
    }
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
    payload.product_url || payload.target_url || "",
    payload.approval_status || "PENDING_APPROVAL",
    payload.final_score || payload.critic_score || 0,
    payload.iterations || payload.total_rounds || 1,
    payload.approved_title || "",
    payload.approved_meta_description || "",
    payload.approved_ad_headline || "",
    payload.approved_ad_body || "",
    payload.schema_json_ld || ""
  ]);
  return ContentService.createTextOutput(JSON.stringify({ status: "pushed_to_sheets" }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Jalankan fungsi ini 1x dari editor Apps Script jika Google Sheet kamu masih kosong.
 */
function setupSampleSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  sheet.setName("GSC_GMC_Monitoring");
  sheet.clear();
  sheet.appendRow([
    "date", "product_name", "url", "impressions", "clicks",
    "previous_ctr", "current_ctr", "ad_spend_idr", "conversions", "status"
  ]);
  sheet.appendRow([
    "2026-11-09", "Kursi Kerja Ergonomis AeroMesh Pro",
    "https://tokofurnitur.id/produk/kursi-kerja-ergonomis-aeromesh",
    14500, 435, "3.0%", "3.1%", 450000, 18, "ACTIVE"
  ]);
  sheet.appendRow([
    "2026-11-09", "Meja Belajar Minimalis Kayu Jati",
    "https://tokofurnitur.id/produk/meja-belajar-minimalis-jati",
    18200, 218, "3.8%", "1.2%", 850000, 3, "ACTIVE"
  ]);
  sheet.appendRow([
    "2026-11-09", "Lampu Gantung Industrial Nordic",
    "https://tokofurnitur.id/produk/lampu-gantung-industrial",
    12400, 112, "2.5%", "0.9%", 520000, 1, "DISAPPROVED"
  ]);
  sheet.appendRow([
    "2026-11-09", "Kasur Pocket Spring Orthopedic Queen",
    "https://tokofurnitur.id/produk/kasur-orthopedic-queen",
    22100, 265, "4.2%", "1.2%", 1250000, 2, "ACTIVE"
  ]);

  var ws = ss.getSheetByName("Approval_Queue") || ss.insertSheet("Approval_Queue");
  if (ws.getLastRow() === 0) {
    ws.appendRow([
      "Timestamp", "Run ID", "Product Name", "URL", "Approval Status",
      "Critic Score", "Rounds", "Approved Title", "Approved Meta Description",
      "Ad Headline", "Ad Body", "Schema JSON-LD"
    ]);
  }
}
