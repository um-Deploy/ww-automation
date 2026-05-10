import https from 'https';
import http from 'http';

const token = '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';
const store = '5n8r11-v5.myshopify.com';
const themeId = '161177698361';
const API = `https://${store}/admin/api/2024-10`;
const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

async function uploadThemeAsset(key, base64Data, contentType) {
  const r = await fetch(`${API}/themes/${themeId}/assets.json`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      asset: {
        key,
        attachment: base64Data,
        content_type: contentType
      }
    })
  });
  const data = await r.json();
  if (data.asset) {
    console.log(`✅ Uploaded asset: ${key}`);
    console.log(`   Public URL: https://cdn.shopify.com/... (theme CDN)`);
    return data.asset;
  } else {
    console.log(`❌ Failed: ${JSON.stringify(data)}`);
    return null;
  }
}

async function main() {
  console.log('🔵 Downloading and uploading hero banner images...\n');

  const images = [
    {
      url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&q=85',
      key: 'assets/srk-hero-banner.jpg',
      contentType: 'image/jpeg',
      name: 'Hero Banner - Jewelry'
    },
    {
      url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&q=85',
      key: 'assets/srk-brand-story.jpg',
      contentType: 'image/jpeg',
      name: 'Brand Story Image'
    }
  ];

  for (const img of images) {
    console.log(`📥 Downloading: ${img.name}...`);
    try {
      const buffer = await downloadImage(img.url);
      console.log(`   Size: ${(buffer.length / 1024).toFixed(1)}KB`);
      const base64 = buffer.toString('base64');
      await uploadThemeAsset(img.key, base64, img.contentType);
    } catch (e) {
      console.log(`❌ Error: ${e.message}`);
    }
    console.log('');
  }

  console.log('✅ Done! Hero images available in theme assets.');
  console.log('   To use them as hero banner, set in Theme Editor:');
  console.log('   https://5n8r11-v5.myshopify.com/admin/themes/161177698361/editor');
}

main().catch(console.error);
