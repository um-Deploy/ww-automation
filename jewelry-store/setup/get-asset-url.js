const token = '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';
const store = '5n8r11-v5.myshopify.com';
const themeId = '161177698361';
const API = `https://${store}/admin/api/2024-10`;
const headers = { 'X-Shopify-Access-Token': token };

async function main() {
  const r = await fetch(`${API}/themes/${themeId}/assets.json?asset[key]=assets/srk-hero-banner.jpg`, { headers });
  const d = await r.json();
  console.log('Hero Banner asset:', JSON.stringify(d.asset, null, 2));

  const r2 = await fetch(`${API}/themes/${themeId}/assets.json?asset[key]=assets/srk-brand-story.jpg`, { headers });
  const d2 = await r2.json();
  console.log('\nBrand Story asset:', JSON.stringify(d2.asset, null, 2));
}

main().catch(console.error);
