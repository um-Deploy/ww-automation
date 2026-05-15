#!/usr/bin/env node
/* ================================================================
   WOODWALEY — Order Report Agent
   Fetches orders → HTML report with images + CSV

   Usage:
     node orders.js              → last 7 days
     node orders.js --days 30    → last 30 days
     node orders.js --today      → today only

   Output: orders-report.html + orders-report.csv (same folder)
   ================================================================ */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const STORE = 'mq7rnf-dv.myshopify.com';
const TOKEN = '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';

/* ── CLI args ─────────────────────────────────────────────────── */
const args  = process.argv.slice(2);
const today = args.includes('--today');
const days  = today ? 1 : parseInt(args[args.indexOf('--days') + 1] || '7', 10);

const IST_MS = 5.5 * 60 * 60 * 1000;
let since, until;
if (today) {
  const nowIST     = new Date(Date.now() + IST_MS);
  const midnightUTC = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()));
  since = new Date(midnightUTC.getTime() - IST_MS);           // 00:00:00 IST today
  until = new Date(midnightUTC.getTime() - IST_MS + 86400000); // 00:00:00 IST tomorrow (= 24:00 today)
} else {
  since = new Date();
  since.setDate(since.getDate() - days);
  until = null;
}

const OUT_HTML = path.join(__dirname, 'orders-report.html');
const OUT_CSV  = path.join(__dirname, 'orders-report.csv');

/* ── Shopify GET with pagination ──────────────────────────────── */
function shopifyGet(urlPath) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: STORE,
      path: urlPath,
      headers: { 'X-Shopify-Access-Token': TOKEN, Accept: 'application/json' }
    }, res => {
      let data = '';
      const link = res.headers['link'] || '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ body: JSON.parse(data), link }); }
        catch (e) { reject(new Error('JSON parse fail: ' + data.slice(0, 120))); }
      });
    }).on('error', reject);
  });
}

function nextPagePath(linkHeader) {
  const m = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  if (!m) return null;
  const u = new URL(m[1]);
  return u.pathname + u.search;
}

async function fetchAll(startPath) {
  const all = [];
  let p = startPath;
  while (p) {
    const { body, link } = await shopifyGet(p);
    const key = Object.keys(body)[0];
    all.push(...(body[key] || []));
    p = nextPagePath(link);
  }
  return all;
}

/* ── CoD / Prepaid detection ─────────────────────────────────── */
// Most reliable: our prepaid flow always stamps PREPAID discount code.
// COD (via Releaseit) has no discount code + gateway is cod/releaseit/partial.
function getPaymentType(order) {
  // 1. Discount code present → Prepaid
  if (order.discount_codes?.some(d => d.code.toUpperCase().includes('PREPAID'))) {
    return 'Prepaid';
  }
  // 2. Gateway keyword
  const gw = (order.payment_gateway || '').toLowerCase();
  if (['cod', 'cash', 'releaseit', 'cash_on_delivery'].some(k => gw.includes(k))) {
    return 'COD';
  }
  // 3. Partial payment = Releaseit COD advance paid
  if (order.financial_status === 'partially_paid') return 'COD';
  if (order.financial_status === 'pending')        return 'COD';
  // 4. Fully paid online
  return 'Prepaid';
}

/* ── Customisation from line item properties ─────────────────── */
function getCustomisation(properties) {
  if (!properties?.length) return '';
  const visible = properties.filter(p => !p.name.startsWith('_'));
  return visible.map(p => `${p.name}: ${p.value}`).join('\n') || '';
}

/* ── Main ─────────────────────────────────────────────────────── */
async function main() {
  const label = today ? 'today' : `last ${days} days`;
  process.stdout.write(`Fetching orders (${label})…`);

  // Fetch orders + product images in parallel
  const maxParam   = until ? `&created_at_max=${until.toISOString()}` : '';
  const ordersPath = `/admin/api/2024-01/orders.json?status=any&limit=250&created_at_min=${since.toISOString()}${maxParam}`;
  const prodsPath  = `/admin/api/2024-01/products.json?limit=250&fields=id,variants,images`;

  const [orders, products] = await Promise.all([
    fetchAll(ordersPath),
    fetchAll(prodsPath)
  ]);

  console.log(` ${orders.length} orders found.`);

  if (!orders.length) {
    const noOrdersHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Woodwaley Orders</title></head>
<body style="font-family:sans-serif;padding:40px;background:#f4f1ef">
<h2 style="color:#5c3d2e">📦 Woodwaley — Order Report</h2>
<p style="font-size:16px;color:#555">No orders for <strong>${label}</strong>.<br>
Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
</body></html>`;
    fs.writeFileSync(OUT_HTML, noOrdersHtml, 'utf8');
    fs.writeFileSync(OUT_CSV, '﻿Order No,Date,Item Name,Image URL,Qty,Payment Type,Customisation,Order Total\r\n', 'utf8');
    console.log(`\n✓ No orders for ${label}.`);
    console.log(`✓ HTML  → ${OUT_HTML}`);
    console.log(`✓ CSV   → ${OUT_CSV}`);
    return;
  }

  // Build variant → image URL map
  const variantImg = {};
  for (const prod of products) {
    const defaultImg = prod.images?.[0]?.src || '';
    for (const v of (prod.variants || [])) {
      const img = prod.images?.find(i => i.id === v.image_id)?.src || defaultImg;
      variantImg[v.id] = img;
    }
  }

  // Build row data
  const rows = [];
  for (const order of orders) {
    const payType = getPaymentType(order);
    const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    for (const item of order.line_items) {
      const varTitle = item.variant_title && item.variant_title !== 'Default Title'
        ? ` — ${item.variant_title}` : '';
      rows.push({
        orderNo:       order.order_number,
        date:          dateStr,
        itemName:      item.title + varTitle,
        imageUrl:      variantImg[item.variant_id] || '',
        qty:           item.quantity,
        paymentType:   payType,
        customisation: getCustomisation(item.properties),
        total:         '₹' + parseFloat(order.total_price).toLocaleString('en-IN')
      });
    }
  }

  // Write outputs
  fs.writeFileSync(OUT_HTML, buildHTML(rows, label, orders.length), 'utf8');
  fs.writeFileSync(OUT_CSV,  buildCSV(rows), 'utf8');

  console.log(`\n✓ ${rows.length} line items across ${orders.length} orders`);
  console.log(`✓ HTML  → ${OUT_HTML}`);
  console.log(`✓ CSV   → ${OUT_CSV}`);
}

/* ── HTML report ─────────────────────────────────────────────── */
function buildHTML(rows, label, orderCount) {
  const trs = rows.map(r => {
    const badgeClass = r.paymentType === 'Prepaid' ? 'prepaid' : 'cod';
    const imgTag = r.imageUrl
      ? `<img src="${r.imageUrl}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:6px;">`
      : '<span style="color:#bbb;font-size:20px">📦</span>';
    const custom = r.customisation
      ? r.customisation.split('\n').map(l => `<div>${escHtml(l)}</div>`).join('')
      : '<span style="color:#bbb">—</span>';
    return `<tr>
      <td><a href="https://${STORE}/admin/orders" target="_blank" style="font-weight:700;color:#5c3d2e">#${r.orderNo}</a><br><span style="font-size:12px;color:#888">${r.date}</span></td>
      <td style="text-align:center">${imgTag}</td>
      <td>${escHtml(r.itemName)}</td>
      <td style="text-align:center;font-weight:700">${r.qty}</td>
      <td><span class="badge ${badgeClass}">${r.paymentType}</span></td>
      <td style="font-size:13px;line-height:1.6">${custom}</td>
      <td style="font-weight:700">${r.total}</td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Woodwaley Orders — ${label}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f4f1ef;color:#333}
  .header{background:#5c3d2e;color:#fff;padding:20px 32px}
  .header h1{font-size:22px;font-weight:700}
  .header p{margin-top:4px;font-size:13px;opacity:.75}
  .wrap{padding:24px 32px}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  th{background:#5c3d2e;color:#fff;padding:11px 14px;text-align:left;font-size:12px;font-weight:600;letter-spacing:.5px;text-transform:uppercase}
  td{padding:12px 14px;border-bottom:1px solid #f0ebe7;vertical-align:middle;font-size:14px}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#fdf9f7}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700}
  .badge.cod{background:#fff3e0;color:#e65100}
  .badge.prepaid{background:#e8f5e9;color:#2e7d32}
  a{color:#5c3d2e;text-decoration:none}
  a:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="header">
  <h1>📦 Woodwaley — Order Report</h1>
  <p>${orderCount} orders &middot; ${label} &middot; Generated ${new Date().toLocaleString('en-IN')}</p>
</div>
<div class="wrap">
<table>
  <thead><tr>
    <th>Order</th><th>Image</th><th>Item</th><th>Qty</th><th>Payment</th><th>Customisation</th><th>Total</th>
  </tr></thead>
  <tbody>${trs}</tbody>
</table>
</div>
</body>
</html>`;
}

/* ── CSV ─────────────────────────────────────────────────────── */
function buildCSV(rows) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Order No','Date','Item Name','Image URL','Qty','Payment Type','Customisation','Order Total'];
  const lines = rows.map(r => [
    r.orderNo, r.date, r.itemName, r.imageUrl,
    r.qty, r.paymentType, r.customisation.replace(/\n/g, ' | '), r.total
  ].map(esc).join(','));
  return '﻿' + [header.join(','), ...lines].join('\r\n'); // BOM for Excel
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

main().catch(e => { console.error('\nERROR:', e.message); process.exit(1); });
