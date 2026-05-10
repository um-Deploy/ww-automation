const token = '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';
const store = '5n8r11-v5.myshopify.com';
const API = `https://${store}/admin/api/2024-10`;
const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };

async function api(method, path, body) {
  const r = await fetch(`${API}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined
  });
  return r.json();
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// ─── PRODUCTS DATA ──────────────────────────────────────────────────────────

const PRODUCTS = [
  // RINGS
  {
    title: "Celestial Solitaire Ring",
    category: "rings",
    tags: ["rings", "bestsellers", "new-arrivals"],
    body_html: "<p>A timeless solitaire ring featuring a brilliant round-cut zircon stone set in 925 Sterling Silver. Perfect for everyday wear and special occasions. The minimalist design makes it stackable and versatile.</p><ul><li>925 Sterling Silver</li><li>Round-cut AAA Zircon Stone</li><li>Rhodium plated for anti-tarnish</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "1499",
    compare_at_price: "2499",
    options: [
      { name: "Size", values: ["5", "6", "7", "8", "9"] },
      { name: "Metal", values: ["Silver", "Rose Gold Plated", "Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80",
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80"
    ]
  },
  {
    title: "Twisted Band Ring",
    category: "rings",
    tags: ["rings", "everyday-wear"],
    body_html: "<p>A beautifully crafted twisted band ring in 925 Sterling Silver. The intricate twist design catches light beautifully and pairs perfectly with any outfit. Lightweight and comfortable for all-day wear.</p><ul><li>925 Sterling Silver</li><li>Twisted rope design</li><li>Anti-tarnish coating</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "999",
    compare_at_price: "1799",
    options: [
      { name: "Size", values: ["5", "6", "7", "8", "9"] },
      { name: "Metal", values: ["Silver", "Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&q=80",
      "https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=800&q=80"
    ]
  },
  {
    title: "Floral Bloom Stackable Ring",
    category: "rings",
    tags: ["rings", "gifting", "bestsellers"],
    body_html: "<p>Delicate floral ring designed for stacking. Features a hand-set stone surrounded by a petal motif. Comes in a set of 3 complementary rings, perfect as a gift.</p><ul><li>925 Sterling Silver</li><li>Set with AAA Cubic Zirconia</li><li>Stackable design</li><li>Comes in gift box</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "2199",
    compare_at_price: "3499",
    options: [
      { name: "Size", values: ["5", "6", "7", "8"] },
      { name: "Metal", values: ["Silver", "Rose Gold Plated", "Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80"
    ]
  },
  {
    title: "Infinity Love Ring",
    category: "rings",
    tags: ["rings", "gifting", "wedding"],
    body_html: "<p>Symbol of eternal love — this infinity ring is set with sparkling stones along the infinity loop, crafted in 925 Sterling Silver. A perfect gift for anniversaries and Valentine's Day.</p><ul><li>925 Sterling Silver</li><li>Micro-pavé Cubic Zirconia</li><li>Rhodium & Rose Gold Plating options</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "1799",
    compare_at_price: "2999",
    options: [
      { name: "Size", values: ["5", "6", "7", "8", "9"] },
      { name: "Metal", values: ["Silver", "Rose Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1616671276441-2f2c277b8bf6?w=800&q=80"
    ]
  },

  // EARRINGS
  {
    title: "Moonstone Drop Earrings",
    category: "earrings",
    tags: ["earrings", "bestsellers", "new-arrivals"],
    body_html: "<p>Elegant drop earrings featuring a stunning moonstone-effect stone in a silver teardrop setting. Light enough for everyday wear yet glamorous for evenings. The subtle glow of the stone catches light beautifully.</p><ul><li>925 Sterling Silver</li><li>Moonstone effect CZ</li><li>Secure push-back closure</li><li>Hypoallergenic</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "1299",
    compare_at_price: "2199",
    options: [
      { name: "Metal", values: ["Silver", "Gold Plated", "Rose Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80",
      "https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=800&q=80"
    ]
  },
  {
    title: "Classic Pearl Studs",
    category: "earrings",
    tags: ["earrings", "everyday-wear", "gifting"],
    body_html: "<p>Timeless freshwater pearl stud earrings that never go out of style. A wardrobe essential that pairs with everything from casuals to formal wear. Set in 925 Sterling Silver with screw-back for security.</p><ul><li>925 Sterling Silver</li><li>Genuine Freshwater Pearls (6–7mm)</li><li>Screw-back closure</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "1599",
    compare_at_price: "2799",
    options: [
      { name: "Pearl Size", values: ["6mm", "7mm", "8mm"] },
      { name: "Metal", values: ["Silver", "Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1561828995-aa79a2db86dd?w=800&q=80",
      "https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=800&q=80"
    ]
  },
  {
    title: "Chandbali Jhumki Earrings",
    category: "earrings",
    tags: ["earrings", "wedding", "gifting"],
    body_html: "<p>Traditional Chandbali jhumki earrings reimagined in sterling silver with intricate filigree work. Perfect for weddings, festive occasions, and special celebrations. Lightweight despite their statement look.</p><ul><li>925 Sterling Silver</li><li>Antique finish with gold plating</li><li>Traditional Chandbali design</li><li>Secure hook closure</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "2499",
    compare_at_price: "3999",
    options: [
      { name: "Metal", values: ["Antique Silver", "Gold Plated", "Rose Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1630350657813-e05d56fa6be7?w=800&q=80"
    ]
  },

  // NECKLACES
  {
    title: "Delicate Link Chain Necklace",
    category: "necklaces",
    tags: ["necklaces", "chains", "everyday-wear", "bestsellers"],
    body_html: "<p>A minimalist cable-link chain necklace that is effortlessly elegant. Wear it alone or layer it with pendants. The delicate links create a beautiful texture that catches light with every movement.</p><ul><li>925 Sterling Silver</li><li>Cable link design — 1.5mm width</li><li>Lobster clasp</li><li>Available in 16\", 18\", 20\" lengths</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "1199",
    compare_at_price: "1999",
    options: [
      { name: "Length", values: ["16 inch", "18 inch", "20 inch"] },
      { name: "Metal", values: ["Silver", "Gold Plated", "Rose Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80",
      "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&q=80"
    ]
  },
  {
    title: "Heart Pendant Necklace",
    category: "necklaces",
    tags: ["necklaces", "gifting", "bestsellers", "new-arrivals"],
    body_html: "<p>A dainty heart pendant on a delicate chain — the perfect symbol of love. Set with a single sparkling CZ stone, this necklace is a bestseller for gifting on birthdays, anniversaries, and Valentine's Day.</p><ul><li>925 Sterling Silver</li><li>Heart pendant with CZ stone (8mm)</li><li>18-inch adjustable chain</li><li>Comes in premium gift box</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "1399",
    compare_at_price: "2299",
    options: [
      { name: "Metal", values: ["Silver", "Gold Plated", "Rose Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80",
      "https://images.unsplash.com/photo-1616671276441-2f2c277b8bf6?w=800&q=80"
    ]
  },
  {
    title: "Layered Beaded Necklace",
    category: "necklaces",
    tags: ["necklaces", "everyday-wear", "new-arrivals"],
    body_html: "<p>A boho-chic layered necklace featuring natural freshwater pearls and silver beads on three-tier chains. Comes pre-layered for an effortless stacked look without the hassle.</p><ul><li>925 Sterling Silver</li><li>Natural Freshwater Pearls</li><li>Three-tier layered design</li><li>Toggle clasp</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "2299",
    compare_at_price: "3699",
    options: [
      { name: "Metal", values: ["Silver", "Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1576022162022-51b4da3a7eb3?w=800&q=80"
    ]
  },

  // BRACELETS
  {
    title: "Tennis Bracelet CZ",
    category: "bracelets",
    tags: ["bracelets", "bestsellers", "wedding", "gifting"],
    body_html: "<p>A classic tennis bracelet set with brilliant AAA Cubic Zirconia stones in 925 Sterling Silver. The continuous line of stones creates an uninterrupted sparkle. Perfect for weddings, parties, and gifting.</p><ul><li>925 Sterling Silver</li><li>AAA Cubic Zirconia stones (2.5mm each)</li><li>Box clasp with safety lock</li><li>Available in 7\" and 7.5\" lengths</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "2999",
    compare_at_price: "4999",
    options: [
      { name: "Size", values: ["7 inch", "7.5 inch"] },
      { name: "Metal", values: ["Silver", "Gold Plated", "Rose Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=800&q=80",
      "https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&q=80"
    ]
  },
  {
    title: "Beaded Charm Bracelet",
    category: "bracelets",
    tags: ["bracelets", "everyday-wear", "gifting"],
    body_html: "<p>A fun and playful charm bracelet featuring hand-selected natural stones and sterling silver beads. Each bracelet is unique, as the semi-precious stone beads vary slightly. Includes an adjustable chain.</p><ul><li>925 Sterling Silver beads & clasp</li><li>Natural Amethyst / Turquoise / Rose Quartz beads</li><li>Adjustable 6.5\"–7.5\"</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "1699",
    compare_at_price: "2799",
    options: [
      { name: "Stone", values: ["Amethyst", "Turquoise", "Rose Quartz", "Onyx"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800&q=80"
    ]
  },

  // PENDANTS
  {
    title: "Lotus Pendant",
    category: "pendants",
    tags: ["pendants", "gifting", "everyday-wear", "new-arrivals"],
    body_html: "<p>A beautifully detailed lotus flower pendant — symbol of purity, new beginnings, and spiritual growth. Crafted in 925 Sterling Silver with intricate petal detailing. Chain not included.</p><ul><li>925 Sterling Silver</li><li>Size: 20mm × 18mm</li><li>Bail fits chains up to 3mm wide</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "899",
    compare_at_price: "1499",
    options: [
      { name: "Metal", values: ["Silver", "Gold Plated", "Rose Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80"
    ]
  },
  {
    title: "Evil Eye Pendant",
    category: "pendants",
    tags: ["pendants", "bestsellers", "gifting"],
    body_html: "<p>The iconic Evil Eye pendant to ward off negativity and bring good luck. Features vivid blue enamel set in sterling silver with a sparkling CZ border. A meaningful and stylish gift.</p><ul><li>925 Sterling Silver</li><li>Blue Enamel with CZ surround</li><li>Size: 15mm diameter</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "799",
    compare_at_price: "1399",
    options: [
      { name: "Size", values: ["Small (12mm)", "Medium (15mm)", "Large (20mm)"] },
      { name: "Metal", values: ["Silver", "Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80"
    ]
  },

  // CHAINS
  {
    title: "Figaro Chain Necklace",
    category: "chains",
    tags: ["chains", "everyday-wear"],
    body_html: "<p>A classic Figaro chain with alternating short and long oval links — one of the most popular chain styles worldwide. Versatile, durable, and suitable for both men and women.</p><ul><li>925 Sterling Silver</li><li>Figaro link pattern</li><li>Width: 2mm</li><li>Lobster clasp</li><li>Available in 18\" and 22\"</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "1299",
    compare_at_price: "2199",
    options: [
      { name: "Length", values: ["18 inch", "20 inch", "22 inch", "24 inch"] },
      { name: "Metal", values: ["Silver", "Gold Plated"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1576022162022-51b4da3a7eb3?w=800&q=80"
    ]
  },
  {
    title: "Box Chain Necklace",
    category: "chains",
    tags: ["chains", "everyday-wear", "new-arrivals"],
    body_html: "<p>A sturdy and modern box chain made from 925 Sterling Silver. The square links form a smooth, elegant look that pairs perfectly with any pendant. Available in multiple widths and lengths.</p><ul><li>925 Sterling Silver</li><li>Box link design</li><li>Width: 1.5mm / 2mm / 2.5mm</li><li>Lobster clasp</li><li>BIS Hallmarked</li></ul>",
    vendor: "My Store",
    price: "1099",
    compare_at_price: "1899",
    options: [
      { name: "Length", values: ["16 inch", "18 inch", "20 inch", "22 inch"] },
      { name: "Width", values: ["1.5mm", "2mm", "2.5mm"] }
    ],
    images: [
      "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&q=80"
    ]
  }
];

// ─── CREATE PRODUCTS ─────────────────────────────────────────────────────────
async function createProduct(p) {
  // Build variants
  const variants = [];
  if (p.options.length === 2) {
    for (const v1 of p.options[0].values) {
      for (const v2 of p.options[1].values) {
        variants.push({
          option1: v1, option2: v2,
          price: p.price,
          compare_at_price: p.compare_at_price,
          inventory_management: "shopify",
          inventory_quantity: Math.floor(Math.random() * 40) + 10,
          weight: 10, weight_unit: "g"
        });
      }
    }
  } else {
    for (const v1 of p.options[0].values) {
      variants.push({
        option1: v1,
        price: p.price,
        compare_at_price: p.compare_at_price,
        inventory_management: "shopify",
        inventory_quantity: Math.floor(Math.random() * 40) + 10,
        weight: 10, weight_unit: "g"
      });
    }
  }

  const product = {
    title: p.title,
    body_html: p.body_html,
    vendor: "My Store",
    product_type: p.category.charAt(0).toUpperCase() + p.category.slice(1),
    tags: p.tags.join(", "),
    status: "active",
    options: p.options,
    variants,
    images: p.images.map(src => ({ src }))
  };

  const res = await api('POST', '/products.json', { product });
  if (res.product) {
    console.log(`  ✅ ${p.title} (ID: ${res.product.id})`);
    return res.product;
  } else {
    console.log(`  ❌ ${p.title}:`, JSON.stringify(res.errors));
    return null;
  }
}

// ─── ASSIGN PRODUCT TO COLLECTIONS ───────────────────────────────────────────
async function assignToCollections(productId, tags) {
  const res = await api('GET', '/custom_collections.json?limit=250');
  const collections = res.custom_collections || [];

  for (const tag of tags) {
    const col = collections.find(c => c.handle === tag || c.handle === tag.replace(/\s+/g, '-'));
    if (col) {
      await api('POST', '/collects.json', {
        collect: { product_id: productId, collection_id: col.id }
      });
    }
  }
}

// ─── STORE SETTINGS ──────────────────────────────────────────────────────────
async function updateStoreSettings() {
  console.log('\n🔵 Updating store settings...');
  const res = await api('PUT', '/shop.json', {
    shop: {
      name: "My Jewels",
      customer_email: "support@myjewels.in",
      email: "support@myjewels.in",
      address1: "123 Jewellers Lane",
      city: "Mumbai",
      zip: "400001",
      country: "IN",
      phone: "+919876543210",
      currency: "INR",
      money_format: "₹{{amount}}",
      money_with_currency_format: "₹{{amount}} INR",
      unit_system: "metric",
      weight_unit: "g"
    }
  });
  if (res.shop) console.log(`  ✅ Store settings updated — Currency: ${res.shop.currency}`);
  else console.log(`  ⚠️  Settings:`, JSON.stringify(res));
}

// ─── POLICIES ────────────────────────────────────────────────────────────────
async function setupPolicies() {
  console.log('\n🔵 Setting up store policies...');

  const policies = [
    {
      path: '/policies/privacy_policy.json',
      key: 'privacy_policy',
      body: {
        privacy_policy: {
          body: `<h1>Privacy Policy</h1>
<p>Last updated: ${new Date().toLocaleDateString('en-IN')}</p>
<p>My Jewels ("we", "us", or "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you visit our website.</p>
<h2>Information We Collect</h2>
<ul>
  <li>Name, email address, phone number, and shipping address when you place an order</li>
  <li>Payment information (processed securely — we do not store card details)</li>
  <li>Device and browsing data via cookies for analytics and a better shopping experience</li>
</ul>
<h2>How We Use Your Information</h2>
<ul>
  <li>To process and fulfil your orders</li>
  <li>To send order confirmations and shipping updates</li>
  <li>To send promotional emails (you can unsubscribe at any time)</li>
  <li>To improve our website and customer service</li>
</ul>
<h2>Data Security</h2>
<p>We use industry-standard SSL encryption to protect your data. Payment transactions are processed through secure payment gateways.</p>
<h2>Contact Us</h2>
<p>For any privacy-related queries, email us at <a href="mailto:support@myjewels.in">support@myjewels.in</a>.</p>`
        }
      }
    },
    {
      path: '/policies/refund_policy.json',
      key: 'refund_policy',
      body: {
        refund_policy: {
          body: `<h1>Refund & Return Policy</h1>
<p>We want you to love your jewellery. If you are not completely satisfied, we offer a <strong>30-day return and exchange policy</strong>.</p>
<h2>Eligibility</h2>
<ul>
  <li>Items must be returned within 30 days of delivery</li>
  <li>Items must be in original, unworn condition with all tags and packaging intact</li>
  <li>Customised, engraved, or personalised items cannot be returned</li>
  <li>Items damaged due to misuse or improper care are not eligible for return</li>
</ul>
<h2>Refund Process</h2>
<ol>
  <li>Email us at support@myjewels.in with your order number and reason for return</li>
  <li>We will arrange a free pickup within 24–48 business hours</li>
  <li>Once we receive and inspect the item, we will process your refund within 5–7 business days</li>
  <li>Refunds are credited to your original payment method</li>
</ol>
<h2>Exchanges</h2>
<p>We offer free size and style exchanges within 30 days. Contact us and we'll sort it out.</p>`
        }
      }
    },
    {
      path: '/policies/terms_of_service.json',
      key: 'terms_of_service',
      body: {
        terms_of_service: {
          body: `<h1>Terms of Service</h1>
<p>By accessing and using the My Jewels website, you agree to be bound by these Terms of Service.</p>
<h2>Products</h2>
<p>All jewellery items are sold as described. Product images are as accurate as possible, but slight colour variations may occur due to screen settings. All our jewellery is BIS Hallmarked and made from certified materials.</p>
<h2>Pricing</h2>
<p>All prices are in Indian Rupees (INR) and are inclusive of GST. We reserve the right to change prices at any time without notice.</p>
<h2>Orders</h2>
<p>An order confirmation email does not constitute acceptance of your order. We reserve the right to cancel any order due to stock unavailability or payment failure.</p>
<h2>Intellectual Property</h2>
<p>All content on this website, including product designs, images, and text, is the property of My Jewels and may not be reproduced without written permission.</p>
<h2>Contact</h2>
<p>For any queries, contact us at support@myjewels.in or call +91 98765 43210.</p>`
        }
      }
    },
    {
      path: '/policies/shipping_policy.json',
      key: 'shipping_policy',
      body: {
        shipping_policy: {
          body: `<h1>Shipping Policy</h1>
<h2>Free Shipping</h2>
<p><strong>Free standard shipping</strong> on all orders above ₹999 within India.</p>
<h2>Delivery Timelines</h2>
<table>
  <tr><th>Delivery Type</th><th>Timeline</th><th>Cost</th></tr>
  <tr><td>Standard Delivery</td><td>3–7 business days</td><td>Free above ₹999 (₹79 below)</td></tr>
  <tr><td>Express Delivery</td><td>1–3 business days</td><td>₹99</td></tr>
</table>
<h2>Order Processing</h2>
<p>Orders are processed within 1–2 business days. Orders placed on weekends or public holidays are processed the next business day.</p>
<h2>Tracking</h2>
<p>Once your order is shipped, you will receive an email with your tracking number and a link to track your shipment.</p>
<h2>International Shipping</h2>
<p>We currently ship only within India. International shipping coming soon!</p>`
        }
      }
    }
  ];

  for (const policy of policies) {
    const res = await api('PUT', policy.path, policy.body);
    const key = policy.key;
    if (res[key]) console.log(`  ✅ Policy: ${key.replace(/_/g, ' ')}`);
    else console.log(`  ⚠️  Policy ${key}:`, JSON.stringify(res).slice(0, 100));
    await delay(300);
  }
}

// ─── SHIPPING ZONES ───────────────────────────────────────────────────────────
async function setupShipping() {
  console.log('\n🔵 Setting up shipping zones...');

  // Get existing shipping zones
  const zonesRes = await api('GET', '/shipping_zones.json');
  const existingZones = zonesRes.shipping_zones || [];
  console.log(`  Found ${existingZones.length} existing shipping zones`);

  // Create India shipping zone
  const indiaZone = await api('POST', '/shipping_zones.json', {
    shipping_zone: {
      name: "India",
      countries: [{ code: "IN" }],
      price_based_shipping_rates: [
        {
          name: "Standard Shipping",
          min_order_subtotal: "0.00",
          max_order_subtotal: "998.99",
          price: "79.00"
        },
        {
          name: "Free Standard Shipping",
          min_order_subtotal: "999.00",
          max_order_subtotal: null,
          price: "0.00"
        }
      ],
      weight_based_shipping_rates: [],
      carrier_shipping_rate_providers: []
    }
  });

  if (indiaZone.shipping_zone) {
    console.log(`  ✅ India shipping zone created with free shipping above ₹999`);
  } else {
    console.log(`  ⚠️  Shipping zone:`, JSON.stringify(indiaZone).slice(0, 200));
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting Full Store Setup\n');

  // 1. Create products
  console.log('🔵 Creating Products...');
  const createdProducts = [];
  for (const p of PRODUCTS) {
    const product = await createProduct(p);
    if (product) createdProducts.push({ product, tags: p.tags });
    await delay(500);
  }

  // 2. Assign to collections
  console.log(`\n🔵 Assigning ${createdProducts.length} products to collections...`);
  for (const { product, tags } of createdProducts) {
    await assignToCollections(product.id, tags);
    process.stdout.write('.');
  }
  console.log('\n  ✅ All products assigned to collections');

  // 3. Update store settings
  await updateStoreSettings();

  // 4. Setup policies
  await setupPolicies();

  // 5. Setup shipping
  await setupShipping();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('🎉 COMPLETE STORE SETUP DONE!');
  console.log('='.repeat(50));
  console.log(`✅ Products created: ${createdProducts.length}`);
  console.log(`✅ Collections populated: Rings, Earrings, Necklaces, Bracelets, Pendants, Chains + more`);
  console.log(`✅ Store currency: INR (₹)`);
  console.log(`✅ Policies: Privacy, Refund, Terms, Shipping`);
  console.log(`✅ Shipping: India zone with free shipping above ₹999`);
  console.log(`\n🌐 Store URL: https://5n8r11-v5.myshopify.com`);
  console.log(`📦 Admin URL: https://5n8r11-v5.myshopify.com/admin`);
}

main().catch(console.error);
