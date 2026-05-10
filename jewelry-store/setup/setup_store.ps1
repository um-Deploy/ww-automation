# Jewelry Store Full Setup Script
# Runs all GraphQL mutations via Shopify CLI to set up collections, pages, menus

$store = "5n8r11-v5.myshopify.com"
$themeId = "161177698361"

function Run-GraphQL {
    param($query, $variables)
    $varJson = $variables | ConvertTo-Json -Depth 10 -Compress
    $result = echo $query | shopify store execute --store $store --body $varJson --json 2>&1
    return $result | ConvertFrom-Json
}

function Create-Collection {
    param($title, $handle, $description, $sortOrder = "BEST_SELLING")

    $mutation = @"
mutation {
  collectionCreate(input: {
    title: "$title"
    handle: "$handle"
    descriptionHtml: "$description"
    sortOrder: $sortOrder
    published: true
  }) {
    collection { id title handle }
    userErrors { field message }
  }
}
"@
    Write-Host "Creating collection: $title..."
    $result = echo $mutation | shopify store execute --store $store --json 2>&1
    Write-Host $result
    return $result
}

function Create-Page {
    param($title, $handle, $body)

    $mutation = @"
mutation {
  pageCreate(page: {
    title: "$title"
    handle: "$handle"
    body: "$body"
    published: true
  }) {
    page { id title handle }
    userErrors { field message }
  }
}
"@
    Write-Host "Creating page: $title..."
    $result = echo $mutation | shopify store execute --store $store --json 2>&1
    Write-Host $result
    return $result
}

# ============================================================
# STEP 1: Create Collections
# ============================================================
Write-Host "`n=== Creating Collections ===" -ForegroundColor Cyan

$collections = @(
    @{ title="Rings"; handle="rings"; desc="Explore our stunning collection of rings — from delicate stackable bands to statement solitaires." },
    @{ title="Earrings"; handle="earrings"; desc="From everyday studs to elegant drops, find the perfect earrings for every occasion." },
    @{ title="Necklaces"; handle="necklaces"; desc="Timeless necklaces crafted in sterling silver and gold — for every neckline and style." },
    @{ title="Bracelets"; handle="bracelets"; desc="Stack them up or wear alone — our bracelets are designed for every wrist." },
    @{ title="Pendants"; handle="pendants"; desc="Meaningful pendants in silver and gold. Perfect for gifting or treating yourself." },
    @{ title="Chains"; handle="chains"; desc="Versatile chains to wear alone or pair with your favourite pendants." },
    @{ title="New Arrivals"; handle="new-arrivals"; desc="Be the first to shop our latest designs, freshly crafted just for you." },
    @{ title="Bestsellers"; handle="bestsellers"; desc="Our most-loved pieces, chosen by thousands of happy customers." },
    @{ title="Gifting"; handle="gifting"; desc="Thoughtfully crafted jewellery for birthdays, anniversaries, and every special occasion." },
    @{ title="Wedding Collection"; handle="wedding"; desc="Bridal sets, engagement rings, and wedding jewellery for your most important day." },
    @{ title="Everyday Wear"; handle="everyday-wear"; desc="Lightweight, comfortable jewellery designed to be worn every single day." }
)

foreach ($col in $collections) {
    Create-Collection -title $col.title -handle $col.handle -description $col.desc
    Start-Sleep -Milliseconds 500
}

# ============================================================
# STEP 2: Create Pages
# ============================================================
Write-Host "`n=== Creating Pages ===" -ForegroundColor Cyan

$aboutBody = "<h2>Our Story</h2><p>We believe that beautiful jewellery should be accessible to everyone. Founded with a passion for craftsmanship and an eye for elegance, our brand was born from the desire to create pieces that tell your story.</p><p>Every piece in our collection is thoughtfully designed, ethically sourced, and handcrafted by skilled artisans using certified 925 Sterling Silver and genuine gold. We are BIS Hallmark certified, ensuring the highest standards of purity and quality.</p><h2>Our Promise</h2><ul><li>BIS Hallmarked jewellery</li><li>Ethically sourced materials</li><li>30-day hassle-free returns</li><li>Free shipping on orders above Rs. 999</li><li>Lifetime polishing service</li></ul>"

$faqBody = "<h2>Frequently Asked Questions</h2><h3>What materials do you use?</h3><p>All our jewellery is crafted from certified 925 Sterling Silver or genuine gold. Every piece is BIS Hallmarked.</p><h3>How do I care for my jewellery?</h3><p>Store your jewellery in a cool, dry place. Avoid contact with perfumes, lotions, and water. Clean gently with a soft cloth.</p><h3>What is your return policy?</h3><p>We offer 30-day hassle-free returns and exchanges. The product must be in original condition with all packaging.</p><h3>How long does delivery take?</h3><p>Standard delivery takes 3-7 business days. Express delivery (1-3 days) is available at checkout.</p><h3>Do you offer gift wrapping?</h3><p>Yes! All orders come in our signature gift-ready packaging. You can add a personalised message at checkout.</p><h3>How do I find my ring size?</h3><p>Use our free Ring Size Guide — measure the inside diameter of a ring that fits you well and match it to our size chart. Contact us for a free ring sizer kit.</p>"

$shippingBody = "<h2>Shipping Policy</h2><p><strong>Free Standard Shipping</strong> on all orders above Rs. 999 within India.</p><h3>Delivery Timelines</h3><ul><li><strong>Standard Delivery:</strong> 3-7 business days</li><li><strong>Express Delivery:</strong> 1-3 business days (additional charges apply)</li></ul><h3>Order Tracking</h3><p>Once your order is shipped, you will receive an email with your tracking details.</p><h2>Returns &amp; Exchanges</h2><p>We want you to love your jewellery. If you are not completely satisfied, you can return or exchange within <strong>30 days</strong> of delivery.</p><h3>Return Conditions</h3><ul><li>Item must be in original, unworn condition</li><li>Original packaging and tags must be intact</li><li>Customised or engraved items cannot be returned</li></ul><h3>How to Initiate a Return</h3><p>Email us at support@yourbrand.com or WhatsApp us at +91 98765 43210. We will arrange a free pickup within 24 hours.</p>"

$contactBody = "<h2>Get in Touch</h2><p>We would love to hear from you! Our customer care team is available Monday to Saturday, 10 AM to 7 PM IST.</p><h3>Contact Details</h3><ul><li><strong>Email:</strong> support@yourbrand.com</li><li><strong>Phone/WhatsApp:</strong> +91 98765 43210</li><li><strong>Instagram:</strong> @yourbrand</li></ul><p>You can also use the contact form below and we will get back to you within 24 hours.</p>"

Create-Page -title "About Us" -handle "about-us" -body $aboutBody
Start-Sleep -Milliseconds 500
Create-Page -title "FAQ" -handle "faq" -body $faqBody
Start-Sleep -Milliseconds 500
Create-Page -title "Shipping and Returns" -handle "shipping-returns" -body $shippingBody
Start-Sleep -Milliseconds 500
Create-Page -title "Contact Us" -handle "contact" -body $contactBody
Start-Sleep -Milliseconds 500

# ============================================================
# STEP 3: Create Navigation Menus
# ============================================================
Write-Host "`n=== Creating Navigation Menus ===" -ForegroundColor Cyan

# Main Menu
$mainMenuMutation = @"
mutation {
  menuCreate(input: {
    title: "Main Menu"
    handle: "main-menu"
    items: [
      { title: "New Arrivals", url: "/collections/new-arrivals" }
      { title: "Rings", url: "/collections/rings" }
      { title: "Earrings", url: "/collections/earrings" }
      { title: "Necklaces", url: "/collections/necklaces" }
      { title: "Bracelets", url: "/collections/bracelets" }
      { title: "Pendants", url: "/collections/pendants" }
      { title: "Bestsellers", url: "/collections/bestsellers" }
      { title: "Gifting", url: "/collections/gifting" }
    ]
  }) {
    menu { id title handle }
    userErrors { field message }
  }
}
"@

Write-Host "Creating main menu..."
echo $mainMenuMutation | shopify store execute --store $store --json 2>&1

Start-Sleep -Milliseconds 500

# Footer Shop Menu
$footerShopMutation = @"
mutation {
  menuCreate(input: {
    title: "Footer Shop"
    handle: "footer-shop"
    items: [
      { title: "New Arrivals", url: "/collections/new-arrivals" }
      { title: "Rings", url: "/collections/rings" }
      { title: "Earrings", url: "/collections/earrings" }
      { title: "Necklaces", url: "/collections/necklaces" }
      { title: "Bracelets", url: "/collections/bracelets" }
      { title: "Bestsellers", url: "/collections/bestsellers" }
    ]
  }) {
    menu { id title handle }
    userErrors { field message }
  }
}
"@

Write-Host "Creating footer shop menu..."
echo $footerShopMutation | shopify store execute --store $store --json 2>&1

Start-Sleep -Milliseconds 500

# Footer Help Menu
$footerHelpMutation = @"
mutation {
  menuCreate(input: {
    title: "Footer Help"
    handle: "footer-help"
    items: [
      { title: "FAQ", url: "/pages/faq" }
      { title: "Shipping and Returns", url: "/pages/shipping-returns" }
      { title: "Contact Us", url: "/pages/contact" }
      { title: "Track Your Order", url: "/pages/contact" }
    ]
  }) {
    menu { id title handle }
    userErrors { field message }
  }
}
"@

Write-Host "Creating footer help menu..."
echo $footerHelpMutation | shopify store execute --store $store --json 2>&1

Start-Sleep -Milliseconds 500

# Footer Company Menu
$footerCompanyMutation = @"
mutation {
  menuCreate(input: {
    title: "Footer Company"
    handle: "footer-company"
    items: [
      { title: "About Us", url: "/pages/about-us" }
      { title: "Blog", url: "/blogs/news" }
      { title: "Privacy Policy", url: "/policies/privacy-policy" }
      { title: "Terms of Service", url: "/policies/terms-of-service" }
      { title: "Refund Policy", url: "/policies/refund-policy" }
    ]
  }) {
    menu { id title handle }
    userErrors { field message }
  }
}
"@

Write-Host "Creating footer company menu..."
echo $footerCompanyMutation | shopify store execute --store $store --json 2>&1

# ============================================================
# STEP 4: Publish Theme
# ============================================================
Write-Host "`n=== Publishing Theme ===" -ForegroundColor Cyan
$publishMutation = @"
mutation {
  themePublish(id: "gid://shopify/OnlineStoreTheme/$themeId") {
    theme { id name role }
    userErrors { field message }
  }
}
"@
Write-Host "Publishing theme..."
echo $publishMutation | shopify store execute --store $store --json 2>&1

Write-Host "`n=== Setup Complete! ===" -ForegroundColor Green
Write-Host "Your jewellery store is ready at: https://5n8r11-v5.myshopify.com"
