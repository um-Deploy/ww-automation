import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../../../data/gifting_scraped_queries.json');

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return {}; }
}

function save(data) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function wasScrapedToday(keyword, city) {
  const data = load();
  const key = `${todayKey()}::${keyword}::${city}`;
  return !!data[key];
}

export function markScraped(keyword, city) {
  const data = load();
  const key = `${todayKey()}::${keyword}::${city}`;
  data[key] = true;
  save(data);
}
