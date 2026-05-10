import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './prompts.js';
import { addMessage, updateLead } from '../state/leadState.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Send a customer message to Claude and return the reply + parsed lead update.
 *
 * @param {string} phone
 * @param {string} customerMessage
 * @param {import('../state/leadState.js').LeadData} lead
 * @returns {Promise<{reply: string, sendCatalog: boolean, stage: string}>}
 */
export async function getAgentReply(phone, customerMessage, lead) {
  addMessage(phone, 'user', customerMessage);

  // Prompt is rebuilt each call so config hot-reloads take effect
  const systemPrompt = buildSystemPrompt();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' }, // prompt caching — reduces cost significantly
      },
    ],
    messages: lead.messages,
  });

  const rawText = response.content[0].text;

  // Split visible reply from hidden ##LEAD_UPDATE## metadata block
  const parts = rawText.split('##LEAD_UPDATE##');
  const reply = parts[0].trim();
  const metaJson = parts[1]?.trim();

  let sendCatalog = false;
  let newStage = lead.stage;

  if (metaJson) {
    try {
      const update = JSON.parse(metaJson);
      const ext = update.extracted || {};
      sendCatalog = !!ext.sendCatalog;

      const leadUpdates = {
        stage:                update.stage       || lead.stage,
        leadType:             update.leadType    || lead.leadType,
        name:                 ext.name           || lead.name,
        companyName:          ext.companyName    || lead.companyName,
        occasion:             ext.occasion       || lead.occasion,
        corporateOccasion:    ext.corporateOccasion || lead.corporateOccasion,
        productInterest:      ext.productInterest || lead.productInterest,
        budget:               ext.budget         || lead.budget,
        quantity:             ext.quantity       || lead.quantity,
        deliveryLocation:     ext.deliveryLocation || lead.deliveryLocation,
        deliveryDate:         ext.deliveryDate   || lead.deliveryDate,
        customisationDetails: ext.customisationDetails || lead.customisationDetails,
        brandingRequired:     ext.brandingRequired ?? lead.brandingRequired,
        agentNotes:           ext.agentNotes     || lead.agentNotes,
        nextSteps:            ext.nextSteps      || lead.nextSteps,
      };

      updateLead(phone, leadUpdates);
      newStage = leadUpdates.stage;
    } catch {
      // Malformed JSON — continue without update
    }
  }

  // Store reply in conversation history (without the metadata block)
  addMessage(phone, 'assistant', reply);

  return { reply, sendCatalog, stage: newStage };
}
