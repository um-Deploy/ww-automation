const token = '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';
const store = '5n8r11-v5.myshopify.com';
const API = `https://${store}/admin/api/2024-10`;
const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };

async function get(path) {
  const r = await fetch(`${API}${path}`, { headers });
  return r.json();
}
async function post(path, body) {
  const r = await fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return r.json();
}
async function put(path, body) {
  const r = await fetch(`${API}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { _status: r.status }; }
}

async function main() {
  // Check shop details
  const shop = await get('/shop.json');
  console.log('🏪 Store Info:');
  console.log('  Name:', shop.shop?.name);
  console.log('  Domain:', shop.shop?.domain);
  console.log('  Currency:', shop.shop?.currency);
  console.log('  Country:', shop.shop?.country_name);
  console.log('  Email:', shop.shop?.email);

  // Check shipping zones
  console.log('\n📦 Checking shipping zones...');
  const shipping = await get('/shipping_zones.json');
  if (shipping.shipping_zones?.length > 0) {
    shipping.shipping_zones.forEach(z => {
      console.log(`  Zone: ${z.name}`);
      z.price_based_shipping_rates?.forEach(r => console.log(`    - ${r.name}: ${r.price}`));
    });
  } else {
    console.log('  No shipping zones found.');
  }

  // Add shipping zones for India if none exist
  if (!shipping.shipping_zones?.length) {
    console.log('\n🔵 Creating shipping zones...');
    const zone = await post('/shipping_zones.json', {
      shipping_zone: {
        name: 'India',
        countries: [{ code: 'IN' }],
        price_based_shipping_rates: [
          {
            name: 'Free Shipping (Above ₹999)',
            price: '0.00',
            min_order_subtotal: '999.00',
            max_order_subtotal: null
          },
          {
            name: 'Standard Shipping',
            price: '99.00',
            min_order_subtotal: '0.00',
            max_order_subtotal: '998.99'
          },
          {
            name: 'Express Shipping',
            price: '149.00'
          }
        ]
      }
    });
    if (zone.shipping_zone) console.log('✅ Shipping zone created:', zone.shipping_zone.name);
    else console.log('❌ Shipping:', JSON.stringify(zone.errors || zone));
  }

  // Check policies
  console.log('\n📜 Checking policies...');
  const policies = await get('/policies.json');
  if (policies.policies?.length > 0) {
    policies.policies.forEach(p => console.log(`  ✅ ${p.title}`));
  } else {
    console.log('  No policies found - set these in Shopify Admin > Settings > Policies');
  }

  // List all collections to confirm
  console.log('\n📂 Collections:');
  const cols = await get('/custom_collections.json?limit=50');
  cols.custom_collections?.forEach(c => {
    const hasImage = c.image ? '🖼️ ' : '  ';
    console.log(`  ${hasImage}${c.title} (${c.handle})`);
  });

  // List products count
  const products = await get('/products/count.json');
  console.log(`\n🛍️ Total products: ${products.count}`);

  console.log('\n✅ Store check complete!');
  console.log('\n📌 ONE MANUAL STEP REQUIRED:');
  console.log('   Change store name to "SRK Jewells" at:');
  console.log('   https://5n8r11-v5.myshopify.com/admin/settings/general');
}

main().catch(console.error);
