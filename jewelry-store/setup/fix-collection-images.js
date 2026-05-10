import https from 'https';
import http from 'http';

const token = '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';
const store = '5n8r11-v5.myshopify.com';
const API = `https://${store}/admin/api/2024-10`;
const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };

function downloadBase64(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBase64(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function get(path) {
  const r = await fetch(`${API}${path}`, { headers });
  return r.json();
}
async function put(path, body) {
  const r = await fetch(`${API}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
  return r.json();
}

async function setCollectionImage(handle, imageUrl) {
  let colData = await get(`/custom_collections.json?handle=${handle}`);
  let col = colData.custom_collections?.[0];
  let type = 'custom_collections';
  if (!col) {
    const sd = await get(`/smart_collections.json?handle=${handle}`);
    col = sd.smart_collections?.[0];
    type = 'smart_collections';
  }
  if (!col) { console.log(`  ⚠️  Not found: ${handle}`); return; }

  console.log(`  📥 ${handle}...`);
  const attachment = await downloadBase64(imageUrl);
  console.log(`     size: ${(attachment.length * 0.75 / 1024).toFixed(0)}KB`);

  const key = type === 'custom_collections' ? 'custom_collection' : 'smart_collection';
  const res = await put(`/${type}/${col.id}.json`, {
    [key]: { id: col.id, image: { attachment } }
  });

  const updated = res[key];
  if (updated?.image) console.log(`  ✅ ${handle}: done`);
  else console.log(`  ❌ ${handle}: ${JSON.stringify(res.errors || res).substring(0, 120)}`);
}

async function main() {
  // Use images that definitely have a JPEG extension in the source
  // Using direct Unsplash photo IDs with format=jpg parameter
  const fixes = {
    'necklaces': 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80&fm=jpg&fit=crop',
    'bracelets': 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80&fm=jpg&fit=crop',
    'gifting': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80&fm=jpg&fit=crop'
  };

  // Try fetching directly from the CDN URLs we already uploaded
  const cdnFixes = {
    'necklaces': 'https://cdn.shopify.com/s/files/1/0793/4587/7049/t/2/assets/srk-hero-banner.jpg',
    'bracelets': 'https://cdn.shopify.com/s/files/1/0793/4587/7049/t/2/assets/srk-brand-story.jpg',
    'gifting': 'https://cdn.shopify.com/s/files/1/0793/4587/7049/files/srk-gifting.jpg'
  };

  console.log('🔵 Fixing remaining collection images...\n');
  for (const [handle, url] of Object.entries(cdnFixes)) {
    await setCollectionImage(handle, url);
    await new Promise(r => setTimeout(r, 800));
  }
  console.log('\n✅ Done!');
}

main().catch(console.error);
