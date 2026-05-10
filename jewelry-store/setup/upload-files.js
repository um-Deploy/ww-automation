import https from 'https';
import http from 'http';

const token = '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';
const store = '5n8r11-v5.myshopify.com';
const API = `https://${store}/admin/api/2024-10`;
const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function graphql(query, variables = {}) {
  const r = await fetch(`${API}/graphql.json`, {
    method: 'POST', headers,
    body: JSON.stringify({ query, variables })
  });
  return r.json();
}

// Step 1: Create staged upload target
async function createStagedUpload(filename, mimeType, fileSize) {
  const mutation = `
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters { name value }
        }
        userErrors { field message }
      }
    }
  `;
  return graphql(mutation, {
    input: [{
      filename,
      mimeType,
      resource: "IMAGE",
      fileSize: String(fileSize),
      httpMethod: "POST"
    }]
  });
}

// Step 2: Upload to the staged URL
async function uploadToStage(stagedTarget, buffer, contentType, filename) {
  const { url, parameters } = stagedTarget;

  // Build multipart form data manually
  const boundary = '----FormBoundary' + Math.random().toString(36).substr(2);
  const parts = [];

  for (const param of parameters) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${param.name}"\r\n\r\n${param.value}`);
  }

  // File part
  const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
  const fileFooter = `\r\n--${boundary}--`;

  const headerBuf = Buffer.from(parts.join('\r\n') + '\r\n' + fileHeader);
  const footerBuf = Buffer.from(fileFooter);
  const body = Buffer.concat([headerBuf, buffer, footerBuf]);

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body
  });

  return r.status;
}

// Step 3: Create file from staged upload
async function createFile(resourceUrl, alt) {
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
  return graphql(mutation, {
    files: [{
      contentType: "IMAGE",
      originalSource: resourceUrl,
      alt
    }]
  });
}

async function uploadImageToShopify(imageUrl, filename, alt) {
  console.log(`\n📥 Processing: ${filename}`);

  // Download image
  const { buffer, contentType } = await downloadBuffer(imageUrl);
  console.log(`   Downloaded: ${(buffer.length / 1024).toFixed(1)}KB (${contentType})`);

  // Step 1: Get staged upload URL
  const staged = await createStagedUpload(filename, 'image/jpeg', buffer.length);
  if (staged.data?.stagedUploadsCreate?.userErrors?.length > 0) {
    console.log(`❌ Stage error: ${JSON.stringify(staged.data.stagedUploadsCreate.userErrors)}`);
    return null;
  }

  const target = staged.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target) {
    console.log('❌ No staged target returned:', JSON.stringify(staged));
    return null;
  }
  console.log(`   Stage URL obtained`);

  // Step 2: Upload to stage
  const uploadStatus = await uploadToStage(target, buffer, 'image/jpeg', filename);
  console.log(`   Upload status: ${uploadStatus}`);

  // Step 3: Register file in Shopify
  const fileRes = await createFile(target.resourceUrl, alt);
  if (fileRes.data?.fileCreate?.files?.length > 0) {
    const file = fileRes.data.fileCreate.files[0];
    console.log(`✅ File created in Shopify Files`);
    console.log(`   ID: ${file.id}`);
    if (file.image?.url) console.log(`   URL: ${file.image.url}`);
    return file;
  } else {
    const errors = fileRes.data?.fileCreate?.userErrors;
    console.log(`❌ File creation failed: ${JSON.stringify(errors || fileRes)}`);
    return null;
  }
}

async function main() {
  const images = [
    {
      url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&q=85',
      filename: 'srk-hero-banner.jpg',
      alt: 'SRK Jewells - Elegant Fine Jewellery Collection'
    },
    {
      url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&q=85',
      filename: 'srk-brand-story.jpg',
      alt: 'SRK Jewells - Seth Radha Kishan Jewellers Heritage'
    }
  ];

  const results = [];
  for (const img of images) {
    const result = await uploadImageToShopify(img.url, img.filename, img.alt);
    if (result) results.push({ ...img, shopifyId: result.id, shopifyUrl: result.image?.url });
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n\n📋 Summary of uploaded files:');
  results.forEach(r => {
    console.log(`  ${r.filename}: ${r.shopifyUrl || r.shopifyId}`);
  });
}

main().catch(console.error);
