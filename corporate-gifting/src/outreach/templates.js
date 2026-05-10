const BIZ   = () => process.env.GIFTING_BUSINESS_NAME || 'WW Gifts';
const PHONE = () => process.env.GIFTING_OUTREACH_PHONE || '';
const CATALOG = () => process.env.GIFTING_CATALOG_URL || '';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function noise() { return pick(['', ' 🙏', ' ✨', ' 😊', '']); }

// Upcoming festival/occasion — auto-detect by month
function currentOccasion() {
  const month = new Date().getMonth() + 1; // 1–12
  if (month === 10 || month === 11) return 'Diwali';
  if (month === 12 || month === 1) return 'New Year';
  if (month === 3) return 'Holi';
  if (month === 8) return 'Independence Day & Raksha Bandhan';
  if (month === 9) return 'Navratri';
  if (month === 4) return 'New Financial Year';
  return 'upcoming festive season';
}

// ─────────────────────────────────────────────────────────────────────────────
// Core builders by CONTACT ROLE
// ─────────────────────────────────────────────────────────────────────────────

function hrMessage({ companyName, contactName, industry, city }) {
  const name = contactName ? `*${contactName}*` : `Team *${companyName}*`;
  const occasion = currentOccasion();
  const greeting = pick(['Namaskar', 'Hello', 'Hi']);
  const intro = pick([
    `${greeting} ${name}! 🙏\n\n`,
    `Dear ${name},\n\n`,
    `${greeting} ${name},\n\n`,
  ]);
  const body = pick([
    `Planning *${occasion}* gifts for your employees or clients?\n\n*${BIZ()}* specializes in premium *Corporate Gifting* for companies across India.\n\n🎁 *What we offer:*\n• Customized branded gifts (logo printing/engraving)\n• Bulk orders at competitive prices\n• Curated hampers — dry fruits, sweets, tech gadgets, lifestyle kits\n• Pan-India delivery with elegant packaging\n• Fast turnaround for bulk orders`,
    `As the HR team at *${companyName}*, you know how important it is to make employees & clients feel valued.\n\n*${BIZ()}* offers *premium corporate gifts* for:\n🎯 Employee appreciation & milestones\n🎯 Festival gifting (${occasion})\n🎯 Onboarding & welcome kits\n🎯 Client & vendor gifts\n\n✅ Custom branding | ✅ Bulk pricing | ✅ Pan-India delivery`,
    `Looking for *${occasion}* corporate gifts for *${companyName}*?\n\n*${BIZ()}* provides *end-to-end corporate gifting solutions*:\n\n🎁 Premium hampers & lifestyle kits\n🏷️ Logo-branded merchandise\n🛍️ Eco-friendly & sustainable gift options\n📦 Elegant packaging + bulk delivery\n💰 Best prices for orders of 50+ units`,
  ]);
  const catalog = CATALOG() ? `\n\n📖 View our catalog: ${CATALOG()}` : '';
  const cta = pick([
    `\n\nLet's discuss your gifting requirements! Call/WhatsApp: *${PHONE()}*${noise()}`,
    `\n\nHappy to share samples & pricing. Reach us at *${PHONE()}*${noise()}`,
    `\n\n*Free sample kit* available. Call/WA: *${PHONE()}*${noise()}`,
  ]);
  return `${intro}${body}${catalog}${cta}`;
}

function ownerMessage({ companyName, contactName, industry, city }) {
  const name = contactName ? `*${contactName}* ji` : `*${companyName}*`;
  const occasion = currentOccasion();
  const greeting = pick(['Namaskar', 'Namaste', 'Hello', 'Dear']);
  const intro = `${greeting} ${name},\n\n`;
  const body = pick([
    `*${occasion}* aa raha hai — kya aap is baar apne *employees aur clients* ko kuch special dena chahenge?\n\n*${BIZ()}* — Premium *Corporate Gifting* solutions:\n\n🎁 Branded hampers & gift boxes\n🏷️ Company logo ke saath personalized gifts\n💼 Bulk orders (50 se zyada) pe special pricing\n🚚 Pan-India delivery with premium packaging`,
    `As a business owner, client relationships and team morale are everything.\n\n*${BIZ()}* helps companies like *${companyName}* make a lasting impression with:\n\n✅ Custom-branded corporate gifts\n✅ Festival hampers (${occasion})\n✅ Employee milestone & appreciation gifts\n✅ Competitive bulk pricing | Fast delivery`,
    `Is ${occasion} mein apne *clients aur team* ko memorable gifts bhejein.\n\n*${BIZ()}* offers:\n🎁 Premium gift hampers\n🏷️ Logo-printed merchandise\n📦 Bulk delivery across India\n💰 Wholesale rates for 50+ units`,
  ]);
  const catalog = CATALOG() ? `\n\n📖 Catalog: ${CATALOG()}` : '';
  const cta = pick([
    `\n\nEk baar baat karte hain? *${PHONE()}*${noise()}`,
    `\n\nSample & pricing ke liye call karein: *${PHONE()}*${noise()}`,
    `\n\nInterested? WhatsApp/Call: *${PHONE()}*${noise()}`,
  ]);
  return `${intro}${body}${catalog}${cta}`;
}

function procurementMessage({ companyName, contactName, industry, city }) {
  const name = contactName ? `*${contactName}*` : `Procurement Team, *${companyName}*`;
  const occasion = currentOccasion();
  const intro = pick([
    `Dear ${name},\n\n`,
    `Hello ${name},\n\n`,
    `Namaskar ${name},\n\n`,
  ]);
  const body = pick([
    `We are *${BIZ()}* — a trusted *Corporate Gifting* vendor serving companies across India.\n\nLooking for a reliable gifting partner for *${occasion}* or employee/client appreciation?\n\n📋 *Why choose us:*\n✅ GST invoice provided\n✅ Bulk pricing with volume discounts\n✅ Custom branding & packaging\n✅ Timely delivery with tracking\n✅ Min order: 25 units | Pan-India delivery`,
    `*${BIZ()}* provides premium *Corporate Gifting solutions* for procurement teams.\n\n🎁 Categories: Tech accessories, Lifestyle kits, Dry fruit hampers, Branded stationery, Eco-friendly gifts\n\n💰 Competitive bulk pricing\n🏷️ Logo branding on request\n📄 GST bill | Quality assured\n📦 Delivered anywhere in India`,
  ]);
  const catalog = CATALOG() ? `\n\n📖 Product catalog: ${CATALOG()}` : '';
  const cta = pick([
    `\n\nShare your requirements for a custom quote: *${PHONE()}*${noise()}`,
    `\n\nCall/WA for bulk pricing: *${PHONE()}*${noise()}`,
  ]);
  return `${intro}${body}${catalog}${cta}`;
}

function adminMessage({ companyName, contactName, industry, city }) {
  const name = contactName ? `*${contactName}*` : `Admin Team, *${companyName}*`;
  const occasion = currentOccasion();
  const intro = pick([`Hello ${name},\n\n`, `Namaskar ${name},\n\n`, `Hi ${name},\n\n`]);
  const body = pick([
    `Planning *${occasion}* gifts or employee appreciation at *${companyName}*?\n\n*${BIZ()}* handles *bulk corporate gifting* with:\n🎁 Ready-to-ship premium gift boxes\n🏷️ Custom logo branding\n📦 Bulk delivery | Elegant packaging\n💰 Special rates for offices & corporates`,
    `*${BIZ()}* — Corporate gifting made easy for office managers & admin teams.\n\n✅ One-stop gifting for ${occasion}, employee milestones, client appreciation\n✅ Customized hampers with your company branding\n✅ GST invoicing | Bulk discounts\n✅ Pan-India delivery`,
  ]);
  const catalog = CATALOG() ? `\n\n📖 See our catalog: ${CATALOG()}` : '';
  const cta = pick([
    `\n\nLet's plan your gifting together! Call/WA: *${PHONE()}*${noise()}`,
    `\n\nSample available — *${PHONE()}*${noise()}`,
  ]);
  return `${intro}${body}${catalog}${cta}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Industry-specific add-ons (appended to base message)
// ─────────────────────────────────────────────────────────────────────────────

const INDUSTRY_LINES = {
  it_software: '\n\n💡 *Popular with IT companies:* Tech accessories, branded power banks, wireless earbuds, laptop bags, desk kits.',
  pharma: '\n\n💡 *Popular with pharma companies:* Wellness kits, premium pens, branded diaries, health hampers.',
  banking_finance: '\n\n💡 *Popular with banks & finance firms:* Premium leather diaries, corporate pen sets, dry fruit hampers, desk organizers.',
  real_estate: '\n\n💡 *Popular with real estate companies:* Premium hampers, branded merchandise, luxury gifting boxes for clients.',
  manufacturing: '\n\n💡 *Popular for manufacturing corps:* Safety & utility kits, branded tools bags, festival hampers for workers & management.',
  consulting: '\n\n💡 *Popular with consulting firms:* Executive gift sets, branded stationery, luxury pen sets, premium diaries.',
  automobile: '\n\n💡 *Popular with auto companies:* Car accessory kits, premium car fresheners, travel kits, luxury hampers for customers.',
  hospitality: '\n\n💡 *Popular with hotels & hospitality:* Branded amenity kits, premium tray sets, festival hampers for staff & guests.',
  fmcg: '\n\n💡 *Popular with FMCG companies:* Custom food hampers, branded merchandise, eco-friendly gift bags.',
  education: '\n\n💡 *Popular with education institutes:* Branded stationery kits, academic achievement gifts, merit award sets.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function getGiftingMessage(lead) {
  const role = (lead.contactRole || '').toLowerCase();
  let base;

  if (role.includes('hr') || role.includes('human resource') || role.includes('people') || role.includes('talent')) {
    base = hrMessage(lead);
  } else if (role.includes('owner') || role.includes('director') || role.includes('md') || role.includes('ceo') || role.includes('founder') || role.includes('president')) {
    base = ownerMessage(lead);
  } else if (role.includes('procurement') || role.includes('purchase') || role.includes('sourcing') || role.includes('vendor')) {
    base = procurementMessage(lead);
  } else if (role.includes('admin') || role.includes('office manager') || role.includes('facilities')) {
    base = adminMessage(lead);
  } else {
    // Unknown role — use HR message as default (most common gifting decision maker)
    base = hrMessage(lead);
  }

  const industryLine = INDUSTRY_LINES[lead.industry] || '';
  return base + industryLine;
}
