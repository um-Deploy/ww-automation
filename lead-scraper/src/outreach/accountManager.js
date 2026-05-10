import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';

// Each account: { phone, client, ready }
const accounts = [];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function istHour() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours();
}

function isBusinessHours() {
  const now  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const hour = now.getHours();
  const day  = now.getDay();
  if (day === 0) return false; // Sunday off only — Saturday is a workday in India
  return hour >= 9 && hour < 20;
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ── Init one WhatsApp account ─────────────────────────────────────────────────

function createClient(index) {
  return new Client({
    authStrategy: new LocalAuth({
      dataPath: `.wwebjs_auth_outreach_${index + 1}`,
      clientId: `outreach_${index + 1}`,
    }),
    puppeteer: {
      headless: 'new',
      protocolTimeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
      ],
    },
  });
}

async function initAccount(phone, index, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await attemptInit(phone, index, attempt);
    if (result.ready) return result;
    if (attempt < retries) {
      console.log(`[Account ${index + 1}] Retrying in 5s... (attempt ${attempt + 1}/${retries})`);
      await sleep(5000);
    }
  }
  console.error(`[Account ${index + 1}] Failed after ${retries} attempts — skipping.`);
  return { phone, client: null, ready: false, index: index + 1 };
}

function attemptInit(phone, index, attempt) {
  return new Promise((resolve) => {
    const label  = `Account ${index + 1}`;
    const entry  = { phone, client: null, ready: false, index: index + 1 };
    const client = createClient(index);
    entry.client = client;

    const timeout = setTimeout(() => {
      console.warn(`[${label}] Slow to ready — proceeding anyway.`);
      entry.ready = true;
      resolve(entry);
    }, 90_000);

    client.on('qr', (qr) => {
      console.log(`\n[${label} — ${phone}] Scan QR:\n`);
      qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', () => console.log(`[${label}] Authenticated.`));

    client.on('loading_screen', (pct, msg) => console.log(`[${label}] Loading ${pct}% — ${msg}`));

    client.on('ready', () => {
      clearTimeout(timeout);
      console.log(`[${label} — ${phone}] Ready ✓`);
      entry.ready = true;
      resolve(entry);
    });

    client.on('auth_failure', () => {
      clearTimeout(timeout);
      console.error(`[${label}] Auth failed.`);
      resolve(entry);
    });

    client.on('disconnected', () => {
      entry.ready = false;
      console.warn(`[${label}] Disconnected.`);
    });

    // Catch the "Execution context was destroyed" crash and resolve so retry kicks in
    client.initialize().catch((err) => {
      clearTimeout(timeout);
      if (err.message?.includes('Execution context was destroyed') || err.message?.includes('navigation')) {
        console.warn(`[${label}] Puppeteer navigation error on attempt ${attempt} — will retry.`);
      } else {
        console.error(`[${label}] Init error:`, err.message);
      }
      resolve(entry); // entry.ready = false → triggers retry
    });
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function initAllAccounts() {
  const phones = (process.env.WA_ACCOUNTS || process.env.OUTREACH_PHONE || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  if (phones.length === 0) {
    console.error('[AccountManager] No accounts configured. Set WA_ACCOUNTS in .env');
    process.exit(1);
  }

  console.log(`[AccountManager] Initializing ${phones.length} WhatsApp account(s) one by one...`);

  // Init sequentially — launching browsers in parallel causes Puppeteer context crashes
  for (let i = 0; i < phones.length; i++) {
    console.log(`\n[AccountManager] Starting account ${i + 1}/${phones.length} (${phones[i]})...`);
    const entry = await initAccount(phones[i], i);
    accounts.push(entry);
    if (i < phones.length - 1) await sleep(3000); // Small gap between browser launches
  }

  const ready = accounts.filter(a => a.ready).length;
  console.log(`[AccountManager] ${ready}/${accounts.length} accounts ready.\n`);
}

export function getReadyAccounts() {
  return accounts.filter(a => a.ready);
}

export async function destroyAllAccounts() {
  for (const acc of accounts) {
    try {
      acc.ready = false; // stop any in-flight operations first
      await acc.client?.destroy();
    } catch { /* ignore cleanup errors */ }
  }
  accounts.length = 0;
  console.log('[AccountManager] All sessions closed.');
}

// ── Core send helper ──────────────────────────────────────────────────────────

// Errors that mean the whole browser session is dead
const SESSION_DEAD = ['Target closed', 'detached Frame', 'Session closed', 'context was destroyed'];
// Errors that mean just this number is invalid/skip — not a crash
const SKIP_ERRORS  = ['not a registered', 'invalid wid', 'not registered'];

function isSessionDead(err) { return SESSION_DEAD.some(e => err.message?.includes(e)); }
function isSkipError(err)   { return SKIP_ERRORS.some(e => err.message?.toLowerCase().includes(e.toLowerCase())); }

// Wraps a promise with a timeout — returns 'timeout' string on expiry
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve('timeout'), ms)),
  ]);
}

async function doSend(acc, lead, message, mediaFiles = []) {
  if (!acc.ready || !acc.client) return false;

  if (!/^91\d{10}$/.test(lead.phone)) return 'invalid';

  if (!isBusinessHours()) {
    console.log(`[Account ${acc.index}] Outside business hours (${istHour()}:xx IST) — skipping ${lead.name}`);
    return 'outside_hours';
  }

  const chatId = `${lead.phone}@c.us`;

  // Human-like pause before sending
  await sleep(randInt(2000, 5000));

  try {
    // Send text — no isRegisteredUser() call (too fragile, causes timeouts)
    const sendResult = await withTimeout(acc.client.sendMessage(chatId, message), 20000);
    if (sendResult === 'timeout') {
      console.warn(`[Account ${acc.index}] ⏱ Send timed out for ${lead.phone} — skipping`);
      return false;
    }

    // Send media files one by one
    for (const filePath of mediaFiles) {
      await sleep(randInt(3000, 6000));
      const media = MessageMedia.fromFilePath(filePath);
      const mResult = await withTimeout(acc.client.sendMessage(chatId, media), 30000);
      if (mResult !== 'timeout') {
        console.log(`[Account ${acc.index}] 📎 Media sent: ${filePath.split(/[\\/]/).pop()}`);
      }
    }

    return true;

  } catch (err) {
    if (isSessionDead(err)) {
      console.error(`[Account ${acc.index}] 💥 Session dead — stopping. (${err.message.substring(0, 60)})`);
      acc.ready = false;
      return 'crashed';
    }
    if (isSkipError(err)) {
      console.log(`[Account ${acc.index}] ${lead.phone} not on WhatsApp — skipping`);
      return 'not_on_wa';
    }
    console.warn(`[Account ${acc.index}] ✗ ${lead.phone}: ${err.message.substring(0, 80)}`);
    return false;
  }
}

// ── Send offer message ────────────────────────────────────────────────────────

export async function sendFromAccount(acc, lead, message, { updateOfferSent, markContacted }) {
  const result = await doSend(acc, lead, message);
  if (result === true) {
    await updateOfferSent(lead.phone);
    markContacted(lead.phone);
    console.log(`[Account ${acc.index}] ✓ Sent → ${lead.name} (${lead.phone})`);
  }
  return result;
}

// ── Send follow-up with media ─────────────────────────────────────────────────

export async function sendFollowUp(acc, lead, message, mediaFiles, { markFollowUpSent }) {
  const result = await doSend(acc, lead, message, mediaFiles);
  if (result === true) {
    markFollowUpSent(lead.phone);
    console.log(`[Account ${acc.index}] ✓ Follow-up sent → ${lead.name} (${lead.phone}) [${mediaFiles.length} file(s)]`);
  }
  return result;
}
