import { getLead, updateLead, addMessage } from '../state/leadState.js';
import { getAIReply, needsAI } from '../agent/llm.js';
import { sendCatalog } from '../catalog/sender.js';
import { logLeadToSheet } from '../sheets/googleSheets.js';
import { config } from '../config/loader.js';
import { replyWithDelay, sendMediaWithDelay } from '../utils/reply.js';
import { parseBudget, getProductsByBudget, isBudgetQuery } from '../utils/priceFilter.js';
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;

const WEBSITE = 'https://woodwaley.in/';

// ── Static message builders (zero AI cost) ───────────────────────────────────

function welcomeMenu() {
  return (
    `✨ *Welcome to Woodwaley!* ✨\n` +
    `_${config.business.tagline}_\n\n` +
    `Handcrafted wooden gifts & décor — personalised, premium, made with love. 🪵🎁\n\n` +
    `1️⃣ View Products\n` +
    `2️⃣ Price Details\n` +
    `3️⃣ Place an Order\n` +
    `4️⃣ Talk to Support\n\n` +
    `Reply with a number 👇`
  );
}

function productsMenu() {
  const personal = config.products.personalGifting.categories
    .map(c => `*${c.name}*\n` + c.items.map(i => `  • ${i.name}`).join('\n'))
    .join('\n\n');

  const corporate = config.products.corporate.categories
    .map(c => `*${c.name}*\n` + c.items.map(i => `  • ${i.name}`).join('\n'))
    .join('\n\n');

  return (
    `🎁 *Our Products*\n\n` +
    `🌸 *Personal Gifting*\n${personal}\n\n` +
    `🏢 *Corporate / Bulk*\n${corporate}\n\n` +
    `📖 Our full catalogue is coming soon on our website!\n` +
    `👉 ${WEBSITE}\n\n` +
    `💬 _Ask me about any product — details, pricing, photos, customisation!_\n` +
    `_Or type *menu* to go back._`
  );
}

function priceMenu() {
  const personalRanges = config.products.personalGifting.budgetRanges
    .map(b => `  ${b.label} — ${b.description}`)
    .join('\n');

  const personal = config.products.personalGifting.categories
    .flatMap(c => c.items.map(i => `  • ${i.name}: *${i.priceRange}*`))
    .join('\n');

  const corporate = config.products.corporate.categories
    .flatMap(c => c.items.map(i => `  • ${i.name}: *${i.priceRange}*`))
    .join('\n');

  return (
    `💰 *Woodwaley Price Guide*\n\n` +
    `🌸 *Personal Gifts — Budget Ranges*\n${personalRanges}\n\n` +
    `📦 *Personal Gift Prices*\n${personal}\n\n` +
    `🏢 *Corporate / Bulk Prices*\n${corporate}\n\n` +
    `📌 _Prices vary by size, material & customisation. All prices in ₹._\n` +
    `👉 ${WEBSITE}\n\n` +
    `💬 _Tell me your budget and I'll suggest the best options!\n` +
    `Or type *3* to place an order._`
  );
}

function supportMessage(name) {
  return (
    `🙋 *Support Request Received!*\n\n` +
    `Thank you${name ? `, *${name}*` : ''}! 🙏\n` +
    `Our team will reach out to you on WhatsApp shortly.\n\n` +
    `Meanwhile, browse our store: ${WEBSITE}\n\n` +
    `_Type *menu* to return to the main menu._`
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseMenuChoice(body) {
  const m = body.trim().match(/^[^\d]*([1-4])[^\d]*$/);
  return m ? parseInt(m[1]) : null;
}

function isResetTrigger(body) {
  return ['menu', 'back', '0', 'hi', 'hello', 'hey', 'hii', 'helo', 'start', 'restart', 'hiya', 'hai'].includes(body.toLowerCase().trim());
}

// ── Order flow ────────────────────────────────────────────────────────────────

const ORDER_STEPS_PERSONAL = [
  { key: 'leadType',             prompt: `Are you ordering for:\n1️⃣ Personal gift\n2️⃣ Corporate / Bulk order\n\nReply *1* or *2* 👇` },
  { key: 'name',                 prompt: `What's your *name*? 😊` },
  { key: 'occasion',             prompt: `What's the *occasion*?\n_(e.g. Birthday, Anniversary, Diwali, Home décor…)_` },
  { key: 'productInterest',      prompt: `Which *product* are you interested in?\n\n_Not sure? Type *products* to browse, or describe what you need!_` },
  { key: 'customisationDetails', prompt: `Any *customisation*? 🎨\n_(Name to engrave, message, photo, colour…)\nType "none" if not needed._` },
  { key: 'deliveryLocation',     prompt: `Your *delivery city / location?* 📍` },
  { key: 'deliveryDate',         prompt: `When do you need it by? 📅\n_Share a date or say "ASAP" / "flexible"_` },
];

const ORDER_STEPS_CORPORATE = [
  { key: 'leadType',       prompt: `Are you ordering for:\n1️⃣ Personal gift\n2️⃣ Corporate / Bulk order\n\nReply *1* or *2* 👇` },
  { key: 'name',           prompt: `Your *name*? 😊` },
  { key: 'companyName',    prompt: `Your *company name*?` },
  { key: 'occasion',       prompt: `What's the *occasion / purpose*?\n_(Diwali gifts, onboarding kits, event décor…)_` },
  { key: 'productInterest',prompt: `Which *type of product* interests you?\n_Type *products* to see our corporate range._` },
  { key: 'quantity',       prompt: `Approximate *quantity* needed? (number of units)` },
  { key: 'budget',         prompt: `*Budget per unit?* _(approximate is fine)_` },
  { key: 'timeline',       prompt: `*Delivery timeline?* _(event date or approximate)_` },
  { key: 'brandingRequired',prompt:`Do you need *branding* on packaging?\n_(Logo printing, custom boxes, ribbons…)_\nReply *Yes* or *No*` },
];

function getOrderSteps(leadType) {
  return leadType === 'corporate' ? ORDER_STEPS_CORPORATE : ORDER_STEPS_PERSONAL;
}

function orderSummary(lead) {
  const isPersonal = lead.leadType === 'personal';
  const rows = [
    `📋 *Order Summary — Woodwaley*\n`,
    `👤 Name: ${lead.name}`,
    !isPersonal ? `🏢 Company: ${lead.companyName}` : null,
    `🎯 Occasion: ${lead.occasion}`,
    `🛍️ Product: ${lead.productInterest}`,
    !isPersonal ? `📦 Quantity: ${lead.quantity}` : null,
    lead.budget ? `💰 Budget: ${lead.budget}` : null,
    isPersonal  ? `✏️ Customisation: ${lead.customisationDetails}` : null,
    isPersonal  ? `📍 Delivery: ${lead.deliveryLocation}` : null,
    isPersonal  ? `📅 Needed by: ${lead.deliveryDate}` : null,
    !isPersonal ? `📅 Timeline: ${lead.timeline}` : null,
    !isPersonal ? `🎨 Branding: ${lead.brandingRequired ? 'Yes ✅' : 'No'}` : null,
  ].filter(Boolean).join('\n');

  const closing = isPersonal
    ? `\n\n✅ *All noted!* Our team will confirm your order and share a *payment link* shortly. 🎁\n\n` +
      `Questions? Visit ${WEBSITE} or just reply here!`
    : `\n\n✅ *All noted!* Our team will send you a *formal quote within 24 hours*. 🏢\n\n` +
      `Questions? Visit ${WEBSITE}`;

  return rows + closing;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function handleMessage(message) {
  if (message.isGroupMsg || message.from === 'status@broadcast' || message.fromMe) return;

  const phone = message.from.replace('@c.us', '');
  const body  = message.body?.trim();
  if (!body) return;

  console.log(`[${phone}] "${body}"`);

  const lead = getLead(phone);

  try {
    // ── Reset trigger: show menu from any stage ──────────────────────────
    if (isResetTrigger(body)) {
      updateLead(phone, { stage: 'menu', orderSubStage: null });
      await replyWithDelay(message, welcomeMenu(), 400, 900);
      return;
    }

    // ── "products" keyword → show product list ───────────────────────────
    if (body.toLowerCase() === 'products') {
      updateLead(phone, { stage: 'products' });
      await replyWithDelay(message, productsMenu());
      return;
    }

    // ── Route by stage ───────────────────────────────────────────────────
    switch (lead.stage) {

      case 'new':
        updateLead(phone, { stage: 'menu' });
        await replyWithDelay(message, welcomeMenu(), 400, 900);
        break;

      case 'menu':
        await handleMenuChoice(message, phone, body, lead);
        break;

      case 'products':
        await handleProductStage(message, phone, body, lead);
        break;

      case 'pricing':
        await handlePricingStage(message, phone, body, lead);
        break;

      case 'ordering':
        await handleOrderStep(message, phone, body, lead);
        break;

      case 'support':
        await replyWithDelay(message,
          `Hi ${lead.name || 'there'}! 👋 Your support request is already with our team — someone will be in touch shortly.\n\n` +
          `Type *menu* to browse our products or visit ${WEBSITE}`
        );
        break;

      case 'ai_chat':
        await handleAIFallback(message, phone, body, lead);
        break;

      // ── 'logged': order complete — let them start fresh ──────────────
      case 'logged':
        updateLead(phone, { stage: 'menu', orderSubStage: null });
        await replyWithDelay(message,
          `Hi ${lead.name || 'there'}! 👋 Your previous order enquiry is with our team and someone will follow up soon.\n\n` +
          `Want to explore more? Here's what we can help with:\n\n` + welcomeMenu(),
          400, 800
        );
        break;

      default:
        updateLead(phone, { stage: 'menu' });
        await replyWithDelay(message, welcomeMenu(), 400, 800);
    }

  } catch (err) {
    console.error(`[Handler] Error for ${phone}:`, err.message);
    await message.reply(`Sorry, I hit a small snag! 🙏 Please try again or type *menu* to start over.`);
  }
}

// ── Menu choice ───────────────────────────────────────────────────────────────

async function handleMenuChoice(message, phone, body, lead) {
  const choice = parseMenuChoice(body);

  switch (choice) {
    case 1:
      updateLead(phone, { stage: 'products' });
      await replyWithDelay(message, productsMenu());
      break;

    case 2:
      updateLead(phone, { stage: 'pricing' });
      await replyWithDelay(message, priceMenu());
      break;

    case 3:
      updateLead(phone, { stage: 'ordering', orderSubStage: 'leadType' });
      await replyWithDelay(message,
        `🛒 *Let's get your order started!*\n\n` + ORDER_STEPS_PERSONAL[0].prompt
      );
      break;

    case 4:
      updateLead(phone, { stage: 'support', nextSteps: 'Customer requested human support', agentNotes: 'Opted for support via menu option 4' });
      await logLeadToSheet(getLead(phone));
      await replyWithDelay(message, supportMessage(lead.name));
      break;

    default:
      // Not a number — check budget query or AI
      if (isBudgetQuery(body)) {
        await handleBudgetQuery(message, body);
      } else if (needsAI(body)) {
        updateLead(phone, { stage: 'ai_chat' });
        await handleAIFallback(message, phone, body, lead);
      } else {
        await replyWithDelay(message,
          `Please reply with a number:\n\n` +
          `1️⃣ View Products\n2️⃣ Price Details\n3️⃣ Place an Order\n4️⃣ Talk to Support`
        );
      }
  }
}

// ── Products stage ────────────────────────────────────────────────────────────

async function handleProductStage(message, phone, body, lead) {
  if (isBudgetQuery(body)) {
    await handleBudgetQuery(message, body);
    return;
  }
  if (needsAI(body)) {
    await handleAIFallback(message, phone, body, lead);
    return;
  }
  // Non-question input while browsing products → nudge
  await replyWithDelay(message,
    `I'm here to help! 😊 Ask me about any product — price, customisation, delivery.\n\n` +
    `Or:\n1️⃣ View Products  2️⃣ Price Details  3️⃣ Place Order  4️⃣ Support`
  );
}

// ── Pricing stage ─────────────────────────────────────────────────────────────

async function handlePricingStage(message, phone, body, lead) {
  // Budget query → show matching products from config (no AI cost)
  if (isBudgetQuery(body)) {
    await handleBudgetQuery(message, body);
    return;
  }
  // Other question → AI
  if (needsAI(body)) {
    await handleAIFallback(message, phone, body, lead);
    return;
  }
  // Menu number typed while in pricing → handle it
  const choice = parseMenuChoice(body);
  if (choice) {
    updateLead(phone, { stage: 'menu' });
    await handleMenuChoice(message, phone, body, getLead(phone));
    return;
  }
  await replyWithDelay(message,
    `💬 Tell me your *budget range* and I'll suggest the best Woodwaley products!\n` +
    `_(e.g. "under ₹500", "1000–2000", "500 rs per unit")_\n\n` +
    `Or type *3* to place an order.`
  );
}

// ── Budget-based product filter (no AI) ──────────────────────────────────────

async function handleBudgetQuery(message, body) {
  const budget = parseBudget(body);
  if (budget) {
    const result = getProductsByBudget(budget);
    if (result) {
      await replyWithDelay(message, result);
      return;
    }
  }
  // Couldn't parse or no matches → generic price guide
  await replyWithDelay(message,
    `Our products range from *₹349 to ₹5,000+*.\n\n` +
    `Could you share your budget? _(e.g. "under ₹1,000" or "₹500–₹1,500")_\n\n` +
    `👉 Full details: ${WEBSITE}`
  );
}

// ── Structured order collection ───────────────────────────────────────────────

async function handleOrderStep(message, phone, body, lead) {
  const subStage = lead.orderSubStage;

  // Identify personal vs corporate
  if (subStage === 'leadType') {
    const t = body.toLowerCase();
    const choice = parseMenuChoice(body);
    if (choice === 1 || t.includes('personal') || t.includes('individual') || t.includes('gift')) {
      updateLead(phone, { leadType: 'personal', orderSubStage: 'name' });
      await replyWithDelay(message, `🌸 *Personal gifting — lovely!*\n\n` + ORDER_STEPS_PERSONAL[1].prompt);
    } else if (choice === 2 || t.includes('corporate') || t.includes('bulk') || t.includes('company') || t.includes('office')) {
      updateLead(phone, { leadType: 'corporate', orderSubStage: 'name' });
      await replyWithDelay(message, `🏢 *Corporate order — great!*\n\n` + ORDER_STEPS_CORPORATE[1].prompt);
    } else {
      await replyWithDelay(message, `Please reply *1* for Personal gift or *2* for Corporate / Bulk order.`);
    }
    return;
  }

  const steps  = getOrderSteps(lead.leadType || 'personal');
  const idx    = steps.findIndex(s => s.key === subStage);
  const isLast = idx === steps.length - 1;

  // Unexpected complex question mid-flow → answer then re-prompt
  if (isBudgetQuery(body) && subStage !== 'budget') {
    await handleBudgetQuery(message, body);
    await replyWithDelay(message, `_Continuing your order ↩️\n${steps[idx]?.prompt}_`, 300, 600);
    return;
  }

  if (needsAI(body) && !['yes','no','y','n','none','asap','flexible'].includes(body.toLowerCase())) {
    const aiReply = await getAIReply(phone, body, getLead(phone));
    await replyWithDelay(message, aiReply);
    await replyWithDelay(message, `_Continuing your order ↩️\n${steps[idx]?.prompt}_`, 300, 600);
    return;
  }

  // Save field
  const fieldMap = {
    name:                 () => updateLead(phone, { name: body }),
    occasion:             () => updateLead(phone, { occasion: body }),
    productInterest:      () => updateLead(phone, { productInterest: body }),
    customisationDetails: () => updateLead(phone, { customisationDetails: body.toLowerCase() === 'none' ? 'None' : body }),
    deliveryLocation:     () => updateLead(phone, { deliveryLocation: body }),
    deliveryDate:         () => updateLead(phone, { deliveryDate: body }),
    companyName:          () => updateLead(phone, { companyName: body }),
    quantity:             () => updateLead(phone, { quantity: body }),
    budget:               () => updateLead(phone, { budget: body }),
    timeline:             () => updateLead(phone, { timeline: body }),
    brandingRequired:     () => updateLead(phone, { brandingRequired: body.toLowerCase().startsWith('y') || body === '1' }),
  };
  fieldMap[subStage]?.();

  if (isLast) {
    const finalLead = getLead(phone);
    finalLead.nextSteps = finalLead.leadType === 'corporate'
      ? 'Send formal quote within 24h; confirm branding artwork'
      : 'Confirm order details; share payment link; clarify customisation';
    finalLead.agentNotes = `WhatsApp menu order flow. Type: ${finalLead.leadType}`;

    await logLeadToSheet(finalLead);
    updateLead(phone, { stage: 'logged' });
    await replyWithDelay(message, orderSummary(finalLead));
  } else {
    const next = steps[idx + 1];
    updateLead(phone, { orderSubStage: next.key });
    await replyWithDelay(message, next.prompt);
  }
}

// ── AI fallback (Groq — free tier) ───────────────────────────────────────────

async function handleAIFallback(message, phone, body, lead) {
  if (needsAI(body)) {
    const reply = await getAIReply(phone, body, getLead(phone));
    await replyWithDelay(message, reply);
    await replyWithDelay(message,
      `_Type *menu* to see all options, *2* for prices, or *3* to place an order._`,
      400, 700
    );
  } else {
    await replyWithDelay(message,
      `I'm here to help! 😊\n\n` +
      `1️⃣ View Products\n2️⃣ Price Details\n3️⃣ Place an Order\n4️⃣ Talk to Support\n\n` +
      `Or visit us at ${WEBSITE}`
    );
  }
}
