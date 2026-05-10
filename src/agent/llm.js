/**
 * Free LLM layer using Groq (llama3 — no cost).
 * Only called for complex/sales queries; basic menu replies use zero AI.
 *
 * Free Groq account: https://console.groq.com
 * Free tier: ~14,400 requests/day on llama-3.1-8b-instant
 */

import Groq from 'groq-sdk';
import { addMessage } from '../state/leadState.js';
import { buildSystemPrompt } from './prompts.js';

let groq = null;

function getClient() {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not set. Get a free key at https://console.groq.com');
    }
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
}

/**
 * Get an AI reply for complex/sales queries.
 * @param {string} phone
 * @param {string} customerMessage
 * @param {import('../state/leadState.js').LeadData} lead
 * @returns {Promise<string>} reply text
 */
export async function getAIReply(phone, customerMessage, lead) {
  addMessage(phone, 'user', customerMessage);

  const client = getClient();

  const completion = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',   // free, very fast
    max_tokens: 512,
    temperature: 0.7,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      ...lead.messages,
    ],
  });

  const reply = completion.choices[0]?.message?.content?.trim() || 'Sorry, I could not process that. Please try again!';
  addMessage(phone, 'assistant', reply);
  return reply;
}

/**
 * Decide if a message needs AI or can be handled by simple rules.
 * Returns true if AI should be invoked.
 * @param {string} body
 * @returns {boolean}
 */
export function needsAI(body) {
  const text = body.toLowerCase().trim();

  // Short menu-style inputs — no AI needed
  if (/^[1-4]$/.test(text)) return false;
  if (['hi', 'hello', 'hey', 'hii', 'helo', 'menu', 'back', '0', 'start'].includes(text)) return false;
  if (['yes', 'no', 'y', 'n', 'ok', 'okay', 'sure', 'done', 'next'].includes(text)) return false;

  // Contains a question or is a longer sentence → AI
  const questionWords = ['what', 'how', 'when', 'where', 'which', 'why', 'can', 'do', 'does', 'is', 'are', 'will', 'price', 'cost', 'rate', 'custom', 'deliver', 'ship', 'return', 'bulk', 'minimum', 'logo', 'brand', 'material', 'size', 'colour', 'color'];
  if (questionWords.some(w => text.includes(w))) return true;
  if (text.length > 30) return true;

  return false;
}
