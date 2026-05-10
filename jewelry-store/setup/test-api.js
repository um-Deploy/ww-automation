const token = "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";
const store = "5n8r11-v5.myshopify.com";

async function testAPI() {
  // Test REST API
  try {
    const res = await fetch(`https://${store}/admin/api/2024-10/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json"
      }
    });
    console.log("REST Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("REST Response:", text.slice(0, 300));
  } catch (e) {
    console.log("REST Error:", e.message);
  }

  // Test GraphQL API
  try {
    const res = await fetch(`https://${store}/admin/api/2024-10/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: "{ shop { name email } }" })
    });
    console.log("\nGraphQL Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("GraphQL Response:", text.slice(0, 300));
  } catch (e) {
    console.log("GraphQL Error:", e.message);
  }
}

testAPI();
