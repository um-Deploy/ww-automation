import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { handleMessage } from './messageHandler.js';

/**
 * Creates, configures and returns a ready WhatsApp client.
 * The session is persisted to .wwebjs_auth/ so you only need to scan QR once.
 */
export function createWhatsAppClient() {
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: 'new',
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

  // ── Scan QR to link WhatsApp (only needed once) ────────────────────────
  client.on('qr', (qr) => {
    console.log('\n[WhatsApp] Scan the QR code below with your WhatsApp to link the session:\n');
    qrcode.generate(qr, { small: true });
    console.log('\nWaiting for scan...\n');
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Authenticated successfully. Session saved.');
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Authentication failed:', msg);
    process.exit(1);
  });

  client.on('ready', () => {
    console.log('[WhatsApp] Client is ready. Listening for messages...');
  });

  client.on('disconnected', (reason) => {
    console.warn('[WhatsApp] Disconnected:', reason);
    console.log('[WhatsApp] Attempting to reconnect...');
    client.initialize();
  });

  // ── Route incoming messages ────────────────────────────────────────────
  client.on('message', (message) => handleMessage(message));

  return client;
}
