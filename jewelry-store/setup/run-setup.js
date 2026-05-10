const token = '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';
const store = '5n8r11-v5.myshopify.com';
const themeId = '161177698361';
const API = `https://${store}/admin/api/2024-10`;

const headers = {
  'X-Shopify-Access-Token': token,
  'Content-Type': 'application/json'
};

async function post(path, body) {
  const r = await fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return r.json();
}
async function put(path, body) {
  const r = await fetch(`${API}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
  return r.json();
}
async function get(path) {
  const r = await fetch(`${API}${path}`, { headers });
  return r.json();
}

async function createCollection(title, handle, description) {
  const res = await post('/custom_collections.json', {
    custom_collection: { title, handle, body_html: description, published: true }
  });
  if (res.custom_collection) console.log(`✅ Collection: ${title}`);
  else console.log(`❌ Collection ${title}:`, JSON.stringify(res.errors));
  return res.custom_collection;
}

async function createPage(title, handle, body_html) {
  const res = await post('/pages.json', {
    page: { title, handle, body_html, published: true }
  });
  if (res.page) console.log(`✅ Page: ${title}`);
  else console.log(`❌ Page ${title}:`, JSON.stringify(res.errors));
}

async function createMenu(title, handle, items) {
  // Use GraphQL for menus
  const mutation = `mutation {
    menuCreate(input: {
      title: "${title}"
      handle: "${handle}"
      items: [${items.map(i => `{ title: "${i.title}", url: "${i.url}" }`).join(',')}]
    }) {
      menu { id title handle }
      userErrors { field message }
    }
  }`;
  const r = await fetch(`${API}/graphql.json`, {
    method: 'POST', headers,
    body: JSON.stringify({ query: mutation })
  });
  const res = await r.json();
  if (res.data?.menuCreate?.menu) console.log(`✅ Menu: ${title}`);
  else console.log(`❌ Menu ${title}:`, JSON.stringify(res));
}

async function publishTheme() {
  const res = await put(`/themes/${themeId}.json`, { theme: { id: themeId, role: 'main' } });
  if (res.theme) console.log(`✅ Theme published: ${res.theme.name}`);
  else console.log(`❌ Theme publish:`, JSON.stringify(res));
}

async function main() {
  console.log('\n🔵 Creating Collections...');
  await createCollection('Rings', 'rings', '<p>Explore our stunning collection of rings — from delicate stackable bands to bold statement pieces, all crafted in 925 Sterling Silver and Gold.</p>');
  await createCollection('Earrings', 'earrings', '<p>From everyday studs to elegant drops and jhumkas — find the perfect earrings for every occasion and every outfit.</p>');
  await createCollection('Necklaces', 'necklaces', '<p>Timeless necklaces crafted in sterling silver and gold — delicate chains, statement pieces, and everything in between.</p>');
  await createCollection('Bracelets', 'bracelets', '<p>Stack them up or wear alone — our bracelets are designed for every wrist and every style.</p>');
  await createCollection('Pendants', 'pendants', '<p>Meaningful pendants in silver and gold. Perfect for gifting or treating yourself to something special.</p>');
  await createCollection('Chains', 'chains', '<p>Versatile chains to wear alone or layer with your favourite pendants and lockets.</p>');
  await createCollection('New Arrivals', 'new-arrivals', '<p>Be the first to shop our latest designs, freshly crafted and just dropped.</p>');
  await createCollection('Bestsellers', 'bestsellers', '<p>Our most-loved pieces, chosen by thousands of happy customers across India.</p>');
  await createCollection('Gifting', 'gifting', '<p>Thoughtfully crafted jewellery for birthdays, anniversaries, and every special occasion in life.</p>');
  await createCollection('Wedding Collection', 'wedding', '<p>Bridal sets, engagement rings, and wedding jewellery crafted for your most important day.</p>');
  await createCollection('Everyday Wear', 'everyday-wear', '<p>Lightweight, comfortable, and beautiful jewellery designed to be worn every single day.</p>');

  console.log('\n🔵 Creating Pages...');
  await createPage('About Us', 'about-us', `
    <h2>Our Story</h2>
    <p>We believe that beautiful jewellery should be accessible to everyone. Founded with a passion for craftsmanship and an eye for elegance, our brand was born from the desire to create pieces that tell your story.</p>
    <p>Every piece in our collection is thoughtfully designed, ethically sourced, and handcrafted by skilled artisans using certified 925 Sterling Silver and genuine Gold. We are BIS Hallmark certified, ensuring the highest standards of purity and quality.</p>
    <h2>Our Values</h2>
    <ul>
      <li><strong>Quality First</strong> — Every piece is BIS Hallmarked and made with certified materials.</li>
      <li><strong>Ethical Sourcing</strong> — We responsibly source all our gemstones and metals.</li>
      <li><strong>Accessible Luxury</strong> — Fine jewellery at honest, transparent prices.</li>
      <li><strong>Customer Love</strong> — 30-day returns, free shipping, and lifetime polishing.</li>
    </ul>
  `);

  await createPage('FAQ', 'faq', `
    <h2>Frequently Asked Questions</h2>
    <h3>What materials do you use?</h3>
    <p>All our jewellery is crafted from certified 925 Sterling Silver or genuine Gold. Every piece is BIS Hallmarked, guaranteeing purity and quality.</p>
    <h3>How do I care for my jewellery?</h3>
    <p>Store in a cool, dry place away from perfumes and lotions. Clean gently with a soft cloth. Avoid contact with water while wearing.</p>
    <h3>What is your return policy?</h3>
    <p>We offer 30-day hassle-free returns and exchanges. Items must be in original, unworn condition with all packaging intact.</p>
    <h3>How long does delivery take?</h3>
    <p>Standard delivery: 3–7 business days. Express delivery (1–3 days) available at checkout for select pincodes.</p>
    <h3>Do you offer gift wrapping?</h3>
    <p>Yes! All orders come in our signature gift-ready packaging. Add a personalised message at checkout.</p>
    <h3>How do I find my ring size?</h3>
    <p>Measure the inside diameter of a ring that fits you and match it to our size chart on each product page. Contact us for a free ring sizer.</p>
    <h3>Is my payment secure?</h3>
    <p>Absolutely. We use industry-standard SSL encryption and support UPI, cards, net banking, and EMI options.</p>
  `);

  await createPage('Shipping & Returns', 'shipping-returns', `
    <h2>Shipping Policy</h2>
    <p><strong>Free Standard Shipping</strong> on all orders above ₹999 within India.</p>
    <table>
      <tr><th>Delivery Type</th><th>Timeline</th><th>Cost</th></tr>
      <tr><td>Standard Delivery</td><td>3–7 business days</td><td>Free above ₹999</td></tr>
      <tr><td>Express Delivery</td><td>1–3 business days</td><td>₹99</td></tr>
    </table>
    <p>You'll receive an email with tracking details once your order ships.</p>
    <h2>Returns & Exchanges</h2>
    <p>We want you to love your jewellery. Return or exchange within <strong>30 days</strong> of delivery — no questions asked.</p>
    <h3>Conditions</h3>
    <ul>
      <li>Item must be in original, unworn condition</li>
      <li>Original packaging and tags must be intact</li>
      <li>Customised or engraved items cannot be returned</li>
    </ul>
    <h3>How to Return</h3>
    <p>Email <a href="mailto:support@yourbrand.com">support@yourbrand.com</a> or WhatsApp <strong>+91 98765 43210</strong>. We'll arrange free pickup within 24 hours.</p>
  `);

  await createPage('Contact Us', 'contact', `
    <h2>We'd Love to Hear From You</h2>
    <p>Our customer care team is available <strong>Monday to Saturday, 10 AM – 7 PM IST</strong>.</p>
    <h3>Get in Touch</h3>
    <ul>
      <li>📧 <strong>Email:</strong> <a href="mailto:support@yourbrand.com">support@yourbrand.com</a></li>
      <li>💬 <strong>WhatsApp:</strong> +91 98765 43210</li>
      <li>📸 <strong>Instagram:</strong> @yourbrand</li>
    </ul>
    <p>We typically respond within 24 hours on business days.</p>
  `);

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

  console.log('\n🔵 Publishing Theme...');
  await publishTheme();

  console.log('\n🎉 Store Setup Complete!');
  console.log('🌐 Preview: https://5n8r11-v5.myshopify.com');
}

main().catch(console.error);
