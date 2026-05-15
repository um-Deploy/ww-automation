/* ================================================================
   WOODWALEY — Order Report → Google Sheets

   Usage:
     node sheets-orders.mjs --today        → today's orders (incremental)
     node sheets-orders.mjs --days 7       → last 7 days (full refresh)
     node sheets-orders.mjs --days 30      → last 30 days (full refresh)

   Columns A–H : order data (auto-filled, brown header)
   Columns I–K : dispatch data — Weight, Dimensions, Package Photo (orange header)
   Column  L   : Fulfillment status — dropdown: Unfulfilled / In Process / Fulfilled (blue header)
   Column  M   : Dispatch status   — dropdown: Pending / In Process / Dispatched / Complete (green header)

   --today mode appends only NEW orders so the team's dispatch updates are preserved.
   --days  mode clears and rewrites the full report tab.
   ================================================================ */

import { google }         from 'googleapis';
import https              from 'https';
import path               from 'path';
import { fileURLToPath }  from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ── Config ───────────────────────────────────────────────────── */
const SHEET_ID = '1JVcA8zvrFp0mT3u88yDxZxHuj-GRFyhfLcV1PfE3I1c';
const KEY_FILE = process.env.GOOGLE_CREDENTIALS_PATH ||
  path.resolve(__dirname, '../credentials/ww-ai-automation-6e7f331fdd57.json');
const STORE    = 'mq7rnf-dv.myshopify.com';
const TOKEN    = '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';

const HEADERS = [
  'Order No', 'Date', 'Item Name', 'Image', 'Qty',
  'Payment', 'Customisation', 'Order Total',
  'Weight (g)', 'L × B × H (cm)', 'Package Photo',
  'Fulfillment', 'Dispatch Status'
];

/* ── Args ─────────────────────────────────────────────────────── */
const args    = process.argv.slice(2);
const isToday = args.includes('--today');
const days    = isToday ? 1 : parseInt(args[args.indexOf('--days') + 1] || '7', 10);

const since = new Date();
let until = null;
if (isToday) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST      = new Date(Date.now() + IST_OFFSET_MS);
  const midnightUTC = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()));
  since.setTime(midnightUTC.getTime() - IST_OFFSET_MS);           // 00:00 IST today
  until = new Date(midnightUTC.getTime() - IST_OFFSET_MS + 86400000); // 00:00 IST tomorrow
} else {
  since.setDate(since.getDate() - days);
}

const todayLabel = new Date().toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
});
const SHEET_NAME = isToday ? todayLabel : `Last ${days} Days`;

/* ── Shopify helpers ──────────────────────────────────────────── */
function shopifyGet(urlPath) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: STORE, path: urlPath,
      headers: { 'X-Shopify-Access-Token': TOKEN, Accept: 'application/json' }
    }, res => {
      let data = ''; const link = res.headers['link'] || '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve({ body: JSON.parse(data), link }); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

function nextPage(linkHeader) {
  const m = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  if (!m) return null;
  const u = new URL(m[1]); return u.pathname + u.search;
}

async function fetchAll(startPath) {
  const all = []; let p = startPath;
  while (p) {
    const { body, link } = await shopifyGet(p);
    all.push(...(body[Object.keys(body)[0]] || []));
    p = nextPage(link);
  }
  return all;
}

/* ── CoD / Prepaid ────────────────────────────────────────────── */
function getPaymentType(order) {
  if (order.discount_codes?.some(d => d.code.toUpperCase().includes('PREPAID'))) return 'Prepaid';
  const gw = (order.payment_gateway || '').toLowerCase();
  if (['cod','cash','releaseit','cash_on_delivery'].some(k => gw.includes(k))) return 'COD';
  if (['partially_paid','pending'].includes(order.financial_status)) return 'COD';
  return 'Prepaid';
}

function getFulfillmentLabel(status) {
  if (status === 'partial') return 'Partial';
  if (status === 'fulfilled') return 'Fulfilled';
  return 'Unfulfilled';
}

/* ── Google Sheets helpers ────────────────────────────────────── */
async function getSheetsClient() {
  const authOpts = { scopes: ['https://www.googleapis.com/auth/spreadsheets'] };
  if (process.env.GOOGLE_CREDENTIALS_B64) {
    // GitHub Actions: decode base64 credentials directly — no file needed
    authOpts.credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8')
    );
  } else {
    authOpts.keyFile = KEY_FILE;
  }
  const auth = new google.auth.GoogleAuth(authOpts);
  return google.sheets({ version: 'v4', auth });
}

async function getTabId(sheets, tabName) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  return meta.data.sheets.find(s => s.properties.title === tabName)?.properties?.sheetId ?? 0;
}

async function getOrCreateTab(sheets) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existing = meta.data.sheets.map(s => s.properties.title);

  if (existing.includes(SHEET_NAME)) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }
  });
  console.log(`Created "${SHEET_NAME}" tab.`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] }
  });

  const sheetId = await getTabId(sheets, SHEET_NAME);

  // Batch 1: headers, freeze, column widths
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        { repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
          cell: { userEnteredFormat: {
            textFormat: { bold: true, foregroundColor: { red:1, green:1, blue:1 } },
            backgroundColor: { red: 0.361, green: 0.239, blue: 0.18 },
            horizontalAlignment: 'CENTER'
          }},
          fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)'
        }},
        { repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 8, endColumnIndex: 11 },
          cell: { userEnteredFormat: {
            textFormat: { bold: true, foregroundColor: { red:1, green:1, blue:1 } },
            backgroundColor: { red: 0.9, green: 0.46, blue: 0.09 },
            horizontalAlignment: 'CENTER'
          }},
          fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)'
        }},
        { repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 11, endColumnIndex: 12 },
          cell: { userEnteredFormat: {
            textFormat: { bold: true, foregroundColor: { red:1, green:1, blue:1 } },
            backgroundColor: { red: 0.08, green: 0.40, blue: 0.75 },
            horizontalAlignment: 'CENTER'
          }},
          fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)'
        }},
        { repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 12, endColumnIndex: 13 },
          cell: { userEnteredFormat: {
            textFormat: { bold: true, foregroundColor: { red:1, green:1, blue:1 } },
            backgroundColor: { red: 0.18, green: 0.49, blue: 0.20 },
            horizontalAlignment: 'CENTER'
          }},
          fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)'
        }},
        { updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
          fields: 'gridProperties.frozenRowCount'
        }},
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 3,  endIndex: 4  }, properties: { pixelSize: 80  }, fields: 'pixelSize' }},
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 8,  endIndex: 9  }, properties: { pixelSize: 100 }, fields: 'pixelSize' }},
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 9,  endIndex: 10 }, properties: { pixelSize: 130 }, fields: 'pixelSize' }},
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 10, endIndex: 11 }, properties: { pixelSize: 140 }, fields: 'pixelSize' }},
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 11, endIndex: 12 }, properties: { pixelSize: 130 }, fields: 'pixelSize' }},
        { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 12, endIndex: 13 }, properties: { pixelSize: 150 }, fields: 'pixelSize' }}
      ]
    }
  });
  console.log('  Header formatting applied.');

  // Batch 2: dropdowns
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        { setDataValidation: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 11, endColumnIndex: 12 },
          rule: {
            condition: { type: 'ONE_OF_LIST', values: [
              { userEnteredValue: 'Unfulfilled' },
              { userEnteredValue: 'In Process' },
              { userEnteredValue: 'Fulfilled' }
            ]},
            showCustomUi: true, strict: false
          }
        }},
        { setDataValidation: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 12, endColumnIndex: 13 },
          rule: {
            condition: { type: 'ONE_OF_LIST', values: [
              { userEnteredValue: 'Pending' },
              { userEnteredValue: 'In Process' },
              { userEnteredValue: 'Dispatched' },
              { userEnteredValue: 'Complete' }
            ]},
            showCustomUi: true, strict: false
          }
        }}
      ]
    }
  });
  console.log('  Dropdowns applied.');

  // Batch 3: conditional formatting
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        { addConditionalFormatRule: { index: 0, rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 11, endColumnIndex: 12 }],
          booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Unfulfilled' }] },
            format: { backgroundColor: { red: 1.0, green: 0.85, blue: 0.85 } } }
        }}},
        { addConditionalFormatRule: { index: 1, rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 11, endColumnIndex: 12 }],
          booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'In Process' }] },
            format: { backgroundColor: { red: 0.80, green: 0.90, blue: 1.0 } } }
        }}},
        { addConditionalFormatRule: { index: 2, rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 11, endColumnIndex: 12 }],
          booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Fulfilled' }] },
            format: { backgroundColor: { red: 0.80, green: 0.96, blue: 0.80 } } }
        }}},
        { addConditionalFormatRule: { index: 3, rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 12, endColumnIndex: 13 }],
          booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Pending' }] },
            format: { backgroundColor: { red: 1.0, green: 0.95, blue: 0.70 } } }
        }}},
        { addConditionalFormatRule: { index: 4, rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 12, endColumnIndex: 13 }],
          booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'In Process' }] },
            format: { backgroundColor: { red: 0.80, green: 0.90, blue: 1.0 } } }
        }}},
        { addConditionalFormatRule: { index: 5, rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 12, endColumnIndex: 13 }],
          booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Dispatched' }] },
            format: { backgroundColor: { red: 0.90, green: 0.80, blue: 1.0 } } }
        }}},
        { addConditionalFormatRule: { index: 6, rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 12, endColumnIndex: 13 }],
          booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Complete' }] },
            format: { backgroundColor: { red: 0.80, green: 0.96, blue: 0.80 } } }
        }}}
      ]
    }
  });
  console.log('  Conditional formatting applied.');
}

async function getExistingOrderNos(sheets) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A2:A10000`
    });
    return new Set((res.data.values || []).flat());
  } catch(e) { return new Set(); }
}

async function clearDataRows(sheets) {
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A2:Z10000`
    });
  } catch(e) { /* empty tab */ }
}

/* ── Main ─────────────────────────────────────────────────────── */
async function main() {
  process.stdout.write('Fetching Shopify orders…');

  const maxParam = until ? `&created_at_max=${until.toISOString()}` : '';
  const [orders, products] = await Promise.all([
    // status=open excludes cancelled; fulfilled filtered below
    fetchAll(`/admin/api/2024-01/orders.json?status=open&limit=250&created_at_min=${since.toISOString()}${maxParam}`),
    fetchAll('/admin/api/2024-01/products.json?limit=250&fields=id,variants,images')
  ]);

  // Skip fully fulfilled orders — they're already shipped
  const activeOrders = orders.filter(o => o.fulfillment_status !== 'fulfilled');
  console.log(` ${orders.length} fetched → ${activeOrders.length} active (unfulfilled/partial).`);

  // variant → image URL
  const varImg = {};
  for (const prod of products) {
    const def = prod.images?.[0]?.src || '';
    for (const v of (prod.variants || [])) {
      varImg[v.id] = prod.images?.find(i => i.id === v.image_id)?.src || def;
    }
  }

  // Build rows
  const rows = [];
  for (const order of activeOrders) {
    const date = new Date(order.created_at).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    });
    const payment     = getPaymentType(order);
    const fulfillment = getFulfillmentLabel(order.fulfillment_status);

    for (const item of order.line_items) {
      const variant = item.variant_title && item.variant_title !== 'Default Title'
        ? ` (${item.variant_title})` : '';
      const imgUrl       = varImg[item.variant_id];
      const imageFormula = imgUrl ? `=IMAGE("${imgUrl}",4,60,60)` : '';
      const custom       = (item.properties || [])
        .filter(p => !p.name.startsWith('_'))
        .map(p => `${p.name}: ${p.value}`)
        .join(' | ') || '—';

      rows.push([
        `#${order.order_number}`,
        date,
        item.title + variant,
        imageFormula,
        item.quantity,
        payment,
        custom,
        `₹${parseFloat(order.total_price).toLocaleString('en-IN')}`,
        '',           // Weight (g)       — dispatch team
        '',           // L × B × H (cm)  — dispatch team
        '',           // Package Photo    — dispatch team
        fulfillment,  // Fulfillment      — from Shopify, editable
        'Pending'     // Dispatch Status  — team updates via dropdown
      ]);
    }
  }

  process.stdout.write('Connecting to Google Sheets…');
  const sheets = await getSheetsClient();
  await getOrCreateTab(sheets);
  console.log(' done.');

  let writeRows;
  let startRowIndex; // 0-based row index of first written data row

  if (isToday) {
    // Incremental: only add orders not already in the sheet
    const existing = await getExistingOrderNos(sheets);
    writeRows = rows.filter(r => !existing.has(r[0]));
    if (!writeRows.length) {
      console.log(`\n✓ No new orders since last run. Sheet is up to date.`);
      console.log(`✓ https://docs.google.com/spreadsheets/d/${SHEET_ID}`);
      return;
    }
    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A2`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'OVERWRITE',
      requestBody: { values: writeRows }
    });
    // Parse appended range to get row indices for formatting
    const rangeStr = appendRes.data.updates?.updatedRange || '';
    const m = rangeStr.match(/[A-Z]+(\d+):[A-Z]+(\d+)/);
    startRowIndex = m ? parseInt(m[1]) - 1 : 1;
  } else {
    // Full refresh: clear and rewrite
    await clearDataRows(sheets);
    writeRows = rows;
    if (!writeRows.length) {
      console.log(`\n✓ No active orders for this period.`);
      console.log(`✓ https://docs.google.com/spreadsheets/d/${SHEET_ID}`);
      return;
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A2`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: writeRows }
    });
    startRowIndex = 1;
  }

  // Row height + peach bg on dispatch cols I–K for written rows
  const sheetId = await getTabId(sheets, SHEET_NAME);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        { updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: startRowIndex, endIndex: startRowIndex + writeRows.length },
          properties: { pixelSize: 65 }, fields: 'pixelSize'
        }},
        { repeatCell: {
          range: { sheetId, startRowIndex: startRowIndex, endRowIndex: startRowIndex + writeRows.length, startColumnIndex: 8, endColumnIndex: 11 },
          cell: { userEnteredFormat: { backgroundColor: { red: 1.0, green: 0.95, blue: 0.88 } } },
          fields: 'userEnteredFormat.backgroundColor'
        }}
      ]
    }
  });

  const label = isToday ? 'today' : `last ${days} days`;
  console.log(`\n✓ ${writeRows.length} row(s) written to "${SHEET_NAME}" tab (${label})`);
  console.log(`✓ https://docs.google.com/spreadsheets/d/${SHEET_ID}`);
}

main().catch(e => { console.error('\nERROR:', e.message); process.exit(1); });
