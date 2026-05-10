// Target cities — large metros + tier-2 with dense corporate presence
export const CITIES = (process.env.GIFTING_CITIES || 'Delhi,Noida,Gurgaon,Mumbai,Pune,Bangalore,Hyderabad,Chennai,Ahmedabad,Kolkata,Chandigarh,Jaipur,Lucknow,Surat')
  .split(',')
  .map(c => c.trim())
  .filter(Boolean);

// Industries that regularly buy corporate gifts
export const INDUSTRY_QUERIES = {
  it_software: [
    'IT company',
    'software company',
    'tech startup',
    'software development company',
    'IT services company',
  ],
  pharma: [
    'pharmaceutical company',
    'pharma company',
    'medical devices company',
    'healthcare company',
  ],
  banking_finance: [
    'private bank branch',
    'NBFC company',
    'insurance company',
    'financial services company',
    'wealth management firm',
  ],
  real_estate: [
    'real estate developer',
    'builder developer',
    'property developer',
    'real estate company',
  ],
  manufacturing: [
    'manufacturing company',
    'industrial company',
    'factory corporate office',
    'production company',
  ],
  fmcg: [
    'FMCG company',
    'consumer goods company',
    'food and beverage company',
  ],
  consulting: [
    'management consulting firm',
    'CA firm',
    'law firm',
    'business consulting company',
  ],
  automobile: [
    'automobile dealer',
    'car dealership',
    'auto company',
  ],
  education: [
    'educational institute corporate',
    'private university',
    'coaching institute chain',
  ],
  hospitality: [
    'hotel corporate office',
    'resort corporate',
    'event management company',
  ],
};

// Decision maker roles to look for when enriching contacts (keyword matching)
export const DECISION_MAKER_KEYWORDS = {
  hr: ['hr manager', 'human resources manager', 'hr director', 'head hr', 'hr head', 'hr executive', 'people manager', 'talent acquisition'],
  admin: ['admin manager', 'office manager', 'administrative manager', 'facilities manager', 'admin executive', 'office administrator'],
  procurement: ['procurement manager', 'purchase manager', 'sourcing manager', 'supply chain manager', 'vendor manager', 'procurement head'],
  owner: ['founder', 'co-founder', 'managing director', 'director', 'ceo', 'chief executive', 'owner', 'proprietor', 'president', 'md'],
};

export function buildSearchQueries(industryFilter = null) {
  const queries = [];
  const industries = industryFilter
    ? { [industryFilter]: INDUSTRY_QUERIES[industryFilter] }
    : INDUSTRY_QUERIES;

  for (const city of CITIES) {
    for (const [industry, keywords] of Object.entries(industries)) {
      for (const keyword of keywords) {
        queries.push({ query: `${keyword} ${city}`, industry, city });
      }
    }
  }
  return queries;
}
