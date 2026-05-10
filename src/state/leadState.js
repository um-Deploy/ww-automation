/**
 * In-memory lead state — keyed by WhatsApp phone number.
 *
 * Stages:
 *   new → menu → products | pricing | ordering | support | ai_chat → logged
 *
 * orderSubStage (used when stage = 'ordering'):
 *   Personal:  type → name → occasion → product → customise → location → date → confirm
 *   Corporate: type → name → company  → occasion → quantity  → budget  → timeline → branding → confirm
 */

const leads = new Map();

export function getLead(phone) {
  if (!leads.has(phone)) {
    leads.set(phone, {
      phone,
      stage: 'new',
      leadType: null,           // 'personal' | 'corporate'
      orderSubStage: null,

      // Collected fields
      name: '',
      occasion: '',
      productInterest: '',
      budget: '',
      customisationDetails: '',
      deliveryLocation: '',
      deliveryDate: '',

      // Corporate only
      companyName: '',
      quantity: '',
      timeline: '',
      brandingRequired: false,

      // Meta
      agentNotes: '',
      nextSteps: '',
      catalogSent: false,

      messages: [],             // AI conversation history (only filled when AI is used)
      firstContact: new Date(),
      lastContact: new Date(),
    });
  }
  return leads.get(phone);
}

export function updateLead(phone, updates) {
  const lead = getLead(phone);
  Object.assign(lead, updates, { lastContact: new Date() });
  return lead;
}

export function addMessage(phone, role, content) {
  const lead = getLead(phone);
  lead.messages.push({ role, content });
  lead.lastContact = new Date();
}

export function getAllLeads() {
  return [...leads.values()];
}
