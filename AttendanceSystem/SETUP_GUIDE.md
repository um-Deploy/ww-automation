# Employee Attendance System — Setup Guide

## What you need
- A free Gmail account (create at gmail.com if you don't have one)
- That's it. Everything else is free Google tools.

---

## One-Time Setup (10 minutes)

### Step 1 — Create the Google Sheet
1. Go to **sheets.google.com** (sign in with your Gmail)
2. Click **+** to create a new blank spreadsheet
3. Name it "Employee Attendance"

### Step 2 — Open Apps Script
1. In the spreadsheet, click **Extensions** (top menu)
2. Click **Apps Script**
3. A new tab opens with a code editor

### Step 3 — Paste the code
1. Select ALL the default code in the editor (Ctrl+A)
2. Delete it
3. Open the file `attendance_system.js` (in this folder)
4. Copy everything (Ctrl+A, Ctrl+C)
5. Paste it into the Apps Script editor (Ctrl+V)

### Step 4 — Edit your employee names + email
Find this section near the top of the code:
```javascript
const EMPLOYEES   = ['Employee 1', 'Employee 2', 'Employee 3'];
const ADMIN_EMAIL = 'your@gmail.com';
const TIMEZONE    = 'Asia/Karachi';
```
- Replace `Employee 1`, `Employee 2`, `Employee 3` with actual names
- Replace `your@gmail.com` with your Gmail address
- Change timezone if needed (e.g., `Asia/Kolkata`, `America/New_York`)

### Step 5 — Run setup()
1. Click **Save** (floppy disk icon or Ctrl+S)
2. In the function dropdown (top), select `setup`
3. Click **▶ Run**
4. A permissions popup will appear — click **Review permissions**
5. Choose your Gmail account → click **Advanced** → **Go to (unsafe)** → **Allow**
   *(This is your own script, it's safe)*
6. Wait ~30 seconds for it to finish
7. A popup will show you **3 form links** — copy all 3!

---

## Daily Workflow

### Employees (on phone)
| Action | Form to use |
|--------|------------|
| Arriving at work | Check-In form |
| Leaving work | Check-Out form |
| Requesting leave | Leave Request form |

**Tip:** Employees should bookmark the 2 forms (Check-In + Check-Out) on their phone homescreen.

### Admin (you)
| Task | Where |
|------|-------|
| See live rankings | `Dashboard` sheet |
| See full attendance log | `Attendance` sheet |
| Approve/reject leave | `Leave_Requests` sheet — change Status column |
| Get form links again | Apps Script → run `showFormLinks()` |
| Refresh dashboard | Apps Script → run `refreshDashboard()` |

---

## How Scoring Works

| Component | Weight | How it's calculated |
|-----------|--------|---------------------|
| Attendance | 35% | Present days ÷ (Present + Absent days) — leaves excluded |
| Task Efficiency | 35% | Tasks completed ÷ tasks planned × 100 |
| Hour Efficiency | 20% | Hours worked ÷ 8 standard hours × 100 |
| Punctuality | 10% | Starts at 100, -0.5 per minute late |
| **Total Score** | **/100** | Composite of above |

---

## Leaves
- Employee submits Leave Request form
- You get an email notification
- Go to `Leave_Requests` sheet → change Status to **Approved ✅** or **Rejected ❌**
- Approved leaves do NOT count against attendance score
- Absent (no check-in, no leave) DOES count against score

---

## Automatic Features
- **Dashboard auto-updates** every time a form is submitted
- **Absent marking** runs automatically at end of workday (WORK_END + 1 hour)
- **Carried-forward tasks** are logged in the Attendance sheet for reference

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Setup" button not showing | Make sure `setup` is selected in the function dropdown |
| Forms not receiving data | Re-run `setup()` — it will recreate triggers |
| Dashboard not updating | Run `refreshDashboard()` from Apps Script |
| Lost form links | Run `showFormLinks()` from Apps Script |
| Wrong timezone | Edit `TIMEZONE` in the code and re-run `setup()` |
