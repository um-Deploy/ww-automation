// Run shopify store auth but intercept the URL it tries to open
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

// Temporarily override the 'open' functionality by setting BROWSER env var
// to a script that captures the URL
const captureScript = `
@echo off
echo %1 > "D:/WW AI Automation/jewelry-store/setup/auth-url.txt"
echo URL captured!
`;

fs.writeFileSync('D:/WW AI Automation/jewelry-store/setup/capture.bat', captureScript);

const proc = spawn('shopify', [
  'store', 'auth',
  '--store', '5n8r11-v5.myshopify.com',
  '--scopes', 'write_products,write_content,write_themes,write_script_tags,write_orders,write_customers,write_inventory,read_products,read_content,read_themes,read_script_tags,read_orders,read_customers,read_inventory,write_online_store_navigation,read_online_store_navigation',
  '--json'
], {
  env: { ...process.env, BROWSER: 'D:/WW AI Automation/jewelry-store/setup/capture.bat' },
  shell: true,
  stdio: 'inherit'
});

proc.on('exit', (code) => {
  console.log('Process exited with code:', code);
  if (fs.existsSync('D:/WW AI Automation/jewelry-store/setup/auth-url.txt')) {
    const url = fs.readFileSync('D:/WW AI Automation/jewelry-store/setup/auth-url.txt', 'utf8').trim();
    console.log('Captured URL:', url);
  }
});
