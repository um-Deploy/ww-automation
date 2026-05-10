import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAlreadyContacted } from './seenPhones.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, '../../../../data/gifting_prospects.csv');

export function getUnsentLeads(industryFilter = null) {
  if (!fs.existsSync(CSV_PATH)) return [];

  const lines = fs.readFileSync(CSV_PATH, 'utf8').split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const leads = [];

  for (const line of lines.slice(1)) {
    const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
    const row = {};
    cols.forEach((col, i) => { row[headers[i]] = col.replace(/^"|"$/g, '').trim(); });

    if (row['Offer Sent'] === 'Yes') continue;
    if (!row['Phone'] || isAlreadyContacted(row['Phone'])) continue;
    if (industryFilter && row['Industry']?.toLowerCase() !== industryFilter.toLowerCase()) continue;

    leads.push({
      companyName: row['Company Name'] || row['Business Name'] || '',
      industry: row['Industry'] || '',
      city: row['City'] || '',
      phone: row['Phone'] || '',
      website: row['Website'] || '',
      address: row['Address'] || '',
      contactName: row['Contact Name'] || '',
      contactRole: row['Contact Role'] || '',
      contactEmail: row['Contact Email'] || '',
      contactPhone: row['Contact Phone'] || row['Phone'] || '',
      source: row['Source'] || '',
    });
  }

  return leads;
}
