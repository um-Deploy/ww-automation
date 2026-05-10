# WoodWaley Voice Calling Agent — Setup Guide

## Cost Breakdown

| Service | Cost |
|---------|------|
| **Groq** (AI brain) | **FREE** — 14,400 requests/day |
| **Edge TTS** (Priya's voice) | **FREE** — no limits, no key |
| **Google Sheets** (logging) | **FREE** |
| **ngrok** (tunnel) | **FREE** tier |
| **Twilio** (phone calls) | $15 free trial credit (~1,700 min to India) |

> **Bottom line:** Everything is free except actual phone call minutes. Twilio's $15 trial gets you started for free. After that, India calls cost ~₹0.70/min.

---

## Step 1 — Install Python

Download Python 3.11+ from https://python.org and install it.

Then install dependencies:
```bash
cd "D:\WW AI Automation\voice-agent"
pip install -r requirements.txt
```

---

## Step 2 — Get API Keys (all free)

### Groq (FREE AI)
1. Go to https://console.groq.com
2. Sign up free (no credit card)
3. API Keys → Create → copy it

### Twilio (phone calls — $15 free trial)
1. Sign up at https://twilio.com
2. Verify your phone number
3. Get a Twilio number (free with trial)
4. Console → Account SID + Auth Token → copy both
5. Note your Twilio phone number

### ngrok (free tunnel for local server)
1. Sign up at https://ngrok.com
2. Download and install
3. Run: `ngrok http 8000`
4. Copy the `https://xxxx.ngrok.io` URL

---

## Step 3 — Configure .env

```bash
cd "D:\WW AI Automation\voice-agent"
copy .env.example .env
```

Open `.env` and fill in:
```
TWILIO_ACCOUNT_SID=ACxxxx...
TWILIO_AUTH_TOKEN=xxxx...
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
GROQ_API_KEY=gsk_xxxx...
GOOGLE_SHEET_ID=xxxx...
BASE_URL=https://xxxx.ngrok.io
```

---

## Step 4 — Google Sheets Setup

Use the **same** service account from the main project (`credentials/google-service-account.json`).

Share your Google Sheet with the service account email (inside the JSON file under `"client_email"`).

Create two tabs in your Sheet:

**Tab 1: `Voice Leads`** (leads to call)
| Name | Phone | Status |
|------|-------|--------|
| Rajesh Sharma | 9876543210 | pending |
| Priya Mehta | 9123456789 | pending |

**Tab 2: `Voice Call Logs`** — auto-created by agent on first run.

---

## Step 5 — Run the Agent

Open **two terminals**:

**Terminal 1 — Start ngrok:**
```bash
ngrok http 8000
# Copy the https URL → paste into BASE_URL in .env
```

**Terminal 2 — Start server:**
```bash
cd "D:\WW AI Automation\voice-agent"
python main.py
```

---

## Step 6 — Make Calls

```bash
# Test with one lead
python make_call.py --phone +919876543210 --name "Rajesh Sharma"

# Call all pending leads from Google Sheets
python make_call.py --from-sheet

# Dry run first (no real calls)
python make_call.py --from-sheet --dry-run
```

---

## The Voice (en-IN-NeerjaNeural)

The agent uses Microsoft's **Neerja Neural** voice — Indian female, completely free.

Other free Indian voices you can try (set `TTS_VOICE=` in `.env`):
- `en-IN-NeerjaNeural` ← **recommended** (warm, natural)
- `en-IN-AaravNeural` ← male
- `hi-IN-SwaraNeural` ← Hindi female

---

## How Calls Work

```
make_call.py  →  Twilio dials lead's phone
                 ↓ lead picks up
             /voice/start  →  Neerja greets (Edge TTS, free)
                 ↓ lead speaks
             /voice/respond →  Groq AI thinks → Neerja replies
                 ↓ loops
             Order / Follow-up / Not Interested
                 ↓
             Google Sheets logged → call ends
```

---

## Customize the Agent

- **Change pitch/services:** Edit `prompts.py` → `SYSTEM_PROMPT`
- **Change greeting:** Edit `prompts.py` → `GREETING`
- **Change voice speed:** Edit `tts.py` → `rate="-8%"` (more negative = slower)
- **Change AI model:** Edit `conversation.py` → `_MODEL` (Groq free models: `llama-3.1-8b-instant` for faster, `llama-3.3-70b-versatile` for smarter)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Call connects but silence | Check ngrok is running and BASE_URL is correct in .env |
| "No module named groq" | Run `pip install -r requirements.txt` |
| Sheets not logging | Share the Sheet with service account email |
| Call goes to voicemail | Add `machine_detection="DetectMessageEnd"` — already set |
| Lead says "wrong number" | Double-check phone numbers in Voice Leads sheet have country code |
