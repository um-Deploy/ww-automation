import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH    = path.join(__dirname, '../../../data/followup_sent.json');
export const MEDIA_DIR = path.join(__dirname, '../../../lead-scraper/media');

// ── Follow-up sent tracker ────────────────────────────────────────────────────

function load() {
  try { return new Set(JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))); }
  catch { return new Set(); }
}
function save(set) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify([...set], null, 2));
}

let _cache = null;
function cache() { if (!_cache) _cache = load(); return _cache; }

export function isFollowUpSent(phone) { return cache().has(phone); }
export function markFollowUpSent(phone) { cache().add(phone); save(cache()); }

// ── Read leads that were contacted but not yet followed up ────────────────────

export function getFollowUpTargets(industryFilter = null, cityFilter = null) {
  const CSV = path.join(__dirname, '../../../data/prospects.csv');
  if (!fs.existsSync(CSV)) { console.warn('[FollowUp] No prospects.csv found.'); return []; }

  const lines = fs.readFileSync(CSV, 'utf8').trim().split('\n');
  const leads = [];

  for (const line of lines.slice(1)) {
    const cols = parseCsv(line);
    if (cols.length < 9) continue;
    const [, name, industry, phone, city,,,, offerSent] = cols;
    if (offerSent?.toLowerCase() !== 'yes') continue;       // only already-contacted
    if (isFollowUpSent(phone)) continue;
    if (industryFilter && industry.toLowerCase() !== industryFilter.toLowerCase()) continue;
    if (cityFilter && city.toLowerCase() !== cityFilter.toLowerCase()) continue;
    leads.push({ name, industry: industry.toLowerCase(), phone, city });
  }
  return leads;
}

// ── Get all media files from media/ folder ────────────────────────────────────

export function getMediaFiles() {
  if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    return [];
  }
  return fs.readdirSync(MEDIA_DIR)
    .filter(f => /\.(jpg|jpeg|png|mp4|pdf|gif|webp)$/i.test(f))
    .map(f => path.join(MEDIA_DIR, f));
}

function parseCsv(line) {
  const cols = []; let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
    else cur += ch;
  }
  cols.push(cur);
  return cols;
}
