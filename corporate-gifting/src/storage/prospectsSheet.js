import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH   = path.join(__dirname, '../../../../data/gifting_prospects.csv');
const SHEET_NAME = 'Gifting Prospects';

const HEADERS = [
  'Scraped Date', 'Company Name', 'Industry', 'City',
  'Phone', 'Website', 'Address', 'Rating',
  'Contact Name', 'Contact Role', 'Contact Email', 'Contact Phone',
  'Source', 'Offer Sent', 'Sent Date', 'Response', 'Status', 'Notes',
];

let _client  = null;
let _sheetOk = null;

// ── CSV fallback ──────────────────────────────────────────────────────────────

function ensureCsv() {
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, HEADERS.join(',') + '\n');
  }
}

function appendCsv(row) {
  ensureCsv();
  const line = row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
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

export async function initProspectsSheet() {
  if (!sheetsConfigured()) {
    console.warn('[GiftingSheet] Google Sheets not configured — using CSV fallback.');
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
      // Bold headers
      const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetId = sheetMeta.data.sheets.find(s => s.properties.title === SHEET_NAME)?.properties?.sheetId;
      if (sheetId !== undefined) {
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
      console.log('[GiftingSheet] Created "Gifting Prospects" tab.');
    }

    _sheetOk = true;
    console.log('[GiftingSheet] Google Sheets connected.');
  } catch (err) {
    console.warn('[GiftingSheet] Sheets error — using CSV fallback:', err.message);
    ensureCsv();
    _sheetOk = false;
  }
}

export async function logProspect(lead) {
  const row = [
    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    lead.companyName,
    lead.industry,
    lead.city,
    lead.phone,
    lead.website || '',
    lead.address || '',
    lead.rating || '',
    lead.contactName || '',
    lead.contactRole || '',
    lead.contactEmail || '',
    lead.contactPhone || lead.phone,
    lead.source,
    'No', '—', '—', 'New', '—',
  ];

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
    console.warn('[GiftingSheet] Append failed (saved to CSV):', err.message);
    _sheetOk = false;
  }
}

export async function updateOfferSent(phone) {
  try {
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const sentDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const updated = content.replace(
      new RegExp(`"${phone}","[^"]*","No","—"`),
      `"${phone}","","Yes","${sentDate}"`
    );
    fs.writeFileSync(CSV_PATH, updated);
  } catch { /* best-effort */ }

  if (!_sheetOk) return;

  try {
    const sheets = await getClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!E:E`,
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === phone);
    if (rowIndex === -1) return;

    const sentDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!N${rowIndex + 1}:Q${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Yes', sentDate, '—', 'Contacted']] },
    });
  } catch (err) {
    console.warn('[GiftingSheet] Update failed:', err.message);
  }
}
