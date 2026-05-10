import { INDUSTRY_QUERIES, CITIES } from './queries.js';
import { scrapeGoogleMaps } from './scraper/googleMaps.js';
import { enrichLeads } from './scraper/contactEnricher.js';
import { isAlreadyContacted } from './storage/seenPhones.js';
import { wasScrapedToday, markScraped } from './storage/scrapedQueries.js';
import { logProspect, initProspectsSheet } from './storage/prospectsSheet.js';
import { getUnsentLeads } from './storage/unsentLeads.js';
import { getGiftingMessage } from './outreach/templates.js';
import { sendGiftingOffer } from './outreach/whatsappSender.js';

const MAX_OUTREACH  = parseInt(process.env.MAX_OUTREACH_PER_RUN || '15', 10);
const MAX_ENRICH    = parseInt(process.env.MAX_ENRICH_PER_RUN || '30', 10);
const DRY_RUN       = process.env.DRY_RUN === 'true';
const SKIP_ENRICH   = process.env.SKIP_ENRICH === 'true'; // set true to skip website parsing

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function humanGap() {
  const base  = 60_000;
  const extra = Math.floor(Math.random() * 120_000);
  const bonus = Math.random() < 0.2 ? Math.floor(Math.random() * 120_000) : 0;
  return base + extra + bonus;
}

// ── Scrape phase ──────────────────────────────────────────────────────────────

export async function scrapeIndustry(industry) {
  const keywords = INDUSTRY_QUERIES[industry];
  if (!keywords) {
    console.error(`[Scraper] Unknown industry: "${industry}". Valid: ${Object.keys(INDUSTRY_QUERIES).join(', ')}`);
    return [];
  }

  await initProspectsSheet();
  const newLeads = [];

  for (const city of CITIES) {
    for (const keyword of keywords) {
      if (wasScrapedToday(keyword, city)) {
        console.log(`[Scraper] Skip (already today) — "${keyword} ${city}"`);
        continue;
      }

      console.log(`[Scraper] Scraping "${keyword} ${city}"...`);
      try {
        const rawLeads = await scrapeGoogleMaps(`${keyword} ${city}`, industry, city, 15);
        markScraped(keyword, city);

        const fresh = rawLeads.filter(l => !isAlreadyContacted(l.phone));
        newLeads.push(...fresh);
        console.log(`[Scraper] +${rawLeads.length} found | ${fresh.length} new | ${newLeads.length} total`);
      } catch (err) {
        console.error(`[Scraper] Error: "${keyword} ${city}" — ${err.message}`);
      }

      await sleep(1500);
    }
  }

  return newLeads;
}

// ── Enrich phase: visit websites to find decision maker contacts ──────────────

async function enrichPhase(leads) {
  if (SKIP_ENRICH) {
    console.log('[Enrich] Skipped (SKIP_ENRICH=true).');
    return leads;
  }

  const toEnrich = leads.slice(0, MAX_ENRICH);
  console.log(`\n[Enrich] Enriching ${toEnrich.length} leads for decision maker contacts...`);

  const enriched = await enrichLeads(toEnrich, 2);

  // Log enrichment results
  let withContact = 0;
  for (const l of enriched) {
    if (l.contactEmail || l.contactName) withContact++;
  }
  console.log(`[Enrich] Done — ${withContact}/${enriched.length} leads have named contact or email.`);

  // Persist enriched leads to CSV/Sheets
  for (const lead of enriched) {
    await logProspect(lead).catch(() => {});
  }

  return enriched;
}

// ── Outreach phase ────────────────────────────────────────────────────────────

async function sendToLeads(leads) {
  const toContact = leads.slice(0, MAX_OUTREACH);
  console.log(`\n[Outreach] Sending to ${toContact.length} leads (cap: ${MAX_OUTREACH})...`);

  let sent = 0, skipped = 0, failed = 0;

  for (const lead of toContact) {
    const outreachPhone = lead.contactPhone && lead.contactPhone !== lead.phone
      ? lead.contactPhone
      : lead.phone;

    if (isAlreadyContacted(outreachPhone)) {
      console.log(`[Outreach] Already contacted ${outreachPhone} — skip`);
      skipped++;
      continue;
    }

    const message = getGiftingMessage(lead);

    if (DRY_RUN) {
      const roleInfo = lead.contactRole ? ` [${lead.contactRole}]` : '';
      const nameInfo = lead.contactName ? ` — ${lead.contactName}` : '';
      console.log(`[DryRun] Would send → ${lead.companyName}${nameInfo}${roleInfo} | ${outreachPhone} | ${lead.industry}/${lead.city}`);
      sent++;
      continue;
    }

    const ok = await sendGiftingOffer(lead, message);
    if (ok) {
      sent++;
      const gap = humanGap();
      console.log(`[Outreach] Waiting ${Math.round(gap / 1000)}s before next...`);
      await sleep(gap);
    } else {
      failed++;
    }
  }

  console.log(`\n[Outreach] Done — Sent: ${sent} | Skipped: ${skipped} | Failed: ${failed}`);
}

// ── Job modes ─────────────────────────────────────────────────────────────────

export async function runDailyJob(industryFilter = null) {
  const startedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[GiftingJob] Started — ${startedAt}`);
  if (industryFilter) console.log(`[GiftingJob] Industry filter: ${industryFilter}`);
  if (DRY_RUN) console.log('[GiftingJob] DRY_RUN=true — no messages sent.');
  console.log('─'.repeat(60));

  const industries = industryFilter ? [industryFilter] : Object.keys(INDUSTRY_QUERIES);
  const allNew = [];

  for (const industry of industries) {
    console.log(`\n[Job] Industry: ${industry.toUpperCase()}`);
    const leads = await scrapeIndustry(industry);
    allNew.push(...leads);
  }

  console.log(`\n[Job] Scraping done — ${allNew.length} new leads.`);

  if (allNew.length === 0) {
    console.log('[Job] No new leads found today.');
    return;
  }

  const enriched = await enrichPhase(allNew);
  await sendToLeads(enriched);
  console.log('─'.repeat(60));
}

export async function runSendOnly(industryFilter = null) {
  const startedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[SendOnly] Started — ${startedAt}`);
  if (DRY_RUN) console.log('[SendOnly] DRY_RUN=true — no messages sent.');
  console.log('─'.repeat(60));

  const leads = getUnsentLeads(industryFilter);
  console.log(`[SendOnly] ${leads.length} unsent leads in CSV.`);

  if (leads.length === 0) {
    console.log('[SendOnly] Nothing to send. Run scrape mode first.');
    return;
  }

  await sendToLeads(leads);
  console.log('─'.repeat(60));
}

export async function runScrapeOnly(industryFilter = null) {
  const startedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[ScrapeOnly] Started — ${startedAt}`);
  console.log('─'.repeat(60));

  await initProspectsSheet();
  const industries = industryFilter ? [industryFilter] : Object.keys(INDUSTRY_QUERIES);
  const allNew = [];

  for (const industry of industries) {
    const leads = await scrapeIndustry(industry);
    allNew.push(...leads);
  }

  console.log(`\n[ScrapeOnly] ${allNew.length} new leads scraped.`);

  if (allNew.length > 0) {
    const enriched = await enrichPhase(allNew);
    console.log(`[ScrapeOnly] ${enriched.length} leads saved to CSV/Sheets.`);
  }

  console.log('─'.repeat(60));
}
