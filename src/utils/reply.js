/**
 * Sends a WhatsApp reply with a natural typing delay.
 * Shows "typing..." indicator before sending — mimics a human agent.
 */

/**
 * @param {import('whatsapp-web.js').Message} message
 * @param {string} text
 * @param {number} [minMs] minimum delay in ms
 * @param {number} [maxMs] maximum delay in ms
 */
export async function replyWithDelay(message, text, minMs = 800, maxMs = 2200) {
  try {
    const chat = await message.getChat();
    await chat.sendSeen();           // mark as read
    await chat.sendStateTyping();    // show "typing..."

    // Delay scales slightly with message length (feels more human)
    const lengthBonus = Math.min(text.length * 2, 1000);
    const delay = minMs + Math.random() * (maxMs - minMs) + lengthBonus;
    await new Promise(r => setTimeout(r, delay));

    await chat.clearState();
  } catch {
    // If chat state fails, still send the reply
  }
  await message.reply(text);
}

/**
 * Send a media message (catalog/image) with a shorter delay.
 */
export async function sendMediaWithDelay(message, media, options = {}) {
  try {
    const chat = await message.getChat();
    await chat.sendSeen();
    await chat.sendStateTyping();
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
    await chat.clearState();
  } catch { /* ignore */ }
  await message.reply(media, undefined, options);
}
