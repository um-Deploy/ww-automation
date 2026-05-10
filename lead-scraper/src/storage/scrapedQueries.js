import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '../../../data/scraped_queries.json');

function today() {
  return new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
}

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return {}; }
}

function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function wasScrapedToday(query, city) {
  const db  = load();
  const key = `${query}__${city}`;
  return db[key] === today();
}

export function markScraped(query, city) {
  const db  = load();
  db[`${query}__${city}`] = today();
  save(db);
}
