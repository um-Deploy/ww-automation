/* ================================================================
   Deploys Google Apps Script to the spreadsheet.
   Adds "📦 Dispatch" menu → "📷 Add Package Photo" button.
   Run once:  node deploy-appsscript.mjs
   ================================================================ */

import { google }        from 'googleapis';
import path              from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY_FILE  = path.resolve(__dirname, '../credentials/ww-ai-automation-6e7f331fdd57.json');
const SHEET_ID  = '1JVcA8zvrFp0mT3u88yDxZxHuj-GRFyhfLcV1PfE3I1c';

/* ── Apps Script source ───────────────────────────────────────── */
const CODE_GS = `
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📦 Dispatch')
    .addItem('📷 Add Package Photo', 'showPhotoUploader')
    .addToUi();
}

function showPhotoUploader() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var row   = sheet.getActiveCell().getRow();
  if (row < 2) { SpreadsheetApp.getUi().alert('Select a row first.'); return; }

  var tpl = HtmlService.createTemplateFromFile('PhotoUploader');
  tpl.activeRow  = row;
  tpl.sheetName  = sheet.getName();

  SpreadsheetApp.getUi().showModalDialog(
    tpl.evaluate().setWidth(420).setHeight(380),
    '📷 Package Photo — Row ' + row
  );
}

function uploadPhoto(base64, mimeType, fileName, row, sheetName) {
  var folderName = 'Woodwaley Package Photos';
  var folders    = DriveApp.getFoldersByName(folderName);
  var folder     = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var url = 'https://drive.google.com/uc?export=view&id=' + file.getId();

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.getRange(row, 11).setFormula('=IMAGE("' + url + '",4,60,60)');
  sheet.setRowHeight(row, 65);

  return { success: true };
}
`;

const PHOTO_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:20px;background:#fff}
  h3{color:#5c3d2e;margin-bottom:6px;font-size:15px}
  p{color:#888;font-size:12px;margin-bottom:16px}
  .row{display:flex;gap:10px;margin-bottom:14px}
  .btn{flex:1;padding:16px 10px;border:none;border-radius:10px;font-size:15px;cursor:pointer;font-weight:600}
  .cam{background:#5c3d2e;color:#fff}
  .gal{background:#e8f0fe;color:#1a73e8}
  .up{width:100%;padding:14px;background:#2e7d32;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;display:none}
  .up:disabled{opacity:.6;cursor:default}
  #preview{width:100%;max-height:150px;object-fit:contain;border-radius:8px;display:none;margin-bottom:12px;background:#f5f5f5}
  #status{text-align:center;color:#666;font-size:13px;margin-top:10px;min-height:18px}
  input[type=file]{display:none}
</style>
</head>
<body>
<h3>Row <?= activeRow ?> — Add Package Photo</h3>
<p>Take a photo or pick from gallery. It will appear in the sheet.</p>

<input type="file" id="cam" accept="image/*" capture="environment">
<input type="file" id="gal" accept="image/*">
<img id="preview" alt="">

<div class="row">
  <button class="btn cam" onclick="document.getElementById('cam').click()">📷 Camera</button>
  <button class="btn gal" onclick="document.getElementById('gal').click()">🖼️ Gallery</button>
</div>
<button class="up" id="upBtn" onclick="upload()">⬆️ Save to Sheet</button>
<div id="status"></div>

<script>
var ROW   = <?= activeRow ?>;
var SHEET = <?= JSON.stringify(sheetName) ?>;
var file  = null;

['cam','gal'].forEach(function(id){
  document.getElementById(id).addEventListener('change', function(){
    file = this.files[0];
    if(!file) return;
    var r = new FileReader();
    r.onload = function(e){
      var img = document.getElementById('preview');
      img.src = e.target.result;
      img.style.display = 'block';
      document.getElementById('upBtn').style.display = 'block';
    };
    r.readAsDataURL(file);
  });
});

function upload(){
  if(!file) return;
  var btn = document.getElementById('upBtn');
  btn.disabled = true;
  document.getElementById('status').textContent = 'Uploading…';
  var r = new FileReader();
  r.onload = function(e){
    var b64 = e.target.result.split(',')[1];
    google.script.run
      .withSuccessHandler(function(){
        document.getElementById('status').textContent = '✅ Photo saved!';
        setTimeout(function(){ google.script.host.close(); }, 1200);
      })
      .withFailureHandler(function(err){
        document.getElementById('status').textContent = '❌ ' + err.message;
        btn.disabled = false;
      })
      .uploadPhoto(b64, file.type, file.name, ROW, SHEET);
  };
  r.readAsDataURL(file);
}
</script>
</body>
</html>`;

/* ── Deploy ───────────────────────────────────────────────────── */
async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: [
      'https://www.googleapis.com/auth/script.projects',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  const script = google.script({ version: 'v1', auth });

  process.stdout.write('Creating Apps Script project…');
  const proj = await script.projects.create({
    requestBody: { title: 'Woodwaley Dispatch', parentId: SHEET_ID }
  });
  const scriptId = proj.data.scriptId;
  console.log(' done. ID:', scriptId);

  process.stdout.write('Pushing script files…');
  await script.projects.updateContent({
    scriptId,
    requestBody: {
      files: [
        { name: 'Code',          type: 'SERVER_JS', source: CODE_GS    },
        { name: 'PhotoUploader', type: 'HTML',      source: PHOTO_HTML }
      ]
    }
  });
  console.log(' done.');

  console.log('\n✓ Deployed!');
  console.log('  Script: https://script.google.com/d/' + scriptId + '/edit');
  console.log('\nNext step:');
  console.log('  1. Open the spreadsheet');
  console.log('  2. Refresh the page');
  console.log('  3. Click "📦 Dispatch" menu → "📷 Add Package Photo"');
  console.log('  4. Authorize the script when prompted (one-time)');
}

main().catch(e => { console.error('\nERROR:', e.message); process.exit(1); });
