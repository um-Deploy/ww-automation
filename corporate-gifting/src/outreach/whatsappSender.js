import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { updateOfferSent } from '../storage/prospectsSheet.js';
import { markContacted } from '../storage/seenPhones.js';

let client  = null;
let isReady = false;

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function istHour() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours();
}

function isBusinessHours() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const h = now.getHours();
  return h >= 9 && h < 18;
}

export async function initWhatsApp() {
  return new Promise((resolve, reject) => {
    client = new Client({
      authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth_gifting', clientId: 'gifting-outreach' }),
      puppeteer: {
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      },
    });

    const timeout = setTimeout(() => {
      console.warn('[Gifting WA] Ready event slow — proceeding anyway.');
      isReady = true;
      resolve(client);
    }, 90_000);

    client.on('qr', (qr) => {
      console.log('\n[Gifting WA] Scan QR with your outreach number:\n');
      qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', () => console.log('[Gifting WA] Authenticated.'));
    client.on('loading_screen', (pct, msg) => console.log(`[Gifting WA] Loading ${pct}% — ${msg}`));

    client.on('ready', () => {
      clearTimeout(timeout);
      console.log('[Gifting WA] Ready.');
      isReady = true;
      resolve(client);
    });

    client.on('auth_failure', (msg) => { clearTimeout(timeout); reject(new Error(msg)); });
    client.on('disconnected', () => { isReady = false; console.warn('[Gifting WA] Disconnected.'); });

    client.initialize();
  });
}

export async function sendGiftingOffer(lead, message) {
  if (!isReady || !client) {
    console.warn(`[Gifting] WA not ready — skipping ${lead.phone}`);
    return false;
  }

  // Use contactPhone (direct decision maker) if different from business phone, else business phone
  const outreachPhone = lead.contactPhone && lead.contactPhone !== lead.phone
    ? lead.contactPhone
    : lead.phone;

  if (!/^91\d{10}$/.test(outreachPhone)) {
    console.warn(`[Gifting] Invalid number: ${outreachPhone} — skipping`);
    return false;
  }

  if (!isBusinessHours()) {
    console.log(`[Gifting] Outside hours (${istHour()}:xx IST) — skipping ${lead.companyName}`);
    return false;
  }

  const chatId = `${outreachPhone}@c.us`;

  try {
    const registered = await client.isRegisteredUser(chatId);
    if (!registered) {
      console.log(`[Gifting] ${outreachPhone} not on WhatsApp — skipping`);
      return false;
    }

    const chat = await client.getChatById(chatId);
    await sleep(randInt(2000, 5000));
    await chat.sendStateTyping();

    const typingMs = Math.min(Math.max(message.length * 25, 4000), 18000);
    await sleep(randInt(typingMs * 0.8, typingMs * 1.2));
    await chat.clearState();
    await sleep(randInt(1000, 3000));

    await client.sendMessage(chatId, message);

    await updateOfferSent(lead.phone);
    markContacted(outreachPhone);
    if (outreachPhone !== lead.phone) markContacted(lead.phone);

    const roleInfo = lead.contactRole ? ` [${lead.contactRole}]` : '';
    const nameInfo = lead.contactName ? ` — ${lead.contactName}` : '';
    console.log(`[Gifting] ✓ Sent → ${lead.companyName}${nameInfo}${roleInfo} | ${outreachPhone}`);
    return true;

  } catch (err) {
    console.error(`[Gifting] ✗ Failed ${outreachPhone}: ${err.message}`);
    return false;
  }
}

export async function destroyWhatsApp() {
  if (client) {
    await client.destroy();
    console.log('[Gifting WA] Session closed.');
  }
}
