import puppeteer from 'puppeteer';

const CHROMIUM = puppeteer.executablePath();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '91' + digits.slice(1);
  if (digits.length === 10) return '91' + digits;
  return null;
}

// JustDial search URL builder
function buildUrl(keyword, city) {
  const citySlug = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
  const kwSlug = keyword.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  return `https://www.justdial.com/${citySlug}/${kwSlug}`;
}

export async function scrapeJustDial(keyword, industry, city) {
  const url = buildUrl(keyword, city);
  const results = [];
  let browser;

  try {
    browser = await puppeteer.launch({
      executablePath: CHROMIUM,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,800',
      ],
    });

    const page = await browser.newPage();

    // Intercept JustDial's internal API responses that contain real business data
    const captured = [];
    page.on('response', async (response) => {
      const resUrl = response.url();
      if (
        resUrl.includes('justdial.com') &&
        (resUrl.includes('api') || resUrl.includes('search') || resUrl.includes('getresult'))
      ) {
        try {
          const ct = response.headers()['content-type'] || '';
          if (ct.includes('json')) {
            const json = await response.json();
            captured.push(json);
          }
        } catch { /* ignore */ }
      }
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // Scroll to trigger lazy loading of more listings
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await sleep(1200);
    }

    // Try extracting from intercepted API responses
    for (const json of captured) {
      const merchants = extractMerchants(json);
      for (const m of merchants) {
        const phone = normalizePhone(m.phone);
        if (phone) {
          results.push({ name: m.name, phone, address: m.address || '', rating: m.rating || '', website: '', industry, city, source: 'JustDial' });
        }
      }
    }

    // Fallback: extract from rendered DOM if API interception got nothing
    if (results.length === 0) {
      const domLeads = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('li.cntanr, li[class*="resultbox"], div[class*="resultbox"]').forEach(el => {
          const name = el.querySelector('span.lng_name, h2, .companyname, [class*="companyname"]')?.textContent?.trim();
          const phone = el.querySelector('[href^="tel:"]')?.href?.replace('tel:', '').trim();
          const addr = el.querySelector('.address-info, [class*="address"]')?.textContent?.trim();
          if (name) items.push({ name, phone: phone || null, addr: addr || '' });
        });
        return items;
      });

      for (const d of domLeads) {
        const phone = normalizePhone(d.phone);
        if (phone) {
          results.push({ name: d.name, phone, address: d.addr, rating: '', website: '', industry, city, source: 'JustDial' });
        }
      }
    }

  } catch (err) {
    console.warn(`[JustDial] Error scraping "${keyword}" in ${city}:`, err.message);
  } finally {
    if (browser) await browser.close();
  }

  return results;
}

// Walk JustDial JSON response tree to find merchant array
function extractMerchants(json) {
  const merchants = [];

  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    // Common keys in JustDial API responses
    if (Array.isArray(obj.results)) {
      obj.results.forEach(item => {
        if (item.company_name || item.display_name || item.name) {
          merchants.push({
            name: item.company_name || item.display_name || item.name,
            phone: item.mobile || item.phone || item.contact_number || item.mobileno,
            address: item.address || item.area || '',
            rating: item.rating || item.stars || '',
          });
        }
      });
    }
    if (Array.isArray(obj)) obj.forEach(walk);
    else Object.values(obj).forEach(v => { if (typeof v === 'object') walk(v); });
  }

  walk(json);
  return merchants;
}
