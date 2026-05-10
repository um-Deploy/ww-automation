import { INDUSTRY_QUERIES, CITIES } from './scraper/queries.js';
import { scrapeGoogleMaps } from './scraper/googleMaps.js';
import { isAlreadyContacted, markContacted } from './storage/seenPhones.js';
import { wasScrapedToday, markScraped } from './storage/scrapedQueries.js';
import { logProspect, initProspectsSheet, updateOfferSent } from './storage/prospectsSheet.js';
import { getUnsentLeads } from './storage/unsentLeads.js';
import { getOfferMessage } from './outreach/templates.js';
import { getReadyAccounts, sendFromAccount, sendFollowUp } from './outreach/accountManager.js';
import { getFollowUpTargets, getMediaFiles, markFollowUpSent } from './outreach/followUp.js';

const MAX_PER_ACCOUNT = parseInt(process.env.MAX_PER_ACCOUNT || '15', 10);
const DRY_RUN         = process.env.DRY_RUN === 'true';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function humanGap() {
  return 60_000 + Math.floor(Math.random() * 120_000) +
    (Math.random() < 0.2 ? Math.floor(Math.random() * 120_000) : 0);
}

// ── Shared queue — accounts pull from this concurrently ──────────────────────

class LeadQueue {
  constructor(leads) {
    this._leads = leads.filter(l => !isAlreadyContacted(l.phone));
    this._idx   = 0;
    this.total  = this._leads.length;
  }
  next() {
    while (this._idx < this._leads.length) {
      const lead = this._leads[this._idx++];
      if (!isAlreadyContacted(lead.phone)) return lead;
    }
    return null;
  }
  get remaining() { return Math.max(0, this._leads.length - this._idx); }
}

// ── Scrape ────────────────────────────────────────────────────────────────────

export async function scrapeIndustry(industry, cityFilter = null) {
  const keywords = INDUSTRY_QUERIES[industry];
  if (!keywords) {
    console.error(`[Scraper] Unknown industry "${industry}". Valid: ${Object.keys(INDUSTRY_QUERIES).join(', ')}`);
    return [];
  }
  await initProspectsSheet();
  const newLeads = [];

  // If city filter provided, use only that city; otherwise use all default cities
  const citiesToScrape = cityFilter
    ? [cityFilter.charAt(0).toUpperCase() + cityFilter.slice(1).toLowerCase()]
    : CITIES;

  for (const city of citiesToScrape) {
    for (const keyword of keywords) {
      if (wasScrapedToday(keyword, city)) {
        console.log(`[Scraper] Already scraped today — skipping "${keyword} ${city}"`);
        continue;
      }
      console.log(`[Scraper] "${keyword} ${city}"...`);
      try {
        const results = await scrapeGoogleMaps(keyword, industry, city, 15);
        markScraped(keyword, city);
        for (const lead of results) {
          if (!isAlreadyContacted(lead.phone)) { newLeads.push(lead); await logProspect(lead); }
        }
        console.log(`[Scraper] +${results.length} found | ${newLeads.length} new total`);
      } catch (err) { console.error(`[Scraper] Error: ${err.message}`); }
      await sleep(1500);
    }
  }
  return newLeads;
}

// ── Outreach — sequential accounts, shared queue, no failed-phone retries ────

async function sendToLeads(leads) {
  const accs = getReadyAccounts();
  if (!accs.length) { console.error('[Outreach] No WhatsApp accounts ready.'); return; }

  const totalCap   = MAX_PER_ACCOUNT * accs.length;
  const queue      = new LeadQueue(leads);
  const failedNums = new Set(); // track failures this session — don't retry

  console.log(`\n[Outreach] ${accs.length} account(s) ready`);
  console.log(`[Outreach] ${MAX_PER_ACCOUNT}/account × ${accs.length} = ${totalCap} total cap`);
  console.log(`[Outreach] ${queue.total} eligible leads in queue\n`);

  // Run accounts ONE AT A TIME — parallel browsers crash on same machine
  const results = [];
  for (const acc of accs) {
    const r = await runBatch(acc, queue, failedNums);
    results.push(r);
  }

  // Summary
  console.log('\n' + '─'.repeat(55));
  console.log('[Outreach] Per-account summary:');
  let totalSent = 0;
  results.forEach(r => {
    const remaining = MAX_PER_ACCOUNT - r.sent;
    console.log(`  Account ${r.index} (${r.phone}): Sent ${r.sent} | Skipped ${r.skipped} | Failed ${r.failed} | Limit left: ${remaining}`);
    totalSent += r.sent;
  });
  console.log(`\n  Total sent: ${totalSent} | Leads still in queue: ${queue.remaining}`);
  console.log('─'.repeat(55));
}

async function runBatch(acc, queue, failedNums) {
  let sent = 0, skipped = 0, failed = 0;
  const MAX_PULLS = MAX_PER_ACCOUNT + 10; // allow some skips but don't drain entire queue
  let pulls = 0;

  while (sent < MAX_PER_ACCOUNT && pulls < MAX_PULLS) {
    const lead = queue.next();
    pulls++;
    if (!lead) break;

    // Skip phones that failed earlier this session
    if (failedNums.has(lead.phone)) { skipped++; continue; }

    const message = getOfferMessage(lead);

    if (DRY_RUN) {
      console.log(`[DryRun][Acc ${acc.index}] → ${lead.name} | ${lead.phone}`);
      sent++; continue;
    }

    const result = await sendFromAccount(acc, lead, message, { updateOfferSent, markContacted });

    if (result === true) {
      sent++;
      const gap = humanGap();
      console.log(`[Account ${acc.index}] Waiting ${Math.round(gap / 1000)}s...`);
      await sleep(gap);
    } else if (result === 'crashed') {
      console.warn(`[Account ${acc.index}] Session dead — stopping this account's batch.`);
      break; // stop using this account
    } else if (['outside_hours', 'not_on_wa', 'invalid'].includes(result)) {
      skipped++;
    } else {
      failed++;
      failedNums.add(lead.phone);
    }
  }

  return { index: acc.index, phone: acc.phone, sent, skipped, failed };
}

// ── Follow-up mode ────────────────────────────────────────────────────────────

async function sendFollowUps(industryFilter, cityFilter = null) {
  const accs    = getReadyAccounts();
  if (!accs.length) { console.error('[FollowUp] No WhatsApp accounts ready.'); return; }

  const targets = getFollowUpTargets(industryFilter, cityFilter);
  const media   = getMediaFiles();

  console.log(`\n[FollowUp] ${targets.length} leads to follow up`);
  console.log(`[FollowUp] Media files: ${media.length > 0 ? media.map(f => f.split(/[\\/]/).pop()).join(', ') : 'none found in lead-scraper/media/'}`);

  if (media.length === 0) {
    console.warn('[FollowUp] No media files found. Add photos/videos/PDFs to lead-scraper/media/ and retry.');
    return;
  }

  const totalCap = MAX_PER_ACCOUNT * accs.length;
  const queue    = new LeadQueue(targets.map(l => ({ ...l, _followUp: true })));

  console.log(`[FollowUp] Cap: ${totalCap} | Queue: ${queue.total}\n`);

  const followUpMessage = process.env.FOLLOWUP_MESSAGE ||
    `Namaskar! 🙏\n\nHum *USK Laser* ki taraf se apni services ki jankari share kar rahe hain.\nPlease hamari profile aur work samples dekhein.\n\n📞 ${process.env.OUTREACH_PHONE || ''}`;

  const results = [];
  for (const acc of accs) {
    const r = await runFollowUpBatch(acc, queue, followUpMessage, media);
    results.push(r);
  }

  console.log('\n' + '─'.repeat(55));
  console.log('[FollowUp] Summary:');
  let totalSent = 0;
  results.forEach(r => {
    console.log(`  Account ${r.index}: Sent ${r.sent} | Skipped ${r.skipped} | Failed ${r.failed} | Limit left: ${MAX_PER_ACCOUNT - r.sent}`);
    totalSent += r.sent;
  });
  console.log(`\n  Total follow-ups sent: ${totalSent} | Remaining: ${queue.remaining}`);
  console.log('─'.repeat(55));
}

async function runFollowUpBatch(acc, queue, message, media) {
  let sent = 0, skipped = 0, failed = 0;

  while (sent + skipped + failed < MAX_PER_ACCOUNT) {
    const lead = queue.next();
    if (!lead) break;

    if (DRY_RUN) {
      console.log(`[DryRun][Acc ${acc.index}] Follow-up → ${lead.name} | ${lead.phone} | ${media.length} file(s)`);
      sent++; continue;
    }

    const result = await sendFollowUp(acc, lead, message, media, { markFollowUpSent });

    if (result === true) {
      sent++;
      const gap = humanGap();
      console.log(`[Account ${acc.index}] Waiting ${Math.round(gap / 1000)}s...`);
      await sleep(gap);
    } else if (['outside_hours', 'not_on_wa', 'invalid'].includes(result)) {
      skipped++;
    } else {
      failed++;
    }
  }

  return { index: acc.index, phone: acc.phone, sent, skipped, failed };
}

// ── Public modes ──────────────────────────────────────────────────────────────

export async function runDailyJob(industryFilter = null, cityFilter = null) {
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`[Job] Scrape + Send | ${ts}`);
  console.log(`[Job] Industry: ${industryFilter || 'All'} | City: ${cityFilter || 'All'}`);
  if (DRY_RUN) console.log('[Job] DRY_RUN — no messages sent.');
  console.log('─'.repeat(55));

  const industries = industryFilter ? [industryFilter] : Object.keys(INDUSTRY_QUERIES);
  const all = [];
  for (const ind of industries) { all.push(...(await scrapeIndustry(ind, cityFilter))); }

  console.log(`\n[Job] Scraping done — ${all.length} new leads.`);
  await sendToLeads(all);
}

export async function runSendOnly(industryFilter = null, cityFilter = null) {
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`[SendOnly] ${ts} | Industry: ${industryFilter || 'All'} | City: ${cityFilter || 'All'}`);
  if (DRY_RUN) console.log('[SendOnly] DRY_RUN — no messages sent.');
  console.log('─'.repeat(55));

  const leads = getUnsentLeads(industryFilter, cityFilter);
  console.log(`[SendOnly] ${leads.length} unsent leads in prospects.csv`);
  if (!leads.length) { console.log('[SendOnly] Nothing to send.'); return; }
  await sendToLeads(leads);
}

export async function runFollowUp(industryFilter = null, cityFilter = null) {
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`[FollowUp] ${ts} | Industry: ${industryFilter || 'All'} | City: ${cityFilter || 'All'}`);
  if (DRY_RUN) console.log('[FollowUp] DRY_RUN — no messages sent.');
  console.log('─'.repeat(55));
  await sendFollowUps(industryFilter, cityFilter);
}
