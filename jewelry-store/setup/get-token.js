const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

// Shopify Partners app credentials - use your Partners app
// Get these from your Partners dashboard -> App -> API credentials
const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const STORE = '5n8r11-v5.myshopify.com';
const PORT = 3456;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = 'read_products,write_products,read_content,write_content,read_themes,write_themes,read_script_tags,write_script_tags,read_orders,write_orders,read_customers,write_customers,read_inventory,write_inventory,write_fulfillments,read_fulfillments';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('\n❌ Usage: node get-token.js <CLIENT_ID> <CLIENT_SECRET>');
  console.log('   Find these in your Partners dashboard -> Store API app -> API credentials\n');
  process.exit(1);
}

const state = crypto.randomBytes(16).toString('hex');
const authUrl = `https://${STORE}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

console.log('\n✅ Open this URL in your browser to authorize:\n');
console.log(authUrl);
console.log('\n⏳ Waiting for authorization...\n');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/callback') { res.end('Not found'); return; }

  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (returnedState !== state) {
    res.end('State mismatch! Possible CSRF attack.');
    return;
  }

  res.end('<h2>✅ Authorized! You can close this tab and go back to Claude.</h2>');

  // Exchange code for token
  const postData = JSON.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code
  });

  const options = {
    hostname: STORE,
    path: '/admin/oauth/access_token',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  };

  const tokenReq = https.request(options, (tokenRes) => {
    let data = '';
    tokenRes.on('data', chunk => data += chunk);
    tokenRes.on('end', () => {
      const parsed = JSON.parse(data);
      const token = parsed.access_token;
      console.log('\n🎉 ACCESS TOKEN OBTAINED!');
      console.log('Token:', token);
      fs.writeFileSync('D:/WW AI Automation/jewelry-store/setup/token.txt', token);
      console.log('\n✅ Token saved to setup/token.txt');
      server.close();
      process.exit(0);
    });
  });

  tokenReq.write(postData);
  tokenReq.end();
});

server.listen(PORT, () => {});
