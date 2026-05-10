import { config } from '../config/loader.js';

/**
 * Parses a budget string like "500-700", "under 1000", "1000 rs", "500 to 1500"
 * Returns { min, max } in rupees, or null if unparseable.
 */
export function parseBudget(text) {
  const t = text.toLowerCase().replace(/rs\.?|₹|inr|per\s*(unit|piece|product)?/g, '').trim();

  // Range: "500-700", "500 to 700", "500–700"
  const range = t.match(/(\d[\d,]*)\s*[-–to]+\s*(\d[\d,]*)/);
  if (range) {
    return { min: parseInt(range[1].replace(/,/g, '')), max: parseInt(range[2].replace(/,/g, '')) };
  }
  // Under/below/less: "under 1000", "below 500"
  const under = t.match(/(?:under|below|less\s*than|upto|up\s*to)\s*(\d[\d,]*)/);
  if (under) return { min: 0, max: parseInt(under[1].replace(/,/g, '')) };

  // Above/more: "above 2000"
  const above = t.match(/(?:above|more\s*than|over|minimum)\s*(\d[\d,]*)/);
  if (above) return { min: parseInt(above[1].replace(/,/g, '')), max: Infinity };

  // Single number: "1000"
  const single = t.match(/(\d[\d,]{2,})/);
  if (single) {
    const n = parseInt(single[1].replace(/,/g, ''));
    return { min: Math.max(0, n - 300), max: n + 300 };
  }
  return null;
}

/**
 * Extract the numeric low end from a price range string like "₹499–₹999".
 */
function priceRangeLow(str) {
  const m = str.match(/[\d,]+/);
  return m ? parseInt(m[0].replace(/,/g, '')) : 999999;
}

/**
 * Returns products matching a budget range from both personal and corporate catalogs.
 * @param {{ min: number, max: number }} budget
 * @returns {string} formatted WhatsApp message
 */
export function getProductsByBudget(budget) {
  const { min, max } = budget;
  const matches = [];

  const allCategories = [
    ...config.products.personalGifting.categories,
    ...config.products.corporate.categories,
  ];

  for (const cat of allCategories) {
    for (const item of cat.items) {
      const low = priceRangeLow(item.priceRange);
      if (low >= min && low <= max) {
        matches.push(`• *${item.name}* — ${item.priceRange}\n  _${item.description}_`);
      }
    }
  }

  if (matches.length === 0) {
    return null; // caller will fall back to AI
  }

  const maxLabel = max === Infinity ? `₹${min}+` : `₹${min}–₹${max}`;
  return (
    `🎁 *Products in your budget (${maxLabel}):*\n\n` +
    matches.join('\n\n') +
    `\n\n_Ask me about any product for more details, customisation, or photos!_\n` +
    `_Or type *3* to place an order._`
  );
}

/**
 * Returns true if the message looks like a budget/price query.
 */
export function isBudgetQuery(body) {
  const t = body.toLowerCase();
  return (
    /\d/.test(t) &&
    (t.includes('budget') || t.includes('price') || t.includes('cost') ||
     t.includes('rs') || t.includes('₹') || t.includes('inr') ||
     t.includes('under') || t.includes('below') || t.includes('between') ||
     t.includes('option') || t.includes('range') || /\d+\s*[-–to]\s*\d+/.test(t))
  );
}
