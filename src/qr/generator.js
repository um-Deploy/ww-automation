import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QR_DIR = path.join(__dirname, '../../temp/qr');

// Ensure temp directory exists
if (!fs.existsSync(QR_DIR)) fs.mkdirSync(QR_DIR, { recursive: true });

/**
 * Generates a QR code image file encoding the given URL.
 * Returns the file path so it can be sent via WhatsApp.
 *
 * @param {string} phone - used to name the file uniquely
 * @param {string} url   - the URL to encode (payment / demo / catalog)
 * @returns {Promise<string>} absolute path to the generated PNG
 */
export async function generateQRCode(phone, url) {
  const filePath = path.join(QR_DIR, `${phone}_qr.png`);

  await QRCode.toFile(filePath, url, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  return filePath;
}

/**
 * Clean up a QR file after sending.
 * @param {string} filePath
 */
export function cleanupQRFile(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Ignore cleanup errors
  }
}
