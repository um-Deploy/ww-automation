// Target cities: Kanpur + nearby industrial areas
export const CITIES = ['Kanpur', 'Lucknow', 'Unnao', 'Agra', 'Kannauj'];

export const INDUSTRY_QUERIES = {
  leather: [
    'leather manufacturer',
    'leather goods factory',
    'leather accessories manufacturer',
    'leather garments factory',
    'leather bags manufacturer',
    'leather exporter',
  ],
  fabric: [
    'fabric manufacturer',
    'textile mill',
    'cloth manufacturer',
    'garment manufacturer',
    'textile industry',
  ],
  footwear: [
    'shoe manufacturer',
    'footwear factory',
    'chappal manufacturer',
    'shoe factory',
    'footwear industry',
  ],
  export: [
    'export house',
    'export company',
    'garment exporter',
    'leather exporter',
    'handicraft exporter',
  ],
};

export function buildSearchQueries() {
  const queries = [];
  for (const city of CITIES) {
    for (const [industry, keywords] of Object.entries(INDUSTRY_QUERIES)) {
      for (const keyword of keywords) {
        queries.push({ query: `${keyword} ${city}`, industry, city });
      }
    }
  }
  return queries;
}
