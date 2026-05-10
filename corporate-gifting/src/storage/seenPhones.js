import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../../../data/gifting_seen_phones.json');

function load() {
  try { return new Set(JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))); }
  catch { return new Set(); }
}

function save(set) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify([...set], null, 2));
}

let _cache = null;
function cache() {
  if (!_cache) _cache = load();
  return _cache;
}

export function isAlreadyContacted(phone) { return cache().has(phone); }

export function markContacted(phone) {
  cache().add(phone);
  save(cache());
}

export function totalContacted() { return cache().size; }
