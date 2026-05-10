/**
 * Config loader — reads all JSON files from config/ and watches for changes.
 * The AI prompt is rebuilt automatically whenever you save a config file.
 * No server restart needed.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.resolve(__dirname, '../../config');

function readJSON(filename) {
  const filePath = path.join(CONFIG_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Loaded config — mutated in place on hot-reload
export const config = {
  business: readJSON('business.json'),
  products: readJSON('products.json'),
  faqs:     readJSON('faqs.json'),
  catalog:  readJSON('catalog.json'),
};

// Watch config directory and hot-reload on any .json change
fs.watch(CONFIG_DIR, (eventType, filename) => {
  if (!filename?.endsWith('.json')) return;
  const key = filename.replace('.json', '');
  if (!(key in config)) return;

  try {
    config[key] = readJSON(filename);
    console.log(`[Config] Hot-reloaded: ${filename}`);
  } catch (err) {
    console.warn(`[Config] Failed to reload ${filename}:`, err.message);
  }
});

console.log('[Config] Loaded: business, products, faqs, catalog');
