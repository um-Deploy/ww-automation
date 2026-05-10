// Upload hero banner image to Shopify Files and set in theme
const token = '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';
const store = '5n8r11-v5.myshopify.com';
const API = `https://${store}/admin/api/2024-10`;
const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };

// Use Shopify GraphQL to create a staged upload and then use the URL
async function graphql(query, variables = {}) {
  const r = await fetch(`${API}/graphql.json`, {
    method: 'POST', headers,
    body: JSON.stringify({ query, variables })
  });
  return r.json();
}

// Upload image from URL using fileCreate mutation
async function uploadImageFromUrl(url, filename, altText) {
  const mutation = `
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          ... on MediaImage {
            id
            image { url }
          }
        }
        userErrors { field message }
      }
    }
  `;
  const res = await graphql(mutation, {
    files: [{
      contentType: "IMAGE",
      originalSource: url,
      alt: altText,
      filename: filename
    }]
  });

  if (res.data?.fileCreate?.files?.length > 0) {
    const file = res.data.fileCreate.files[0];
    console.log(`✅ Uploaded: ${filename}`);
    console.log(`   ID: ${file.id}`);
    if (file.image?.url) console.log(`   URL: ${file.image.url}`);
    return file;
  } else {
    const errors = res.data?.fileCreate?.userErrors;
    console.log(`❌ Upload failed: ${JSON.stringify(errors || res)}`);
    return null;
  }
}

async function main() {
  console.log('🔵 Uploading hero banner images to Shopify Files...\n');

  // High quality jewelry images from Unsplash (free to use)
  const images = [
    {
      url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=2000&q=90&fm=jpg',
      filename: 'srk-hero-jewelry-1.jpg',
      alt: 'SRK Jewells - Fine Sterling Silver and Gold Jewellery'
    },
    {
      url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=2000&q=90&fm=jpg',
      filename: 'srk-hero-jewelry-2.jpg',
      alt: 'SRK Jewells - Handcrafted Indian Jewellery Collection'
    },
    {
      url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=2000&q=90&fm=jpg',
      filename: 'srk-brand-story.jpg',
      alt: 'SRK Jewells - Seth Radha Kishan Jewellers Brand Story'
    }
  ];

  for (const img of images) {
    await uploadImageFromUrl(img.url, img.filename, img.alt);
    // Small delay between uploads
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n✅ Images uploaded! They will appear in the Shopify Files section.');
  console.log('   You can set them as hero banner in the Theme Editor:');
  console.log('   https://5n8r11-v5.myshopify.com/admin/themes/161177698361/editor');
}

main().catch(console.error);
