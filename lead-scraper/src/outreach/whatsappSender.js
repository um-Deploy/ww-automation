import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { updateOfferSent } from '../storage/prospectsSheet.js';
import { markContacted } from '../storage/seenPhones.js';

let client = null;
let isReady = false;

// ── Timing helpers ────────────────────────────────────────────────────────────

// Random int between min and max (inclusive)
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Random delay between min and max seconds
function humanDelay(minSec, maxSec) {
  return sleep(randInt(minSec * 1000, maxSec * 1000));
}

// IST hour (0–23)
function istHour() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  ).getHours();
}

// Only send between 9 AM – 6 PM IST on weekdays
function isBusinessHours() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const hour = now.getHours();
  const day  = now.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false; // No weekends
  return hour >= 9 && hour < 20; // 9 AM – 8 PM IST
}

// ── WhatsApp client ───────────────────────────────────────────────────────────

export async function initWhatsApp() {
  return new Promise((resolve, reject) => {
    client = new Client({
      authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth_outreach', clientId: 'outreach' }),
      puppeteer: {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
        ],
      },
    });

    // Timeout — if not ready in 90s, proceed anyway (WA Web can be slow)
    const timeout = setTimeout(() => {
      console.warn('[Outreach WhatsApp] Ready event taking long — proceeding anyway. Messages may fail if not connected.');
      isReady = true;
      resolve(client);
    }, 90_000);

    client.on('qr', (qr) => {
      console.log('\n[Outreach WhatsApp] Scan QR with your outreach number (7905134325):\n');
      qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', () => {
      console.log('[Outreach WhatsApp] Authenticated — loading WhatsApp Web, please wait...');
    });

    client.on('loading_screen', (percent, message) => {
      console.log(`[Outreach WhatsApp] Loading... ${percent}% — ${message}`);
    });

    client.on('ready', () => {
      clearTimeout(timeout);
      console.log('[Outreach WhatsApp] Ready.');
      isReady = true;
      resolve(client);
    });

    client.on('auth_failure', (msg) => {
      clearTimeout(timeout);
      reject(new Error(msg));
    });

    client.on('disconnected', () => {
      isReady = false;
      console.warn('[Outreach WhatsApp] Disconnected.');
    });

    client.initialize();
  });
}

// ── Core send with full human simulation ─────────────────────────────────────

export async function sendOffer(lead, message) {
  if (!isReady || !client) {
    console.warn(`[Outreach] WhatsApp not ready — skipping ${lead.phone}`);
    return false;
  }

  if (!/^91\d{10}$/.test(lead.phone)) {
    console.warn(`[Outreach] Invalid number format: ${lead.phone} — skipping`);
    return false;
  }

  // Only send during business hours
  if (!isBusinessHours()) {
    const h = istHour();
    console.log(`[Outreach] Outside business hours (${h}:xx IST) — skipping ${lead.name}`);
    return 'outside_hours';
  }

  const chatId = `${lead.phone}@c.us`;

  try {
    // 1. Verify number is on WhatsApp before doing anything
    const registered = await client.isRegisteredUser(chatId);
    if (!registered) {
      console.log(`[Outreach] ${lead.phone} not on WhatsApp — skipping`);
      return 'not_on_wa';
    }

    // 2. Open chat (simulate opening it like a human would)
    const chat = await client.getChatById(chatId);

    // 3. Short pause — like a human reading the name before typing
    await humanDelay(2, 5);

    // 4. Start typing indicator
    await chat.sendStateTyping();

    // 5. Typing duration based on message length (avg ~40 chars/sec for typing)
    const typingMs = randInt(
      Math.floor(message.length * 20),   // fast typer
      Math.floor(message.length * 45)    // normal typer
    );
    // Cap between 4s and 18s so it feels real
    await sleep(Math.min(Math.max(typingMs, 4000), 18000));

    // 6. Stop typing
    await chat.clearState();

    // 7. Tiny pause before hitting send (human hesitation)
    await humanDelay(1, 3);

    // 8. Send
    await client.sendMessage(chatId, message);

    // 9. Update sheet + mark contacted
    await updateOfferSent(lead.phone);
    markContacted(lead.phone);

    console.log(`[Outreach] ✓ Sent → ${lead.name} (${lead.phone}) [${lead.industry}/${lead.city}]`);
    return true;

  } catch (err) {
    console.error(`[Outreach] ✗ Failed for ${lead.phone}:`, err.message);
    return false;
  }
}

export async function destroyWhatsApp() {
  if (client) {
    await client.destroy();
    console.log('[Outreach WhatsApp] Session closed.');
  }
}
