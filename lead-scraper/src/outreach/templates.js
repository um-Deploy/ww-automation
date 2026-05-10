const PHONE = () => process.env.OUTREACH_PHONE || '';

// Small random variations so no two messages are byte-identical (avoids Meta spam flags)
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const SAVING_LINE = [
  '*Save ₹25,000 every month on cutting costs.* 💰',
  '*Cut costs by ₹25,000 every month.* 💰',
  '*₹25,000/month ki saving sirf cutting costs pe.* 💰',
];

const SLOT_LINE = [
  '*FREE sample cutting this month — limited slots.*',
  '*FREE sample cutting available — slots filling fast.*',
  '*Free sample this month — limited slots bache hain.*',
];

const INDUSTRY_LINE = {
  leather:  'leather, footwear & fabric industry',
  fabric:   'fabric, textile & garment industry',
  footwear: 'footwear, leather & fabric industry',
  export:   'leather, footwear & export industry',
};

export function getOfferMessage(lead) {
  const industryStr = INDUSTRY_LINE[lead.industry] || 'leather, footwear & fabric industry';

  return `${pick(SAVING_LINE)}

Hi, I'm Anya from *USK Laser, Kanpur.*
Serving ${industryStr} since 2000 — 20+ years, reputed brands & export houses trust us.

📍 Branches in Kanpur | Agra | Bareilly

${pick(SLOT_LINE)}
Best rates, guaranteed.

📞 ${PHONE()}`;
}
