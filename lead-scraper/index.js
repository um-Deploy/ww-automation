import 'dotenv/config';
import cron from 'node-cron';
import { runDailyJob, runSendOnly, runFollowUp } from './src/job.js';
import { initAllAccounts, destroyAllAccounts } from './src/outreach/accountManager.js';
import { INDUSTRY_QUERIES, CITIES } from './src/scraper/queries.js';
import { MEDIA_DIR } from './src/outreach/followUp.js';
import fs from 'fs';

// ── CLI args ──────────────────────────────────────────────────────────────────
// node lead-scraper/index.js                            → scrape all + send
// node lead-scraper/index.js --send-only                → send unsent (no scrape)
// node lead-scraper/index.js --follow-up                → send media to already-contacted
// node lead-scraper/index.js --industry=leather         → leather only
// Combine: --send-only --industry=footwear

const args       = process.argv.slice(2);
const sendOnly   = args.includes('--send-only');
const followUp   = args.includes('--follow-up');
const indArg     = args.find(a => a.startsWith('--industry='));
const cityArg    = args.find(a => a.startsWith('--city='));
const industry   = indArg  ? indArg.split('=')[1].toLowerCase()  : null;
const cityFilter = cityArg ? cityArg.split('=')[1] : null;
const validInds  = Object.keys(INDUSTRY_QUERIES);

if (industry && !validInds.includes(industry)) {
  console.error(`[Error] Invalid industry "${industry}". Valid: ${validInds.join(', ')}`);
  process.exit(1);
}

if (cityFilter) {
  const validCities = CITIES.map(c => c.toLowerCase());
  if (!validCities.includes(cityFilter.toLowerCase())) {
    console.warn(`[Warning] "${cityFilter}" not in default city list (${CITIES.join(', ')}) — will still attempt scrape.`);
  }
}

async function main() {
  const accounts   = (process.env.WA_ACCOUNTS || '').split(',').filter(Boolean);
  const maxPerAcc  = parseInt(process.env.MAX_PER_ACCOUNT || '15', 10);
  const mode       = followUp ? 'Follow-Up (media)' : sendOnly ? 'Send-Only' : 'Scrape + Send';

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   USK Laser — Lead Scraper & Outreach Agent  ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Mode      : ${mode}`);
  console.log(`  Industry  : ${industry || 'All'}`);
  console.log(`  City      : ${cityFilter || 'All (Kanpur, Lucknow, Unnao, Agra, Kannauj)'}`);
  console.log(`  Accounts  : ${accounts.length} (${accounts.join(', ')})`);
  console.log(`  Daily cap : ${accounts.length} × ${maxPerAcc} = ${accounts.length * maxPerAcc} messages/day`);
  console.log(`  DRY RUN   : ${process.env.DRY_RUN === 'true' ? 'YES' : 'NO'}`);

  if (followUp) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    const mediaFiles = fs.readdirSync(MEDIA_DIR).filter(f => /\.(jpg|jpeg|png|mp4|pdf|gif|webp)$/i.test(f));
    console.log(`  Media     : ${mediaFiles.length > 0 ? mediaFiles.join(', ') : '⚠ No files in lead-scraper/media/'}`);
  }
  console.log('');

  if (process.env.DRY_RUN !== 'true') {
    await initAllAccounts();
  } else {
    console.log('[Startup] DRY_RUN=true — WhatsApp skipped.\n');
  }

  if (followUp) {
    await runFollowUp(industry, cityFilter);
    await destroyAllAccounts();
    process.exit(0);
  } else if (sendOnly) {
    await runSendOnly(industry, cityFilter);
    await destroyAllAccounts();
    process.exit(0);
  } else {
    await runDailyJob(industry, cityFilter);
    cron.schedule('30 9 * * 0-6', async () => {
      console.log('\n[Cron] 9:30 AM IST — running daily job...');
      await runDailyJob(industry, cityFilter);
    }, { timezone: 'Asia/Kolkata' });
    console.log('\n[Cron] Scheduled daily 9:30 AM IST. Press Ctrl+C to stop.\n');
  }
}

main().catch(err => { console.error('[Fatal]', err.message); process.exit(1); });

process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Stopping...');
  await destroyAllAccounts();
  process.exit(0);
});
