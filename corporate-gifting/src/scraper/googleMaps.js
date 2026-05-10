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

export async function scrapeGoogleMaps(query, industry, city, maxResults = 15) {
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
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const FEED = 'div[role="feed"]';
    await page.waitForSelector(FEED, { timeout: 10000 }).catch(() => {});

    for (let i = 0; i < 6; i++) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollBy(0, 700);
      }, FEED);
      await sleep(900);
    }

    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
      return [...new Set(anchors.map(a => a.href))].slice(0, 30);
    });

    console.log(`[Maps] ${links.length} listings for "${query}"`);

    for (const link of links.slice(0, maxResults)) {
      try {
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 20000 });
        await sleep(1500);

        const data = await page.evaluate(() => {
          const name = document.querySelector('h1.DUwDvf, h1[class*="fontHeadlineLarge"]')?.textContent?.trim()
            || document.querySelector('h1')?.textContent?.trim();

          let phone = null;
          const telLink = document.querySelector('a[href^="tel:"]');
          if (telLink) {
            phone = telLink.href.replace('tel:', '').trim();
          } else {
            const phoneEl = document.querySelector('[data-item-id*="phone"], [aria-label*="phone"]');
            phone = phoneEl?.textContent?.trim() || null;
          }

          // Website URL — look for the website button/link
          let website = null;
          const webLink = document.querySelector('a[data-item-id="authority"], a[href*="://"][aria-label*="website" i], a[aria-label*="Website" i]');
          if (webLink) {
            website = webLink.href;
          } else {
            // Try finding any external link that's not google itself
            const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]'))
              .filter(a => !a.href.includes('google.com') && !a.href.includes('maps'))
              .map(a => a.href);
            website = externalLinks[0] || null;
          }

          const addrEl = document.querySelector('button[data-item-id="address"], [data-item-id="address"] span');
          const address = addrEl?.textContent?.trim() || '';

          const rating = document.querySelector('span.ceNzKf, div.F7nice span[aria-hidden]')?.textContent?.trim() || '';

          // Employee count / company size hint from description
          const description = document.querySelector('[data-attrid="description"], .PYvSYb')?.textContent?.trim() || '';

          return { name, phone, website, address, rating, description };
        });

        const phone = normalizePhone(data.phone);
        if (data.name && phone) {
          results.push({
            companyName: data.name,
            phone,
            website: data.website || '',
            address: data.address,
            rating: data.rating,
            description: data.description,
            industry,
            city,
            source: 'Google Maps',
            // These get filled by contactEnricher later
            contactName: '',
            contactRole: '',
            contactEmail: '',
            contactPhone: '',
          });
          console.log(`[Maps] ✓ ${data.name} | ${phone}${data.website ? ' | ' + data.website : ''}`);
        } else {
          console.log(`[Maps] ✗ ${data.name || 'unknown'} — no phone`);
        }

        await sleep(700);
      } catch (err) {
        console.warn(`[Maps] Error on listing: ${err.message}`);
      }
    }

  } catch (err) {
    console.error(`[Maps] Fatal: "${query}" — ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }

  return results;
}
