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
  return r.json();
}
async function post(path, body) {
  const r = await fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return r.json();
}

// 1. Update all product vendors
async function updateProductVendors() {
  console.log('\n🔵 Updating product vendors to SRK Jewells...');
  const data = await get('/products.json?limit=250');
  for (const p of data.products) {
    if (p.vendor !== 'SRK Jewells') {
      const res = await put(`/products/${p.id}.json`, { product: { id: p.id, vendor: 'SRK Jewells' } });
      console.log(res.product ? `  ✅ ${res.product.title}` : `  ❌ ${p.title}: ${JSON.stringify(res.errors)}`);
    } else {
      console.log(`  ✓ Already set: ${p.title}`);
    }
  }
}

// 2. Update pages with SRK Jewells branding
async function updatePages() {
  console.log('\n🔵 Updating pages with SRK Jewells branding...');
  const data = await get('/pages.json?limit=250');

  for (const page of data.pages) {
    let newBody = null;
    let newTitle = page.title;

    if (page.handle === 'about-us') {
      newBody = `
<div style="max-width:800px;margin:0 auto;">
  <h2 style="font-family:serif;color:#1A1A1A;">Our Story — Seth Radha Kishan Jewellers</h2>
  <p>For generations, the name <strong>SRK Jewells</strong> — Seth Radha Kishan Jewellers — has been synonymous with trust, purity, and timeless craftsmanship in Indian jewellery. What began as a humble workshop dedicated to the finest handcrafted silver and gold jewellery has grown into a beloved name worn by families across India.</p>
  <p>Inspired by India's rich heritage of jewellery-making and guided by the principle that every woman deserves jewellery that tells her story, we craft each piece with devotion and skill. From intricate temple-inspired designs to contemporary everyday wear, SRK Jewells bridges the old and the new.</p>
  <h2 style="font-family:serif;color:#1A1A1A;">Our Promise</h2>
  <ul>
    <li><strong>BIS Hallmarked Purity</strong> — Every piece certified 925 Sterling Silver or genuine Gold.</li>
    <li><strong>Master Craftsmanship</strong> — Handcrafted by skilled artisans with decades of experience.</li>
    <li><strong>Accessible Heritage</strong> — Fine jewellery at honest, transparent prices.</li>
    <li><strong>Customer First</strong> — 30-day returns, free shipping, and lifetime polishing guarantee.</li>
  </ul>
  <h2 style="font-family:serif;color:#1A1A1A;">Rooted in Tradition, Designed for Today</h2>
  <p>At SRK Jewells, we believe jewellery is not just an accessory — it is an emotion. Whether it's a pair of jhumkas passed down through generations or a delicate pendant for a modern woman, each piece carries the warmth of our heritage and the precision of contemporary design.</p>
  <p>Follow us on Instagram <a href="https://www.instagram.com/srk.jeweller/" target="_blank">@srk.jeweller</a> to see our latest collections and the stories behind every piece.</p>
</div>`;
    }

    if (page.handle === 'contact' || page.handle === 'contact-us') {
      newTitle = 'Contact Us';
      newBody = `
<div style="max-width:700px;margin:0 auto;">
  <h2 style="font-family:serif;color:#1A1A1A;">We'd Love to Hear From You</h2>
  <p>At <strong>SRK Jewells</strong>, your satisfaction is our joy. Our customer care team is available <strong>Monday to Saturday, 10 AM – 7 PM IST</strong>.</p>
  <h3>Get in Touch</h3>
  <ul>
    <li>📧 <strong>Email:</strong> <a href="mailto:support@srkjewells.com">support@srkjewells.com</a></li>
    <li>💬 <strong>WhatsApp:</strong> +91 98765 43210</li>
    <li>📸 <strong>Instagram:</strong> <a href="https://www.instagram.com/srk.jeweller/" target="_blank">@srk.jeweller</a></li>
  </ul>
  <p>We typically respond within 24 hours on business days. For urgent queries, WhatsApp is the fastest way to reach us.</p>
  <p><em>SRK Jewells — Seth Radha Kishan Jewellers</em></p>
</div>`;
    }

    if (page.handle === 'faq') {
      newBody = `
<div style="max-width:800px;margin:0 auto;">
  <h2 style="font-family:serif;color:#1A1A1A;">Frequently Asked Questions</h2>
  <h3>What materials does SRK Jewells use?</h3>
  <p>All our jewellery is crafted from certified <strong>925 Sterling Silver</strong> or genuine Gold. Every piece is BIS Hallmarked, guaranteeing the highest purity and quality standards.</p>
  <h3>Are SRK Jewells pieces genuine?</h3>
  <p>Absolutely. Seth Radha Kishan Jewellers has built its reputation on authenticity. Every piece comes with a BIS Hallmark certification card confirming its purity.</p>
  <h3>How do I care for my jewellery?</h3>
  <p>Store in a cool, dry place away from perfumes and lotions. Clean gently with a soft cloth. Avoid contact with water while wearing. We offer free lifetime polishing on all SRK Jewells pieces.</p>
  <h3>What is your return policy?</h3>
  <p>We offer <strong>30-day hassle-free returns and exchanges</strong>. Items must be in original, unworn condition with all packaging intact. Customised or engraved items cannot be returned.</p>
  <h3>How long does delivery take?</h3>
  <p>Standard delivery: 3–7 business days. Express delivery (1–3 days) available at checkout for select pincodes.</p>
  <h3>Do you offer gift wrapping?</h3>
  <p>Yes! All orders come in our signature SRK Jewells gift-ready packaging — perfect for gifting. Add a personalised message at checkout.</p>
  <h3>How do I find my ring size?</h3>
  <p>Measure the inside diameter of a ring that fits you and match it to our size chart on each product page. Contact us on WhatsApp for a free ring sizer sent to your door.</p>
  <h3>Is my payment secure?</h3>
  <p>Absolutely. We use industry-standard SSL encryption and support UPI, cards, net banking, and easy EMI options.</p>
  <h3>How can I reach SRK Jewells?</h3>
  <p>Email us at <a href="mailto:support@srkjewells.com">support@srkjewells.com</a> or WhatsApp at +91 98765 43210. Follow us on Instagram <a href="https://www.instagram.com/srk.jeweller/" target="_blank">@srk.jeweller</a>.</p>
</div>`;
    }

    if (page.handle === 'shipping-returns') {
      newBody = `
<div style="max-width:800px;margin:0 auto;">
  <h2 style="font-family:serif;color:#1A1A1A;">Shipping Policy</h2>
  <p><strong>Free Standard Shipping</strong> on all orders above ₹999 within India — a promise from SRK Jewells to you.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr style="background:#F3EDE3;"><th style="padding:10px;text-align:left;border:1px solid #ddd;">Delivery Type</th><th style="padding:10px;text-align:left;border:1px solid #ddd;">Timeline</th><th style="padding:10px;text-align:left;border:1px solid #ddd;">Cost</th></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;">Standard Delivery</td><td style="padding:10px;border:1px solid #ddd;">3–7 business days</td><td style="padding:10px;border:1px solid #ddd;">Free above ₹999</td></tr>
    <tr><td style="padding:10px;border:1px solid #ddd;">Express Delivery</td><td style="padding:10px;border:1px solid #ddd;">1–3 business days</td><td style="padding:10px;border:1px solid #ddd;">₹99</td></tr>
  </table>
  <p>You'll receive an email and SMS with tracking details once your SRK Jewells order ships.</p>
  <h2 style="font-family:serif;color:#1A1A1A;">Returns &amp; Exchanges</h2>
  <p>We want you to love your jewellery. Return or exchange within <strong>30 days</strong> of delivery — no questions asked.</p>
  <h3>Conditions</h3>
  <ul>
    <li>Item must be in original, unworn condition</li>
    <li>Original SRK Jewells packaging and tags must be intact</li>
    <li>Customised or engraved items cannot be returned</li>
  </ul>
  <h3>How to Return</h3>
  <p>Email <a href="mailto:support@srkjewells.com">support@srkjewells.com</a> or WhatsApp <strong>+91 98765 43210</strong>. We'll arrange free pickup within 24 hours.</p>
</div>`;
    }

    if (newBody) {
      const res = await put(`/pages/${page.id}.json`, { page: { id: page.id, title: newTitle, body_html: newBody } });
      console.log(res.page ? `  ✅ Updated: ${res.page.title}` : `  ❌ ${page.title}: ${JSON.stringify(res.errors)}`);
    }
  }
}

async function main() {
  await updateProductVendors();
  await updatePages();
  console.log('\n✅ Branding update complete!');
}

main().catch(console.error);
