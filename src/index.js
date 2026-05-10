import 'dotenv/config';
import express from 'express';
import { createWhatsAppClient } from './whatsapp/client.js';
import { initSheet } from './sheets/googleSheets.js';
import { getAllLeads } from './state/leadState.js';
import { config } from './config/loader.js';

// ── Validate required env vars ─────────────────────────────────────────────
// Groq is required — bot can't answer questions without it
if (!process.env.GROQ_API_KEY) {
  console.error('[Startup] GROQ_API_KEY is missing. Get a free key at https://console.groq.com');
  process.exit(1);
}
// Sheets is optional — bot works fine, leads just log to console
if (!process.env.GOOGLE_SHEET_ID) {
  console.warn('[Startup] GOOGLE_SHEET_ID not set — Google Sheets logging disabled.');
}

// ── Health-check HTTP server ───────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('/leads', (_req, res) => {
  const leads = getAllLeads().map((l) => ({
    phone: l.phone,
    name: l.name,
    stage: l.stage,
    business: l.business,
    budget: l.budget,
    timeline: l.timeline,
    nextSteps: l.nextSteps,
    lastContact: l.lastContact,
  }));
  res.json({ count: leads.length, leads });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  console.log(`[Server] Lead dashboard: http://localhost:${PORT}/leads`);
});

// ── Initialize Google Sheets ───────────────────────────────────────────────
try {
  await initSheet();
  console.log('[Sheets] Google Sheets initialized.');
} catch (err) {
  console.warn('[Sheets] Could not initialize Google Sheets (check credentials):', err.message);
}

// ── Start WhatsApp client ──────────────────────────────────────────────────
console.log('[Startup] Starting Woodwaley WhatsApp Bot...');
console.log(`[Startup] Business: ${config.business.businessName}`);
console.log(`[Startup] Agent: ${config.business.agentName}`);
console.log(`[Startup] Website: ${config.business.website}`);

const whatsappClient = createWhatsAppClient();
whatsappClient.initialize();

// ── Graceful shutdown ──────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Gracefully shutting down...');
  await whatsappClient.destroy();
  process.exit(0);
});
