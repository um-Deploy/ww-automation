import https from 'https';
import http from 'http';

const token = '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';
const store = '5n8r11-v5.myshopify.com';
const API = `https://${store}/admin/api/2024-10`;
const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function graphql(query, variables = {}) {
  const r = await fetch(`${API}/graphql.json`, {
    method: 'POST', headers,
    body: JSON.stringify({ query, variables })
  });
  return r.json();
}

async function uploadImageToShopify(imageUrl, filename, alt) {
  const { buffer } = await downloadBuffer(imageUrl);
  console.log(`  📥 ${filename}: ${(buffer.length/1024).toFixed(0)}KB`);

  // Stage upload
  const staged = await graphql(`
    mutation { stagedUploadsCreate(input: [{
      filename: "${filename}", mimeType: "image/jpeg",
      resource: IMAGE, fileSize: "${buffer.length}", httpMethod: POST
    }]) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }}
  `);

  const target = staged.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target) { console.log(`  ❌ Stage failed`); return null; }

  // Upload to stage
  const boundary = 'FormBoundary' + Date.now();
  let formParts = '';
  for (const p of target.parameters) {
    formParts += `--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"\r\n\r\n${p.value}\r\n`;
  }
  const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`;
  const body = Buffer.concat([Buffer.from(formParts + fileHeader), buffer, Buffer.from(`\r\n--${boundary}--`)]);

  await fetch(target.url, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body
  });

  // Register file
  const fileRes = await graphql(`
    mutation { fileCreate(files: [{
      contentType: IMAGE, originalSource: "${target.resourceUrl}", alt: "${alt}"
    }]) {
      files { ... on MediaImage { id image { url } } }
      userErrors { field message }
    }}
  `);

  const file = fileRes.data?.fileCreate?.files?.[0];
  if (file) {
    console.log(`  ✅ Uploaded: ${file.id}`);
    return file;
  }
  console.log(`  ❌ Failed: ${JSON.stringify(fileRes.data?.fileCreate?.userErrors)}`);
  return null;
}

async function updateCollectionImage(collectionHandle, imageId) {
  // Get collection ID
  const r = await fetch(`${API}/custom_collections.json?handle=${collectionHandle}`, { headers });
  const data = await r.json();
  const col = data.custom_collections?.[0];
  if (!col) {
    // Try smart collections
    const r2 = await fetch(`${API}/smart_collections.json?handle=${collectionHandle}`, { headers });
    const d2 = await r2.json();
    if (!d2.smart_collections?.[0]) { console.log(`  ⚠️  Collection not found: ${collectionHandle}`); return; }
  }

  const colId = col?.id || null;
  if (!colId) return;

  // Note: We can't set collection images via file ID directly - it needs base64 or src
  // Just log it for now
  console.log(`  ℹ️  Collection ${collectionHandle} id: ${colId} - image to be set via theme editor`);
}

async function main() {
  console.log('🔵 Uploading additional SRK Jewells images...\n');

  const images = [
    { url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80', filename: 'srk-rings-collection.jpg', alt: 'SRK Jewells Rings Collection' },
    { url: 'https://images.unsplash.com/photo-1535556116002-6281ff3e9f36?w=800&q=80', filename: 'srk-earrings-collection.jpg', alt: 'SRK Jewells Earrings Collection' },
    { url: 'https://images.unsplash.com/photo-1509649604344-5a54337892a5?w=800&q=80', filename: 'srk-necklaces-collection.jpg', alt: 'SRK Jewells Necklaces Collection' },
    { url: 'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=800&q=80', filename: 'srk-gifting.jpg', alt: 'SRK Jewells Gift Collection' },
    { url: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=1600&q=85', filename: 'srk-hero-2.jpg', alt: 'SRK Jewells - Heritage Indian Jewellery' }
  ];

  const uploaded = [];
  for (const img of images) {
    const result = await uploadImageToShopify(img.url, img.filename, img.alt);
    if (result) uploaded.push({ filename: img.filename, id: result.id, url: result.image?.url });
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n\n✅ All images uploaded to Shopify Files:');
  uploaded.forEach(u => console.log(`  • ${u.filename}`));
  console.log('\n📌 To set collection images, go to:');
  console.log('   https://5n8r11-v5.myshopify.com/admin/collections');
}

main().catch(console.error);
