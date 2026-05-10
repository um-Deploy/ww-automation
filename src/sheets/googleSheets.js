import { google } from 'googleapis';
import fs from 'fs';

const SHEET_NAME = 'Leads';

const HEADERS = [
  'Date & Time',
  'Phone',
  'Name',
  'Lead Type',           // Personal / Corporate
  'Company',             // Corporate only
  'Occasion',
  'Product Interest',
  'Budget',
  'Quantity',            // Corporate
  'Delivery Location',
  'Delivery Date',
  'Customisation Details',
  'Branding Required',   // Corporate
  'Catalog Sent',
  'Agent Notes',
  'Next Steps',
  'Status',              // New / In Progress / Closed / Lost
];

let sheetsClient = null;

function sheetsEnabled() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  return keyPath && fs.existsSync(keyPath);
}

async function getClient() {
  if (sheetsClient) return sheetsClient;

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!sheetsEnabled()) {
    throw new Error('SHEETS_DISABLED');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

export async function initSheet() {
  if (!sheetsEnabled()) {
    console.warn('[Sheets] Credentials not found — Google Sheets logging disabled. Bot will work normally.');
    console.warn('[Sheets] To enable: follow SETUP.md → Step 3, add credentials/google-service-account.json');
    return;
  }
  const sheets = await getClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets.map((s) => s.properties.title);

  if (!existing.includes(SHEET_NAME)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
    });

    // Write bold headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });

    // Bold the header row
    const sheetId = await getSheetId(sheets, spreadsheetId, SHEET_NAME);
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

    console.log('[Sheets] Created "Leads" sheet with headers.');
  }
}

/**
 * Append a lead row + add a note on the "Next Steps" cell.
 * @param {import('../state/leadState.js').LeadData} lead
 */
export async function logLeadToSheet(lead) {
  if (!sheetsEnabled()) {
    console.log('[Sheets] Lead captured (Sheets disabled — printing to console):');
    console.log(JSON.stringify({ phone: lead.phone, name: lead.name, type: lead.leadType, product: lead.productInterest, nextSteps: lead.nextSteps }, null, 2));
    return;
  }
  const sheets = await getClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const isPersonal  = lead.leadType === 'personal';
  const occasion    = isPersonal ? lead.occasion : lead.corporateOccasion;

  const row = [
    new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    lead.phone,
    lead.name            || '—',
    lead.leadType === 'corporate' ? 'Corporate' : 'Personal',
    lead.companyName     || '—',
    occasion             || '—',
    lead.productInterest || '—',
    lead.budget          || '—',
    lead.quantity        || '—',
    lead.deliveryLocation || '—',
    lead.deliveryDate    || '—',
    lead.customisationDetails || '—',
    lead.brandingRequired ? 'Yes' : 'No',
    lead.catalogSent     ? 'Yes' : 'No',
    lead.agentNotes      || '—',
    lead.nextSteps       || '—',
    'New',
  ];

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  // Parse the row index written so we can add a cell note
  const updatedRange = appendRes.data.updates?.updatedRange || '';
  const rowMatch = updatedRange.match(/(\d+)$/);
  const rowIndex = rowMatch ? parseInt(rowMatch[1], 10) - 1 : null;

  // Add a note (comment) on the "Next Steps" cell (column P = index 15)
  if (rowIndex !== null && lead.nextSteps) {
    const sheetId = await getSheetId(sheets, spreadsheetId, SHEET_NAME);
    const noteLines = [
      `📌 Next Steps (logged ${new Date().toLocaleDateString('en-IN')}):`,
      lead.nextSteps,
      '',
      '🤖 Agent Notes:',
      lead.agentNotes || 'None',
      '',
      `Lead Type: ${lead.leadType || 'Unknown'}`,
      lead.companyName ? `Company: ${lead.companyName}` : '',
      lead.quantity    ? `Quantity: ${lead.quantity}` : '',
    ].filter(line => line !== undefined).join('\n');

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          updateCells: {
            range: {
              sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: 15,  // Column P — Next Steps
              endColumnIndex: 16,
            },
            rows: [{ values: [{ note: noteLines }] }],
            fields: 'note',
          },
        }],
      },
    });
  }

  console.log(`[Sheets] Logged: ${lead.phone} | ${lead.name} | ${lead.leadType}`);
}

async function getSheetId(sheets, spreadsheetId, sheetName) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets.find((s) => s.properties.title === sheetName);
  return sheet?.properties?.sheetId ?? 0;
}
