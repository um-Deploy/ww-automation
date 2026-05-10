import puppeteer from 'puppeteer';
import { DECISION_MAKER_KEYWORDS } from '../queries.js';

const CHROMIUM = puppeteer.executablePath();
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Pages likely to have decision maker contact info
const CONTACT_PATHS = ['/contact', '/contact-us', '/about', '/about-us', '/team', '/leadership', '/management', '/our-team', '/people'];

// Guess common role-based emails from domain
function guessEmails(domain) {
  return [
    { email: `hr@${domain}`, role: 'HR Manager' },
    { email: `human.resources@${domain}`, role: 'HR Manager' },
    { email: `admin@${domain}`, role: 'Admin Manager' },
    { email: `procurement@${domain}`, role: 'Procurement Manager' },
    { email: `purchase@${domain}`, role: 'Procurement Manager' },
    { email: `info@${domain}`, role: 'unknown' },
    { email: `contact@${domain}`, role: 'unknown' },
  ];
}

// Extract root domain from URL
function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Detect role from surrounding text context around a name/email
function detectRole(contextText) {
  const lower = contextText.toLowerCase();
  for (const [role, keywords] of Object.entries(DECISION_MAKER_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return { role, label: toLabel(role, kw) };
    }
  }
  return null;
}

function toLabel(role, keyword) {
  const map = {
    hr: 'HR Manager',
    admin: 'Admin Manager',
    procurement: 'Procurement Manager',
    owner: 'Owner / Director',
  };
  // Use specific keyword as label if it's descriptive enough
  if (keyword.length > 10) {
    return keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return map[role] || 'Decision Maker';
}

// Priority order: hr > procurement > admin > owner (gifting decision is usually HR/Admin)
const ROLE_PRIORITY = ['hr', 'procurement', 'admin', 'owner'];

function pickBestContact(contacts) {
  if (!contacts.length) return null;
  for (const priority of ROLE_PRIORITY) {
    const match = contacts.find(c => c.roleKey === priority);
    if (match) return match;
  }
  return contacts[0];
}

async function scrapePageContacts(page, url) {
  const contacts = [];
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1000);

    const result = await page.evaluate((emailRegexStr) => {
      const EMAIL_RE = new RegExp(emailRegexStr, 'g');
      const text = document.body.innerText || '';
      const html = document.body.innerHTML || '';

      // Extract all emails visible on page
      const emails = [...new Set(text.match(EMAIL_RE) || [])];

      // Extract mailto links
      const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
        .map(a => a.href.replace('mailto:', '').split('?')[0].toLowerCase())
        .filter(e => e.includes('@'));

      // Named contacts — look for person name + role patterns
      // Try to find headings + subtexts that follow typical "Name — Title" patterns
      const namedContacts = [];
      const nameRoleEls = document.querySelectorAll(
        'h2 + p, h3 + p, h4 + p, ' +
        '.team-member, .team-card, .person, .member, .profile, ' +
        '[class*="team"], [class*="person"], [class*="member"], [class*="staff"]'
      );
      nameRoleEls.forEach(el => {
        namedContacts.push(el.innerText?.trim() || '');
      });

      return {
        emails: [...new Set([...emails, ...mailtos])].filter(e => !e.includes('example') && !e.includes('domain')),
        pageText: text.slice(0, 5000), // First 5000 chars for role detection
        namedContacts: namedContacts.slice(0, 20),
      };
    }, EMAIL_RE.source);

    // Classify each found email
    for (const email of result.emails) {
      const emailLower = email.toLowerCase();
      let roleKey = 'unknown';
      let label = 'Contact';

      for (const [role, keywords] of Object.entries(DECISION_MAKER_KEYWORDS)) {
        if (keywords.some(kw => emailLower.includes(kw.replace(' ', '.')) || emailLower.includes(kw.split(' ')[0]))) {
          roleKey = role;
          label = toLabel(role, keywords[0]);
          break;
        }
      }

      // Also check page text around this email for role context
      const emailIdx = result.pageText.indexOf(email.split('@')[0]);
      if (emailIdx !== -1 && roleKey === 'unknown') {
        const context = result.pageText.slice(Math.max(0, emailIdx - 200), emailIdx + 200);
        const detected = detectRole(context);
        if (detected) { roleKey = detected.role; label = detected.label; }
      }

      contacts.push({ email, roleKey, label, source: 'website_email', name: '' });
    }

    // Process named contacts block for role context
    for (const block of result.namedContacts) {
      const detected = detectRole(block);
      if (!detected) continue;

      // Try to extract a name from the block (first line, usually the name)
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const possibleName = lines[0];
      if (possibleName && possibleName.length < 60 && /^[A-Z]/.test(possibleName)) {
        // Check if we already have this role from an email — update with name
        const existing = contacts.find(c => c.roleKey === detected.role);
        if (existing && !existing.name) {
          existing.name = possibleName;
        } else {
          contacts.push({ email: '', roleKey: detected.role, label: detected.label, source: 'website_team', name: possibleName });
        }
      }
    }

  } catch (err) {
    // Page load error — silent, fallback to guess
  }

  return contacts;
}

export async function enrichContact(lead) {
  if (!lead.website) {
    return applyGuessedContact(lead);
  }

  const domain = extractDomain(lead.website);
  if (!domain) return applyGuessedContact(lead);

  let browser;
  const contacts = [];

  try {
    browser = await puppeteer.launch({
      executablePath: CHROMIUM,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // Try contact/about pages in order of likely yield
    for (const path of CONTACT_PATHS) {
      const url = `https://${domain}${path}`;
      const found = await scrapePageContacts(page, url);
      contacts.push(...found);
      if (contacts.some(c => c.roleKey !== 'unknown')) break; // Good enough
      await sleep(500);
    }

  } catch (err) {
    console.warn(`[Enrich] Error for ${domain}: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }

  // Pick best contact (HR > Procurement > Admin > Owner > unknown)
  const best = pickBestContact(contacts);

  if (best) {
    return {
      ...lead,
      contactName: best.name || '',
      contactRole: best.label,
      contactEmail: best.email || guessEmails(domain).find(g => g.role === best.label)?.email || `info@${domain}`,
      contactPhone: lead.phone, // business phone as fallback
    };
  }

  return applyGuessedContact(lead, domain);
}

function applyGuessedContact(lead, domain = null) {
  if (!domain && lead.website) domain = extractDomain(lead.website);
  const bestGuess = domain ? guessEmails(domain)[0] : null;

  return {
    ...lead,
    contactName: '',
    contactRole: 'HR / Admin Manager',
    contactEmail: bestGuess?.email || '',
    contactPhone: lead.phone,
  };
}

// Batch enrich with concurrency limit
export async function enrichLeads(leads, concurrency = 2) {
  const enriched = [];
  for (let i = 0; i < leads.length; i += concurrency) {
    const batch = leads.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(lead => enrichContact(lead).catch(() => lead)));
    enriched.push(...results);
    if (i + concurrency < leads.length) await sleep(1000);
  }
  return enriched;
}
