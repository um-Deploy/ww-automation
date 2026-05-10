import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH   = path.join(__dirname, '../../../data/prospects.csv');
const SHEET_NAME = 'Prospects';

const HEADERS = [
  'Scraped Date', 'Business Name', 'Industry', 'Phone', 'City',
  'Address', 'Rating', 'Source', 'Offer Sent', 'Sent Date',
  'Response', 'Status', 'Notes',
];

let _client   = null;
let _sheetOk  = null; // null=untested, true=working, false=failed

// ── Local CSV fallback ────────────────────────────────────────────────────────

function ensureCsv() {
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, HEADERS.join(',') + '\n');
  }
}

function appendCsv(row) {
  ensureCsv();
  const line = row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  fs.appendFileSync(CSV_PATH, line + '\n');
}

// ── Google Sheets ─────────────────────────────────────────────────────────────

function sheetsConfigured() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  return !!(keyPath && fs.existsSync(keyPath) && process.env.GOOGLE_SHEET_ID);
}

async function getClient() {
  if (_client) return _client;
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _client = google.sheets({ version: 'v4', auth });
  return _client;
}

async function getSheetId(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets.find(s => s.properties.title === SHEET_NAME);
  return sheet?.properties?.sheetId ?? null;
}

export async function initProspectsSheet() {
  if (!sheetsConfigured()) {
    console.warn('[ProspectsSheet] Google Sheets not configured — using local CSV fallback.');
    ensureCsv();
    _sheetOk = false;
    return;
  }

  try {
    const sheets = await getClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existing = meta.data.sheets.map(s => s.properties.title);

    if (!existing.includes(SHEET_NAME)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADERS] },
      });
      const sheetId = await getSheetId(sheets, spreadsheetId);
      if (sheetId !== null) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              repeatCell: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                cell: { userEnteredFormat: { textFormat: { bold: true } } },
                fields: 'userEnteredFormat.textFormat.bold',
              },
            }],
          },
        });
      }
      console.log('[ProspectsSheet] Created "Prospects" tab.');
    }

    _sheetOk = true;
    console.log('[ProspectsSheet] Google Sheets connected.');
  } catch (err) {
    if (err.message?.includes('has not been used') || err.status === 403) {
      console.warn('[ProspectsSheet] Google Sheets API not enabled — using local CSV fallback.');
      console.warn('[ProspectsSheet] Enable at: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=316650885791');
    } else {
      console.warn('[ProspectsSheet] Sheets error — using CSV fallback:', err.message);
    }
    ensureCsv();
    _sheetOk = false;
  }
}

export async function logProspect(lead) {
  const row = [
    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    lead.name,
    lead.industry.charAt(0).toUpperCase() + lead.industry.slice(1),
    lead.phone,
    lead.city,
    lead.address || '—',
    lead.rating  || '—',
    lead.source,
    'No', '—', '—', 'New', '—',
  ];

  // Always write to CSV (local backup)
  appendCsv(row);

  if (!_sheetOk) return;

  try {
    const sheets = await getClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
  } catch (err) {
    console.warn('[ProspectsSheet] Sheet append failed (saved to CSV):', err.message);
    _sheetOk = false;
  }
}

export async function updateOfferSent(phone) {
  // Update CSV
  try {
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const sentDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const updated = content.replace(
      new RegExp(`"${phone}","No","—"`),
      `"${phone}","Yes","${sentDate}"`
    );
    fs.writeFileSync(CSV_PATH, updated);
  } catch { /* CSV update is best-effort */ }

  if (!_sheetOk) return;

  try {
    const sheets = await getClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!D:D`,
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === phone);
    if (rowIndex === -1) return;

    const sentDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!I${rowIndex + 1}:L${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Yes', sentDate, '—', 'Contacted']] },
    });
  } catch (err) {
    console.warn('[ProspectsSheet] Sheet update failed:', err.message);
  }
}
