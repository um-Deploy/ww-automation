import axios from 'axios';

const NEW_API = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.websiteUri';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizePhone(phone) {
  if (!phone) return null;
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '91' + digits.slice(1);
  if (digits.length === 10) return '91' + digits;
  return digits.length >= 10 ? digits : null;
}

export async function scrapeGooglePlaces(query, industry, city, apiKey) {
  const results = [];
  let nextPageToken = null;
  let page = 0;

  do {
    if (nextPageToken) await sleep(2000);

    const body = { textQuery: query, maxResultCount: 20 };
    if (nextPageToken) body.pageToken = nextPageToken;

    let data;
    try {
      const res = await axios.post(NEW_API, body, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
      data = res.data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      console.warn(`[GooglePlaces] API error for "${query}": ${msg}`);
      break;
    }

    for (const place of (data.places || [])) {
      const rawPhone = place.nationalPhoneNumber || place.internationalPhoneNumber;
      const phone = normalizePhone(rawPhone);
      if (!phone) continue;

      results.push({
        name: place.displayName?.text || 'Unknown',
        phone,
        address: place.formattedAddress || '',
        rating: place.rating || '',
        website: place.websiteUri || '',
        industry,
        city,
        source: 'Google Places',
      });
    }

    nextPageToken = data.nextPageToken || null;
    page++;
  } while (nextPageToken && page < 2);

  return results;
}
