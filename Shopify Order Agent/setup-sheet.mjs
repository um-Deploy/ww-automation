/* ================================================================
   One-time setup: creates a new Google Sheet + shares with your Gmail
   Usage:  node setup-sheet.mjs --email you@gmail.com
   ================================================================ */

import { google }        from 'googleapis';
import fs                from 'fs';
import path              from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY_FILE  = path.resolve(__dirname, '../credentials/ww-ai-automation-6e7f331fdd57.json');

const args  = process.argv.slice(2);
const email = args[args.indexOf('--email') + 1];
if (!email) { console.error('Usage: node setup-sheet.mjs --email your@gmail.com'); process.exit(1); }

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive  = google.drive({ version: 'v3', auth });

  // 1. Create new spreadsheet
  process.stdout.write('Creating spreadsheet…');
  const res = await sheets.spreadsheets.create({
    requestBody: { properties: { title: 'Woodwaley — Orders & Dispatch' } }
  });
  const sheetId  = res.data.spreadsheetId;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
  console.log(' done.');

  // 2. Share with user's Gmail as editor
  process.stdout.write(`Sharing with ${email}…`);
  await drive.permissions.create({
    fileId: sheetId,
    requestBody: { type: 'user', role: 'writer', emailAddress: email }
  });
  console.log(' done.');

  // 3. Auto-patch SHEET_ID in sheets-orders.mjs
  const ordersFile = path.join(__dirname, 'sheets-orders.mjs');
  let src = fs.readFileSync(ordersFile, 'utf8');
  src = src.replace(
    /const SHEET_ID\s*=\s*'[^']+'/,
    `const SHEET_ID = '${sheetId}'`
  );
  fs.writeFileSync(ordersFile, src, 'utf8');
  console.log('Updated SHEET_ID in sheets-orders.mjs.');

  console.log('\n✓ All done!');
  console.log(`  Sheet  : ${sheetUrl}`);
  console.log(`  ID     : ${sheetId}`);
  console.log(`  Access : ${email} (Editor)`);
  console.log('\nRun orders now:');
  console.log('  node sheets-orders.mjs --today');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
