const token = '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';
const store = '5n8r11-v5.myshopify.com';
const API = `https://${store}/admin/api/2024-10`;
const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };

async function graphql(query) {
  const r = await fetch(`${API}/graphql.json`, {
    method: 'POST', headers, body: JSON.stringify({ query })
  });
  return r.json();
}

async function post(path, body) {
  const r = await fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return r.json();
}

// Fix Contact page (handle already taken - use PUT to create with different handle or update existing)
async function fixContactPage() {
  // Get existing pages to find contact
  const r = await fetch(`${API}/pages.json?handle=contact`, { headers });
  const data = await r.json();

  if (data.pages && data.pages.length > 0) {
    const pageId = data.pages[0].id;
    // Update existing contact page
    const res = await fetch(`${API}/pages/${pageId}.json`, {
      method: 'PUT', headers,
      body: JSON.stringify({ page: {
        id: pageId,
        title: 'Contact Us',
        body_html: `<h2>We'd Love to Hear From You</h2>
<p>Our customer care team is available <strong>Monday to Saturday, 10 AM – 7 PM IST</strong>.</p>
<h3>Get in Touch</h3>
<ul>
  <li>📧 <strong>Email:</strong> <a href="mailto:support@yourbrand.com">support@yourbrand.com</a></li>
  <li>💬 <strong>WhatsApp:</strong> +91 98765 43210</li>
  <li>📸 <strong>Instagram:</strong> @yourbrand</li>
</ul>
<p>We typically respond within 24 hours on business days.</p>`
      }})
    });
    const result = await res.json();
    console.log(result.page ? '✅ Contact page updated' : '❌ Contact: ' + JSON.stringify(result));
  } else {
    // Create with different handle
    const res = await post('/pages.json', { page: {
      title: 'Contact Us', handle: 'contact-us', published: true,
      body_html: `<h2>We'd Love to Hear From You</h2>
<p>Our team is available Monday to Saturday, 10 AM – 7 PM IST.</p>
<ul>
  <li>📧 Email: support@yourbrand.com</li>
  <li>💬 WhatsApp: +91 98765 43210</li>
</ul>`
    }});
    console.log(res.page ? '✅ Contact Us page created' : '❌ ' + JSON.stringify(res));
  }
}

// Correct menuCreate format - no 'input' wrapper
async function createMenu(title, handle, items) {
  const itemsStr = items.map(i => `{ title: "${i.title}", url: "${i.url}" }`).join(',\n        ');
  const mutation = `mutation {
    menuCreate(
      title: "${title}"
      handle: "${handle}"
      items: [${itemsStr}]
    ) {
      menu { id title handle }
      userErrors { field message }
    }
  }`;
  const res = await graphql(mutation);
  if (res.data?.menuCreate?.menu) {
    console.log(`✅ Menu: ${title}`);
  } else {
    // Try REST API fallback for menus
    console.log(`⚠️  GraphQL failed for ${title}, trying REST...`);
    const restRes = await post('/menus.json', {
      menu: { title, handle, items: items.map(i => ({ title: i.title, url: i.url, type: 'http' })) }
    });
    if (restRes.menu) console.log(`✅ Menu via REST: ${title}`);
    else console.log(`❌ Menu ${title}:`, JSON.stringify(res.errors || res));
  }
}

async function main() {
  console.log('🔵 Fixing Contact page...');
  await fixContactPage();

  console.log('\n🔵 Creating Navigation Menus...');

  await createMenu('Main Menu', 'main-menu', [
    { title: 'New Arrivals', url: '/collections/new-arrivals' },
    { title: 'Rings', url: '/collections/rings' },
    { title: 'Earrings', url: '/collections/earrings' },
    { title: 'Necklaces', url: '/collections/necklaces' },
    { title: 'Bracelets', url: '/collections/bracelets' },
    { title: 'Pendants', url: '/collections/pendants' },
    { title: 'Bestsellers', url: '/collections/bestsellers' },
    { title: 'Gifting', url: '/collections/gifting' }
  ]);

  await createMenu('Footer Shop', 'footer-shop', [
    { title: 'New Arrivals', url: '/collections/new-arrivals' },
    { title: 'Rings', url: '/collections/rings' },
    { title: 'Earrings', url: '/collections/earrings' },
    { title: 'Necklaces', url: '/collections/necklaces' },
    { title: 'Bracelets', url: '/collections/bracelets' },
    { title: 'Bestsellers', url: '/collections/bestsellers' }
  ]);

  await createMenu('Footer Help', 'footer-help', [
    { title: 'FAQ', url: '/pages/faq' },
    { title: 'Shipping & Returns', url: '/pages/shipping-returns' },
    { title: 'Contact Us', url: '/pages/contact' },
    { title: 'Track Your Order', url: '/pages/contact' }
  ]);

  await createMenu('Footer Company', 'footer-company', [
    { title: 'About Us', url: '/pages/about-us' },
    { title: 'Blog', url: '/blogs/news' },
    { title: 'Privacy Policy', url: '/policies/privacy-policy' },
    { title: 'Terms of Service', url: '/policies/terms-of-service' },
    { title: 'Refund Policy', url: '/policies/refund-policy' }
  ]);

  console.log('\n✅ All done!');
}

main().catch(console.error);
