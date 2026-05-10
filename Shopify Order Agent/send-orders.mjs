/* ================================================================
   WOODWALEY — Order Report → WhatsApp Sender
   Reuses the existing whatsapp-web.js session from parent project.

   Usage:
     node send-orders.mjs --today          → today's orders
     node send-orders.mjs --days 3         → last 3 days
     node send-orders.mjs --list-chats     → print all chat IDs (find group ID)

   First run: configure RECIPIENTS below, then run --list-chats
   to get the exact group/contact ID.
   ================================================================ */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import https from 'https';
import path  from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ── CONFIG — edit this section ──────────────────────────────────
   Phone number format : 91XXXXXXXXXX@c.us  (country code + number)
   Group ID format     : 120363XXXXXXXXXX@g.us
   Run --list-chats to find the exact ID of any group.
   ---------------------------------------------------------------- */
const RECIPIENTS = [
  '220443508236368@lid',
];

const STORE = 'mq7rnf-dv.myshopify.com';
const TOKEN = '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';

/* ── Args ─────────────────────────────────────────────────────── */
const args      = process.argv.slice(2);
const listChats = args.includes('--list-chats');
const isToday   = args.includes('--today');
const days      = isToday ? 1 : parseInt(args[args.indexOf('--days') + 1] || '1', 10);

const since = new Date();
if (isToday) { since.setHours(0, 0, 0, 0); }
else         { since.setDate(since.getDate() - days); }

/* ── Shopify helpers ──────────────────────────────────────────── */
function shopifyGet(urlPath) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: STORE, path: urlPath,
      headers: { 'X-Shopify-Access-Token': TOKEN, Accept: 'application/json' }
    }, res => {
      let data = ''; const link = res.headers['link'] || '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve({ body: JSON.parse(data), link }); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

function nextPage(linkHeader) {
  const m = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  if (!m) return null;
  const u = new URL(m[1]); return u.pathname + u.search;
}

async function fetchAll(startPath) {
  const all = []; let p = startPath;
  while (p) {
    const { body, link } = await shopifyGet(p);
    all.push(...(body[Object.keys(body)[0]] || []));
    p = nextPage(link);
  }
  return all;
}

/* ── CoD / Prepaid detection ─────────────────────────────────── */
function getPaymentType(order) {
  if (order.discount_codes?.some(d => d.code.toUpperCase().includes('PREPAID'))) return 'Prepaid 💳';
  const gw = (order.payment_gateway || '').toLowerCase();
  if (['cod','cash','releaseit','cash_on_delivery'].some(k => gw.includes(k))) return 'COD 🚚';
  if (['partially_paid','pending'].includes(order.financial_status)) return 'COD 🚚';
  return 'Prepaid 💳';
}

/* ── Format one order as WhatsApp message ────────────────────── */
function formatOrder(order) {
  const date = new Date(order.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  let msg = `📦 *Order #${order.order_number}*\n`;
  msg    += `📅 ${date}\n`;
  msg    += `💳 ${getPaymentType(order)}\n`;
  msg    += `━━━━━━━━━━━━━━━━━━\n`;

  for (const item of order.line_items) {
    const variant = item.variant_title && item.variant_title !== 'Default Title'
      ? ` _(${item.variant_title})_` : '';
    msg += `\n🛍️ *${item.title}*${variant}\n`;
    msg += `   Qty: *${item.quantity}*\n`;

    const custom = (item.properties || []).filter(p => !p.name.startsWith('_'));
    if (custom.length) {
      msg += `✏️ Customisation:\n`;
      custom.forEach(p => { msg += `   • ${p.name}: ${p.value}\n`; });
    }
  }

  msg += `\n━━━━━━━━━━━━━━━━━━\n`;
  msg += `💰 *Total: ₹${parseFloat(order.total_price).toLocaleString('en-IN')}*`;
  return msg;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── Main ─────────────────────────────────────────────────────── */
async function main() {
  // Reuse existing session from parent project (no QR re-scan needed)
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.resolve(__dirname, '../.wwebjs_auth') }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--no-first-run','--disable-gpu']
    }
  });

  process.stdout.write('Connecting to WhatsApp…');
  await new Promise((resolve, reject) => {
    client.on('qr', qr => {
      console.log('\nNo saved session — scan QR to link WhatsApp:\n');
      import('qrcode-terminal').then(m => m.default.generate(qr, { small: true }));
    });
    client.on('auth_failure', e => reject(new Error('Auth failed: ' + e)));
    client.on('ready', () => { console.log(' connected.'); resolve(); });
    client.initialize();
  });

  /* --list-chats: print all chats so user can copy the right group ID */
  if (listChats) {
    const chats = await client.getChats();
    console.log('\n── Your WhatsApp Chats (' + chats.length + ') ──────────────');
    chats.slice(0, 60).forEach(c => {
      const icon = c.isGroup ? '👥' : '👤';
      console.log(`${icon} ${c.name.padEnd(40)} ${c.id._serialized}`);
    });
    console.log('\nCopy the ID of your employee group and paste it into RECIPIENTS in this file.');
    await client.destroy(); return;
  }

  /* Fetch orders + product images in parallel */
  console.log('Fetching orders from Shopify…');
  const [orders, products] = await Promise.all([
    fetchAll(`/admin/api/2024-01/orders.json?status=any&limit=250&created_at_min=${since.toISOString()}`),
    fetchAll('/admin/api/2024-01/products.json?limit=250&fields=id,variants,images')
  ]);
  console.log(`${orders.length} orders found.`);

  // variant → image URL
  const varImg = {};
  for (const prod of products) {
    const def = prod.images?.[0]?.src || '';
    for (const v of (prod.variants || [])) {
      varImg[v.id] = prod.images?.find(i => i.id === v.image_id)?.src || def;
    }
  }

  /* No orders: send a quick note */
  if (!orders.length) {
    const label = isToday ? 'today' : `last ${days} day(s)`;
    for (const r of RECIPIENTS) await client.sendMessage(r, `📦 *Woodwaley Orders*\n\nNo new orders ${label}.`);
    console.log('No orders — notification sent.'); await client.destroy(); return;
  }

  /* Summary header */
  const label = isToday ? "Today's" : `Last ${days}-day`;
  for (const r of RECIPIENTS) {
    await client.sendMessage(r,
      `📦 *Woodwaley — ${label} Orders*\n\n*${orders.length} order(s)* · Sending details now…`
    );
  }
  await sleep(800);

  /* One message per order + item images */
  for (const order of orders) {
    // Text message
    for (const r of RECIPIENTS) await client.sendMessage(r, formatOrder(order));
    await sleep(600);

    // Product image per line item
    for (const item of order.line_items) {
      const url = varImg[item.variant_id];
      if (!url) continue;
      try {
        const media = await MessageMedia.fromUrl(url, { unsafeMime: true });
        const caption = `${item.title} × ${item.quantity}`;
        for (const r of RECIPIENTS) await client.sendMessage(r, media, { caption });
        await sleep(500);
      } catch(e) { console.warn(`  ↳ Image skip (${item.title}):`, e.message); }
    }

    await sleep(800);
  }

  console.log(`\n✓ Sent ${orders.length} orders to ${RECIPIENTS.length} recipient(s).`);
  await client.destroy();
}

main().catch(e => { console.error('\nERROR:', e.message); process.exit(1); });
