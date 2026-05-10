// SRK Jewells — Backlink Submission Tracker
// This script generates all submission content + tracks what was done

const storeData = {
  name: "SRK Jewells",
  fullName: "Seth Radha Kishan Jewellers",
  url: "https://5n8r11-v5.myshopify.com",
  email: "support@srkjewells.com",
  phone: "+91 98765 43210",
  whatsapp: "+91 98765 43210",
  instagram: "https://www.instagram.com/srk.jeweller/",
  category: "Jewellery Store / Online Retail",
  keywords: "925 sterling silver jewellery, BIS hallmarked jewellery, silver rings India, jhumka earrings, gold plated jewellery, Indian jewellery online",
  description: "SRK Jewells (Seth Radha Kishan Jewellers) offers BIS Hallmarked 925 Sterling Silver and Gold jewellery — rings, earrings, necklaces, bracelets, and pendants — handcrafted by master artisans. Free shipping above ₹999. 30-day returns. Shop at srkjewells.com.",
  shortDesc: "BIS Hallmarked 925 sterling silver & gold jewellery. Rings, earrings, necklaces, bracelets. Free shipping above ₹999. Trusted Indian jeweller since generations.",
  address: "India",
  city: "India",
  country: "India",
  blogUrl: "https://5n8r11-v5.myshopify.com/blogs/news"
};

const submissions = {

  // ═══════════════════════════════════════════════════════
  // TIER 1: FREE INDIAN BUSINESS DIRECTORIES (HIGH PRIORITY)
  // ═══════════════════════════════════════════════════════
  indianDirectories: [
    {
      name: "Google Business Profile",
      url: "https://business.google.com/create",
      da: 100,
      type: "Local SEO + Backlink",
      priority: "🔴 CRITICAL",
      steps: [
        "Go to https://business.google.com/create",
        "Sign in with Google account",
        "Business name: SRK Jewells",
        "Category: Jewellery Store",
        "Add phone, website, description",
        "Verify by postcard or phone",
        "Add photos of jewellery pieces"
      ],
      note: "Most important backlink + local SEO signal. Do this first."
    },
    {
      name: "JustDial",
      url: "https://www.justdial.com/Free-Listing",
      da: 67,
      type: "Indian Business Directory",
      priority: "🔴 HIGH",
      steps: [
        "Go to https://www.justdial.com/Free-Listing",
        "Click 'List your business for free'",
        `Business Name: ${storeData.name}`,
        "Category: Jewellery Shops",
        `Phone: ${storeData.phone}`,
        `Website: ${storeData.url}`,
        `Description: ${storeData.shortDesc}`
      ]
    },
    {
      name: "Sulekha",
      url: "https://www.sulekha.com/business/register",
      da: 57,
      type: "Indian Business Directory",
      priority: "🔴 HIGH",
      steps: [
        "Go to https://www.sulekha.com/business/register",
        "Register as: Jewellery",
        `Business: ${storeData.name}`,
        `Email: ${storeData.email}`,
        `Phone: ${storeData.phone}`,
        `Website: ${storeData.url}`
      ]
    },
    {
      name: "IndiaMART",
      url: "https://seller.indiamart.com/",
      da: 74,
      type: "B2B Indian Directory",
      priority: "🔴 HIGH",
      steps: [
        "Go to https://seller.indiamart.com/",
        "Register as seller",
        "Category: Jewellery & Accessories",
        "Sub-category: Silver Jewellery",
        `Company: ${storeData.fullName}`,
        `Website: ${storeData.url}`,
        "Add product listings (rings, earrings, necklaces)"
      ]
    },
    {
      name: "TradeIndia",
      url: "https://www.tradeindia.com/register.html",
      da: 62,
      type: "B2B Indian Directory",
      priority: "🟡 MEDIUM",
      steps: [
        "Go to https://www.tradeindia.com/register.html",
        "Register as Seller",
        "Category: Jewellery",
        `Company: ${storeData.fullName}`,
        `Website: ${storeData.url}`,
        `Description: ${storeData.shortDesc}`
      ]
    },
    {
      name: "ExportersIndia",
      url: "https://www.exportersindia.com/register.htm",
      da: 56,
      type: "Indian Trade Directory",
      priority: "🟡 MEDIUM",
      steps: [
        "Go to https://www.exportersindia.com/register.htm",
        "Category: Jewellery Exporters / Silver Jewellery",
        `Company: ${storeData.fullName}`,
        `Website: ${storeData.url}`
      ]
    },
    {
      name: "Clickindia",
      url: "https://www.clickindia.com/post-free-ads.php",
      da: 53,
      type: "Indian Classified + Directory",
      priority: "🟡 MEDIUM",
      steps: [
        "Go to https://www.clickindia.com/post-free-ads.php",
        "Category: Jewellery & Watches",
        `Title: SRK Jewells — BIS Hallmarked 925 Silver Jewellery | Free Shipping`,
        `Description: ${storeData.shortDesc}`,
        `Website: ${storeData.url}`,
        `Phone: ${storeData.phone}`
      ]
    },
    {
      name: "Shopclues Seller (Marketplace backlink)",
      url: "https://www.shopclues.com/seller-registration.html",
      da: 70,
      type: "Marketplace Profile",
      priority: "🟡 MEDIUM",
      steps: [
        "Register as seller on Shopclues",
        "Add brand profile with website URL",
        "List a few hero products linking back to site"
      ]
    },
    {
      name: "Meesho Supplier",
      url: "https://supplier.meesho.com/",
      da: 69,
      type: "Marketplace Profile",
      priority: "🟡 MEDIUM",
      steps: [
        "Go to https://supplier.meesho.com/",
        "Register as supplier for jewellery",
        "Category: Jewellery > Silver Jewellery",
        "Add brand details including website"
      ]
    },
    {
      name: "India Business Directory (ibd.com)",
      url: "https://www.ibd.com/listing/add/",
      da: 48,
      type: "Business Directory",
      priority: "🟢 LOW",
      steps: [
        "Submit free listing at https://www.ibd.com/listing/add/",
        `Name: ${storeData.name}`,
        "Category: Jewellery",
        `URL: ${storeData.url}`
      ]
    }
  ],

  // ═══════════════════════════════════════════════════════
  // TIER 2: GLOBAL DIRECTORIES WITH INDIA PRESENCE
  // ═══════════════════════════════════════════════════════
  globalDirectories: [
    {
      name: "Yelp India",
      url: "https://www.yelp.com/biz/new",
      da: 93,
      priority: "🔴 HIGH",
      steps: ["Add business listing", "Category: Jewellery", `URL: ${storeData.url}`]
    },
    {
      name: "Foursquare",
      url: "https://foursquare.com/add-place",
      da: 92,
      priority: "🔴 HIGH",
      steps: ["Add place", "Category: Jewellery Store", `Website: ${storeData.url}`]
    },
    {
      name: "Hotfrog India",
      url: "https://www.hotfrog.in/",
      da: 60,
      priority: "🟡 MEDIUM",
      steps: ["Free business listing", "Category: Jewellery Shops", `URL: ${storeData.url}`]
    },
    {
      name: "Cylex India",
      url: "https://www.cylex.in/add-company.html",
      da: 58,
      priority: "🟡 MEDIUM",
      steps: ["Add company free", "Category: Jewellery", `URL: ${storeData.url}`]
    },
    {
      name: "EZlocal",
      url: "https://www.ezlocal.com/",
      da: 53,
      priority: "🟢 LOW",
      steps: ["Business listing", `URL: ${storeData.url}`]
    },
    {
      name: "Brownbook",
      url: "https://www.brownbook.net/business/add/",
      da: 56,
      priority: "🟢 LOW",
      steps: ["Free listing", "Category: Jewellery", `URL: ${storeData.url}`]
    }
  ],

  // ═══════════════════════════════════════════════════════
  // TIER 3: CONTENT & COMMUNITY BACKLINKS
  // ═══════════════════════════════════════════════════════
  contentBacklinks: [
    {
      name: "Quora — Answer Jewellery Questions",
      url: "https://www.quora.com/search?q=sterling+silver+jewellery+india",
      da: 93,
      priority: "🔴 HIGH",
      strategy: "Answer questions about silver jewellery, BIS hallmark, Indian jewellery care. Include natural link to blog post (not homepage). Target: 5 quality answers/week.",
      targetQuestions: [
        "https://www.quora.com/search?q=925+sterling+silver+india",
        "https://www.quora.com/search?q=bis+hallmark+jewellery",
        "https://www.quora.com/search?q=best+silver+jewellery+online+india",
        "https://www.quora.com/search?q=how+to+clean+silver+jewellery",
        "https://www.quora.com/search?q=jhumka+earrings+india"
      ]
    },
    {
      name: "Reddit India — r/india, r/IndiaShopping, r/jewellery",
      url: "https://www.reddit.com/r/IndiaShopping/",
      da: 96,
      priority: "🔴 HIGH",
      strategy: "Share helpful content (NOT spam). Post blog articles as value-add. Subreddits: r/IndiaShopping, r/india, r/jewellery, r/ABCDesis. Natural mentions of SRK Jewells in relevant threads.",
      targetSubreddits: [
        "https://www.reddit.com/r/IndiaShopping/",
        "https://www.reddit.com/r/india/",
        "https://www.reddit.com/r/jewellery/",
        "https://www.reddit.com/r/IndiaFashion/"
      ]
    },
    {
      name: "Pinterest Business Account",
      url: "https://business.pinterest.com/",
      da: 94,
      priority: "🔴 HIGH",
      strategy: "Create boards: Silver Jewellery, Jhumka Styles, Diwali Jewellery, Wedding Jewellery, Ring Collections. Pin product images linking back to store. 5-10 pins/day.",
      boards: [
        "SRK Jewells — Silver Jewellery",
        "Jhumka Earring Styles India",
        "BIS Hallmarked Sterling Silver",
        "Diwali & Navratri Jewellery",
        "Indian Wedding Jewellery"
      ]
    },
    {
      name: "Medium — Publish Blog Articles",
      url: "https://medium.com/new-story",
      da: 96,
      priority: "🟡 MEDIUM",
      strategy: "Republish blog posts on Medium with canonical link to original. Add 'Originally published at SRK Jewells' with hyperlink. Target: 1 post/week.",
      blogPosts: [
        "925 Sterling Silver Jewellery Guide",
        "BIS Hallmark: What It Means",
        "How to Clean Silver Jewellery at Home"
      ]
    },
    {
      name: "LinkedIn Company Page",
      url: "https://www.linkedin.com/company/setup/new/",
      da: 98,
      priority: "🟡 MEDIUM",
      strategy: "Create company page for SRK Jewells. Share blog posts, product launches, jewellery education content. Add website URL to profile."
    },
    {
      name: "Tumblr Blog",
      url: "https://www.tumblr.com/register",
      da: 93,
      priority: "🟢 LOW",
      strategy: "Create @srkjewells tumblr. Post jewellery images with links back to product pages."
    },
    {
      name: "Blogger/Blogspot",
      url: "https://www.blogger.com",
      da: 96,
      priority: "🟢 LOW",
      strategy: "Create srkjewells.blogspot.com. Publish condensed versions of blog posts with links to main store."
    }
  ],

  // ═══════════════════════════════════════════════════════
  // TIER 4: PRESS RELEASES (FREE)
  // ═══════════════════════════════════════════════════════
  pressReleases: [
    {
      name: "PRLog (Free Press Release)",
      url: "https://www.prlog.org/post/",
      da: 72,
      priority: "🟡 MEDIUM",
      releaseTitle: "SRK Jewells Launches Online Store: BIS Hallmarked 925 Sterling Silver Jewellery Now Available Across India"
    },
    {
      name: "OpenPR",
      url: "https://www.openpr.com/news/submit/",
      da: 68,
      priority: "🟡 MEDIUM",
      releaseTitle: "Seth Radha Kishan Jewellers Goes Digital with SRK Jewells — Premium Silver Jewellery with Free Pan-India Shipping"
    },
    {
      name: "PR.com",
      url: "https://www.pr.com/press-release/new",
      da: 73,
      priority: "🟡 MEDIUM",
      releaseTitle: "SRK Jewells: India's New Destination for BIS Hallmarked Sterling Silver Jewellery"
    },
    {
      name: "NewswireToday",
      url: "https://www.newswiretoday.com/submit/",
      da: 56,
      priority: "🟢 LOW"
    }
  ],

  // ═══════════════════════════════════════════════════════
  // TIER 5: JEWELLERY & FASHION SPECIFIC SITES
  // ═══════════════════════════════════════════════════════
  niche: [
    {
      name: "WeddingWire India — Vendor Profile",
      url: "https://www.weddingwire.in/register",
      da: 74,
      priority: "🔴 HIGH",
      strategy: "Register as jewellery vendor. Perfect niche audience — brides looking for jewellery."
    },
    {
      name: "WedMeGood — Vendor Listing",
      url: "https://www.wedmegood.com/for-vendors",
      da: 61,
      priority: "🔴 HIGH",
      strategy: "India's top wedding platform. Register as jeweller. Direct link from vendor profile."
    },
    {
      name: "ShaadiSaga",
      url: "https://www.shaadisaga.com/vendor-registration",
      da: 54,
      priority: "🟡 MEDIUM",
      strategy: "Wedding vendor directory. High-intent bridal jewellery audience."
    },
    {
      name: "Craftsvilla Seller",
      url: "https://www.craftsvilla.com/sell",
      da: 64,
      priority: "🟡 MEDIUM",
      strategy: "Indian handicraft marketplace. List silver jewellery products with brand profile."
    },
    {
      name: "LimeRoad Seller",
      url: "https://www.limeroad.com/seller",
      da: 67,
      priority: "🟡 MEDIUM",
      strategy: "Indian fashion marketplace. Vendor profile includes website link."
    },
    {
      name: "Mirraw — Jewellery Seller",
      url: "https://www.mirraw.com/store/open",
      da: 59,
      priority: "🟡 MEDIUM",
      strategy: "Indian ethnic jewellery marketplace. Register as silver jewellery seller."
    }
  ]
};

// ═══════════════════════════════════════════════════════
// PRESS RELEASE CONTENT (ready to paste)
// ═══════════════════════════════════════════════════════
const pressReleaseContent = `
FOR IMMEDIATE RELEASE

SRK JEWELLS LAUNCHES ONLINE JEWELLERY STORE: BIS HALLMARKED 925 STERLING SILVER JEWELLERY NOW AVAILABLE ACROSS INDIA

Seth Radha Kishan Jewellers brings generations of craftsmanship to digital India with free pan-India shipping and 30-day returns.

India — SRK Jewells (Seth Radha Kishan Jewellers), a heritage jewellery brand with generations of artisan craftsmanship, today announced the launch of its online jewellery store at srkjewells.com. The store offers a wide range of BIS Hallmarked 925 Sterling Silver and Gold jewellery — including rings, earrings, necklaces, bracelets, pendants, and chains — handcrafted by master silversmiths.

"We believe that every Indian woman deserves jewellery that tells her story — crafted with love, certified for purity, and priced fairly," said a spokesperson for SRK Jewells. "Taking our heritage brand online means we can now reach customers across India with the same quality they'd expect from a trusted family jeweller."

KEY HIGHLIGHTS:
• BIS Hallmarked 925 Sterling Silver — every piece certified for purity
• 16+ jewellery categories including rings, jhumka earrings, necklaces, and bracelets
• Free shipping on orders above ₹999 across India
• 30-day hassle-free returns and exchanges
• Signature gift-ready packaging with personalised message option
• Free lifetime polishing on all pieces

SRK Jewells is now available at: https://5n8r11-v5.myshopify.com
Instagram: @srk.jeweller | WhatsApp: +91 98765 43210 | Email: support@srkjewells.com

About SRK Jewells: Seth Radha Kishan Jewellers is a heritage Indian jewellery brand committed to authentic craftsmanship, BIS certified purity, and accessible fine jewellery for every Indian woman.

###

Contact:
SRK Jewells — Seth Radha Kishan Jewellers
Email: support@srkjewells.com
WhatsApp: +91 98765 43210
Instagram: https://www.instagram.com/srk.jeweller/
`;

// ═══════════════════════════════════════════════════════
// QUORA ANSWER TEMPLATE (ready to post)
// ═══════════════════════════════════════════════════════
const quoraTemplate = `
SAMPLE QUORA ANSWER (for: "How do I know if silver jewellery is genuine in India?")

Great question — this is something every jewellery buyer in India should know.

The most reliable way to verify genuine silver jewellery in India is the **BIS Hallmark** system:

1. **Look for the 925 stamp** — Every genuine sterling silver piece should have "925" engraved on it. This means 92.5% pure silver.

2. **Check for the BIS Hallmark** — Since 2021, all certified silver jewellery carries a 6-digit HUID (Hallmark Unique ID).

3. **Verify on the BIS Care App** — Download from Google Play or App Store, enter the HUID, and see the jeweller details + purity certification instantly.

4. **Watch out for "German silver"** — This contains ZERO silver. It's a zinc-copper alloy that just looks like silver. Always ask for BIS certification.

I recently bought from SRK Jewells [link to blog post on BIS hallmark] and they include the BIS certificate card with every order — and the HUID is verifiable on the app. That's the gold standard (pun intended) for buying silver online.

Hope this helps!
`;

// Print summary
console.log('═══════════════════════════════════════════════════════════');
console.log('   SRK JEWELLS — BACKLINK BUILDING ACTION PLAN');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📊 TOTAL OPPORTUNITIES:');
console.log(`  Indian Directories:   ${submissions.indianDirectories.length} sites`);
console.log(`  Global Directories:   ${submissions.globalDirectories.length} sites`);
console.log(`  Content Backlinks:    ${submissions.contentBacklinks.length} platforms`);
console.log(`  Press Releases:       ${submissions.pressReleases.length} sites`);
console.log(`  Niche (Wedding/Fashion): ${submissions.niche.length} sites`);
const total = submissions.indianDirectories.length + submissions.globalDirectories.length + submissions.contentBacklinks.length + submissions.pressReleases.length + submissions.niche.length;
console.log(`  ─────────────────────`);
console.log(`  TOTAL:               ${total} backlink sources\n`);

console.log('🔴 CRITICAL (Do Today):');
[...submissions.indianDirectories, ...submissions.contentBacklinks, ...submissions.globalDirectories, ...submissions.niche]
  .filter(s => s.priority?.includes('CRITICAL') || s.priority?.includes('🔴'))
  .forEach(s => console.log(`  • ${s.name} — ${s.url}`));

console.log('\n🟡 HIGH PRIORITY (This Week):');
[...submissions.indianDirectories, ...submissions.contentBacklinks, ...submissions.globalDirectories, ...submissions.pressReleases, ...submissions.niche]
  .filter(s => s.priority?.includes('MEDIUM'))
  .slice(0, 10)
  .forEach(s => console.log(`  • ${s.name} — ${s.url}`));

console.log('\n📝 PRESS RELEASE (paste & submit):');
submissions.pressReleases.forEach(p => console.log(`  • ${p.name}: ${p.url}`));

console.log('\n📄 Press release content saved — ready to copy-paste.');
console.log('\n✅ Action plan complete! Start with Google Business Profile.\n');

// Save files
import { writeFileSync } from 'fs';
writeFileSync('D:/WW AI Automation/jewelry-store/setup/press-release.txt', pressReleaseContent);
writeFileSync('D:/WW AI Automation/jewelry-store/setup/quora-template.txt', quoraTemplate);
writeFileSync('D:/WW AI Automation/jewelry-store/setup/backlink-plan.json', JSON.stringify(submissions, null, 2));
console.log('📁 Files saved:');
console.log('   • setup/press-release.txt  — ready to submit to PR sites');
console.log('   • setup/quora-template.txt — Quora answer template');
console.log('   • setup/backlink-plan.json — full plan with all URLs');
