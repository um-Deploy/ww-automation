# WhatsApp AI Lead Agent — Setup Guide

## What it does
1. Customer messages your WhatsApp number
2. AI identifies: **personal gifting** or **corporate bulk order**
3. Sends the right **catalog** (PDF/image) automatically
4. Continues the conversation based on **what the customer selects**
5. Collects all necessary details (name, occasion, product, budget, delivery, etc.)
6. Logs the complete lead to **Google Sheets** with a comment for your team's next steps

---

## Prerequisites
- Node.js 18+ — download from https://nodejs.org (LTS version)
- A WhatsApp number (personal or Business) on your phone
- Anthropic API key
- Google Cloud project (free tier works)

---

## Step 1 — Install Node.js & dependencies

```bash
# After installing Node.js:
npm install
```

---

## Step 2 — Anthropic API key

1. Go to https://console.anthropic.com → API Keys → Create
2. Copy the key

---

## Step 3 — Google Sheets setup

### Create the sheet
1. Go to https://sheets.google.com → new spreadsheet
2. Copy the Sheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/**<THIS PART>**/edit`

### Create a Service Account (one-time)
1. https://console.cloud.google.com → create/select a project
2. APIs & Services → Enable APIs → search "Google Sheets API" → Enable
3. IAM & Admin → Service Accounts → Create service account (any name)
4. Click the account → Keys tab → Add Key → JSON → Download
5. Place the downloaded file at: `credentials/google-service-account.json`

### Share the sheet with the service account
1. Open your Google Sheet → Share
2. Paste the service account email (`name@project.iam.gserviceaccount.com`)
3. Give it **Editor** access

---

## Step 4 — Configure `.env`

```bash
cp .env.example .env
```

Edit `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...

BUSINESS_NAME=Your Gift & Decor Studio
AGENT_NAME=Aria

GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./credentials/google-service-account.json

PORT=3000
```

---

## Step 5 — Add your catalogs

Drop your catalog files into the `catalog/` folder:

| File | Purpose |
|------|---------|
| `catalog/personal-catalog.pdf` | Sent to personal gifting customers |
| `catalog/corporate-catalog.pdf` | Sent to corporate/bulk customers |
| `catalog/images/*.jpg` | Individual product photos (optional) |

Then check `config/catalog.json` — filenames are already set to the above defaults.

---

## Step 6 — Train / update the agent

All training lives in the `config/` folder. **Edit these JSON files directly — no code changes, no restart needed.**

| File | What to edit |
|------|-------------|
| `config/business.json` | Business name, agent name, city, delivery info, social links |
| `config/products.json` | All products, categories, price ranges, customisation options |
| `config/faqs.json` | Common Q&A the agent will answer accurately |
| `config/catalog.json` | Which catalog file to send + the caption message |

The agent **hot-reloads** config changes — just save the file and the next conversation uses the new info.

---

## Step 7 — Run

```bash
npm start
```

**First run:** A QR code appears in the terminal. Scan it with your WhatsApp.
Session is saved to `.wwebjs_auth/` — you won't need to scan again.

---

## Conversation flows

### Personal customer
```
Customer: "Hi"
Aria: "Hi! 👋 Welcome to [Business]. I'm Aria! Are you looking for a personal gift or a corporate/bulk order?"

Customer: "Personal, it's for my wife's birthday"
Aria: "How lovely! Let me share our gift catalog — I'll send it right over!"
      [→ personal-catalog.pdf is sent automatically]

Aria: "Which products caught your eye? I can share more details, photos, pricing, or customisation options! 😊"

Customer: "The personalised jewellery box looks nice"
Aria: "Great choice! The Personalised Jewellery Box is ₹1,200–₹2,500 depending on size and finish. 
       Would you like to engrave her name, a date, or a special message?"

... continues until: name ✓ occasion ✓ product ✓ budget ✓ delivery location ✓ date ✓

Aria: "Perfect! I've noted everything. Our team will reach out to confirm your order and share a payment link shortly! 🎁"

→ Google Sheets row created with all details + next steps comment
```

### Corporate customer
```
Customer: "Hi, we need Diwali gifts for 200 employees"
Aria: "Wonderful! Let me share our corporate gifting catalog with bulk pricing."
      [→ corporate-catalog.pdf sent]

Aria: "For 200 employees, our Diwali hampers are very popular. Do you have a budget per unit in mind?"

... continues until: name ✓ company ✓ occasion ✓ quantity ✓ budget ✓ timeline ✓ branding ✓

Aria: "Noted! Our team will send you a formal quote within 24 hours. 🙏"

→ Google Sheets row with all corporate fields + comment for sales team
```

---

## Google Sheets columns

| Column | Content |
|--------|---------|
| Date & Time | When logged |
| Phone | Customer WhatsApp number |
| Name | Customer name |
| Lead Type | Personal / Corporate |
| Company | Corporate company name |
| Occasion | Birthday / Diwali / etc. |
| Product Interest | What they want |
| Budget | Indicated range |
| Quantity | Corporate units |
| Delivery Location | City / address |
| Delivery Date | When needed |
| Customisation Details | Engraving, photos, etc. |
| Branding Required | Yes / No (corporate) |
| Catalog Sent | Yes / No |
| Agent Notes | AI's notes for your team |
| Next Steps | Recommended action **(with cell comment)** |
| Status | New (update manually to In Progress / Closed) |

---

## Health & monitoring

| URL | What it shows |
|-----|--------------|
| `http://localhost:3000/health` | Agent uptime |
| `http://localhost:3000/leads` | All active leads (current session) |
