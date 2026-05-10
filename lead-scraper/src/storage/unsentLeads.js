import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH  = path.join(__dirname, '../../../data/prospects.csv');

// Read leads from CSV where Offer Sent = No, optionally filter by industry
export function getUnsentLeads(industryFilter = null, cityFilter = null) {
  if (!fs.existsSync(CSV_PATH)) {
    console.warn('[UnsentLeads] No prospects.csv found — run scrape first.');
    return [];
  }

  const lines  = fs.readFileSync(CSV_PATH, 'utf8').trim().split('\n');
  if (lines.length <= 1) return []; // headers only

  const leads = [];
  const seenPhones = new Set(); // deduplicate by phone within CSV

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    if (cols.length < 13) continue;

    const [, name, industry, phone, city, address, rating, source, offerSent] = cols;

    if (offerSent?.toLowerCase() === 'yes') continue;
    if (seenPhones.has(phone)) continue; // skip duplicate phone rows
    if (industryFilter && industry.toLowerCase() !== industryFilter.toLowerCase()) continue;
    if (cityFilter && city.toLowerCase() !== cityFilter.toLowerCase()) continue;

    seenPhones.add(phone);
    leads.push({ name, industry: industry.toLowerCase(), phone, city, address, rating, source });
  }

  return leads;
}

// Minimal CSV line parser (handles quoted fields)
function parseCsvLine(line) {
  const cols = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; }
    else { cur += ch; }
  }
  cols.push(cur);
  return cols;
}
