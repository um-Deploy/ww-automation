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

// Collection handle -> Unsplash image URL
const collectionImages = {
  'rings': 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80',
  'earrings': 'https://images.unsplash.com/photo-1535556116002-6281ff3e9f36?w=800&q=80',
  'necklaces': 'https://images.unsplash.com/photo-1509649604344-5a54337892a5?w=800&q=80',
  'bracelets': 'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=800&q=80',
  'pendants': 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80',
  'new-arrivals': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80',
  'bestsellers': 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80',
  'gifting': 'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=800&q=80',
  'wedding': 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80',
  'everyday-wear': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
  'chains': 'https://images.unsplash.com/photo-1598560917807-1bae44bd2be8?w=800&q=80'
};

async function setCollectionImage(handle, imageUrl) {
  // Get collection
  let colData = await get(`/custom_collections.json?handle=${handle}`);
  let col = colData.custom_collections?.[0];
  let type = 'custom_collections';

  if (!col) {
    const sd = await get(`/smart_collections.json?handle=${handle}`);
    col = sd.smart_collections?.[0];
    type = 'smart_collections';
  }

  if (!col) { console.log(`  ⚠️  Not found: ${handle}`); return; }

  console.log(`  📥 Downloading image for ${handle}...`);
  const attachment = await downloadBase64(imageUrl);

  const res = await put(`/${type}/${col.id}.json`, {
    [type === 'custom_collections' ? 'custom_collection' : 'smart_collection']: {
      id: col.id,
      image: { attachment }
    }
  });

  const updated = res.custom_collection || res.smart_collection;
  if (updated?.image) {
    console.log(`  ✅ ${handle}: image set`);
  } else {
    console.log(`  ❌ ${handle}: ${JSON.stringify(res.errors || res).substring(0, 100)}`);
  }
}

async function main() {
  console.log('🔵 Setting collection images for SRK Jewells...\n');
  for (const [handle, url] of Object.entries(collectionImages)) {
    await setCollectionImage(handle, url);
    await new Promise(r => setTimeout(r, 800));
  }
  console.log('\n✅ Collection images done!');
}

main().catch(console.error);
