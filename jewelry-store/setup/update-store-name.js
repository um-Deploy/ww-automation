const token = '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';
const store = '5n8r11-v5.myshopify.com';
const API = `https://${store}/admin/api/2024-10`;
const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };

async function get(path) {
  const r = await fetch(`${API}${path}`, { headers });
  return r.json();
}
async function put(path, body) {
  const r = await fetch(`${API}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { _raw: text, _status: r.status }; }
}

async function main() {
  // Get current shop info
  const shop = await get('/shop.json');
  console.log('Current name:', shop.shop?.name);

  // Update shop name
  const res = await put('/shop.json', { shop: { name: 'SRK Jewells' } });
  if (res.shop) {
    console.log('✅ Store name updated to:', res.shop.name);
    console.log('   Domain:', res.shop.domain);
    console.log('   Email:', res.shop.email);
  } else {
    console.log('❌ Could not update store name (may require admin panel)');
    console.log('   Response:', JSON.stringify(res));
  }

  // List current menus to check status
  console.log('\n🔵 Checking menus via GraphQL...');
  const menuQuery = `{ menus(first: 10) { edges { node { id title handle } } } }`;
  const menuRes = await fetch(`${API}/graphql.json`, {
    method: 'POST', headers,
    body: JSON.stringify({ query: menuQuery })
  });
  const menuData = await menuRes.json();
  if (menuData.data?.menus?.edges) {
    console.log('Existing menus:');
    menuData.data.menus.edges.forEach(e => console.log(`  - ${e.node.title} (${e.node.handle})`));
  } else {
    console.log('Menu check:', JSON.stringify(menuData).substring(0, 300));
  }
}

main().catch(console.error);
