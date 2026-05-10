import puppeteer from 'puppeteer';

const CHROMIUM = puppeteer.executablePath();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '91' + digits.slice(1);
  if (digits.length === 10) return '91' + digits;
  return null;
}

export async function scrapeGoogleMaps(query, industry, city, maxResults = 20) {
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
        '--window-size=1280,900',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 900 });

    // Hide webdriver flag
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query + ' ' + city)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    // Scroll results panel to load more listings
    const FEED = 'div[role="feed"]';
    await page.waitForSelector(FEED, { timeout: 10000 }).catch(() => {});

    for (let i = 0; i < 5; i++) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollBy(0, 600);
      }, FEED);
      await sleep(1000);
    }

    // Get all listing links
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
      return [...new Set(anchors.map(a => a.href))].slice(0, 25);
    });

    console.log(`[Maps] Found ${links.length} listings for "${query}"`);

    for (const link of links.slice(0, maxResults)) {
      try {
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 20000 });
        await sleep(1500);

        const data = await page.evaluate(() => {
          // Business name
          const name = document.querySelector('h1.DUwDvf, h1[class*="fontHeadlineLarge"]')?.textContent?.trim()
            || document.querySelector('h1')?.textContent?.trim();

          // Phone — look for element with phone icon or tel: link
          let phone = null;
          const telLink = document.querySelector('a[href^="tel:"]');
          if (telLink) {
            phone = telLink.href.replace('tel:', '').trim();
          } else {
            // Try data-item-id pattern
            const phoneEl = document.querySelector('[data-item-id*="phone"], button[aria-label*="phone"], [data-tooltip*="phone"]');
            phone = phoneEl?.textContent?.trim() || null;
          }

          // Address
          const addrEl = document.querySelector('button[data-item-id="address"], [data-item-id="address"] span, [aria-label*="Address"]');
          const address = addrEl?.textContent?.trim() || '';

          // Rating
          const rating = document.querySelector('span.ceNzKf, div.F7nice span[aria-hidden]')?.textContent?.trim() || '';

          return { name, phone, address, rating };
        });

        const phone = normalizePhone(data.phone);
        if (data.name && phone) {
          results.push({
            name: data.name,
            phone,
            address: data.address,
            rating: data.rating,
            website: '',
            industry,
            city,
            source: 'Google Maps',
          });
          console.log(`[Maps] ✓ ${data.name} | ${phone}`);
        } else {
          console.log(`[Maps] ✗ ${data.name || 'unknown'} — no phone found`);
        }

        await sleep(800);
      } catch (err) {
        console.warn(`[Maps] Error on listing: ${err.message}`);
      }
    }

  } catch (err) {
    console.error(`[Maps] Fatal error for "${query}": ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }

  return results;
}
