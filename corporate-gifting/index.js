import 'dotenv/config';
import cron from 'node-cron';
import { runDailyJob, runSendOnly, runScrapeOnly } from './src/job.js';
import { initWhatsApp, destroyWhatsApp } from './src/outreach/whatsappSender.js';
import { INDUSTRY_QUERIES } from './src/queries.js';

// ── CLI argument parsing ──────────────────────────────────────────────────────
// Usage:
//   node corporate-gifting/index.js                         → scrape + enrich + send (all industries)
//   node corporate-gifting/index.js --industry=it_software  → specific industry only
//   node corporate-gifting/index.js --send-only             → send from CSV without scraping
//   node corporate-gifting/index.js --scrape-only           → scrape + enrich, save to CSV (no send)
//   node corporate-gifting/index.js --dry-run               → dry run (no messages sent)

const args       = process.argv.slice(2);
const sendOnly   = args.includes('--send-only');
const scrapeOnly = args.includes('--scrape-only');
const dryRun     = args.includes('--dry-run') || process.env.DRY_RUN === 'true';
const indArg     = args.find(a => a.startsWith('--industry='));
const industry   = indArg ? indArg.split('=')[1].toLowerCase() : null;
const validInds  = Object.keys(INDUSTRY_QUERIES);

if (industry && !validInds.includes(industry)) {
  console.error(`[Error] Invalid industry "${industry}".`);
  console.error(`Valid options: ${validInds.join(', ')}`);
  process.exit(1);
}

if (dryRun) process.env.DRY_RUN = 'true';

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Corporate Gifting Lead Scraper & Outreach Agent      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`  Mode     : ${sendOnly ? 'Send-Only' : scrapeOnly ? 'Scrape+Enrich Only' : 'Full (Scrape+Enrich+Send)'}`);
  console.log(`  Industry : ${industry || 'All (' + validInds.join(', ') + ')'}`);
  console.log(`  DRY RUN  : ${dryRun ? 'YES (no messages sent)' : 'NO (live)'}\n`);

  if (!sendOnly && !scrapeOnly && !dryRun) {
    console.log('[Startup] Initializing WhatsApp session...');
    await initWhatsApp();
  } else if (dryRun) {
    console.log('[Startup] DRY_RUN — WhatsApp skipped.\n');
  } else if (sendOnly && !dryRun) {
    console.log('[Startup] Initializing WhatsApp session for send-only mode...');
    await initWhatsApp();
  }

  // Run immediately
  if (sendOnly) {
    await runSendOnly(industry);
  } else if (scrapeOnly) {
    await runScrapeOnly(industry);
  } else {
    await runDailyJob(industry);

    // Schedule Mon–Fri at 10:00 AM IST
    cron.schedule('0 10 * * 1-5', async () => {
      console.log('\n[Cron] 10:00 AM IST — running daily gifting job...');
      await runDailyJob(industry);
    }, { timezone: 'Asia/Kolkata' });

    console.log('\n[Cron] Scheduled Mon–Fri at 10:00 AM IST. Agent running...');
    console.log('[Info] Press Ctrl+C to stop.\n');
  }
}

main().catch(err => {
  console.error('[Fatal]', err.message);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Stopping...');
  await destroyWhatsApp();
  process.exit(0);
});
