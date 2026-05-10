import { config } from '../config/loader.js';

/**
 * Builds the AI system prompt from config.
 * Only used for complex/sales queries — basic menu replies don't use AI.
 */
export function buildSystemPrompt() {
  const { business, products, faqs } = config;

  const personalItems = products.personalGifting.categories
    .flatMap(c => c.items.map(i => `• ${i.name} (${i.priceRange}) — ${i.description}`))
    .join('\n');

  const corporateItems = products.corporate.categories
    .flatMap(c => c.items.map(i => `• ${i.name} (${i.priceRange}) — MOQ: ${i.moq || '25 units'}`))
    .join('\n');

  const faqBlock = faqs.faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');

  return `You are ${business.agentName}, a friendly sales assistant for ${business.businessName} — ${business.tagline}.
Website: ${business.website}
About: ${business.about}
Delivery: ${business.deliveryAreas}

RULES:
- Keep replies SHORT (2–4 sentences max) — this is WhatsApp
- Be warm, helpful, and human
- Always include the website when relevant: ${business.website}
- Catalogue is coming soon on the website — tell customers to visit ${business.website} for now
- NEVER invent prices outside the ranges below
- If unsure, say "Our team will confirm this for you shortly!"

PERSONAL GIFT PRODUCTS:
${personalItems}

CORPORATE / BULK PRODUCTS:
${corporateItems}

FAQS:
${faqBlock}

Occasions served (personal): ${products.personalGifting.occasions.join(', ')}
Occasions served (corporate): ${products.corporate.occasions.join(', ')}
Corporate MOQ: ${products.corporate.moq}
Branding options: ${products.corporate.brandingOptions.join(', ')}`;
}
