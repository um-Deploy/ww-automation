"""
make_call.py — Initiate outbound calls via Exotel (Indian number).

Usage:
  python make_call.py --phone 9876543210 --name "Rajesh Sharma"
  python make_call.py --from-sheet
  python make_call.py --from-sheet --dry-run --max 10
"""
import sys, time, argparse, requests
import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv
load_dotenv()
from config import get_settings

settings  = get_settings()
DELAY_SEC = 30

# Exotel API base URL
EXOTEL_API_URL = f"https://api.exotel.com/v1/Accounts/{settings.EXOTEL_ACCOUNT_SID}/Calls/connect"


def call_lead(phone: str, name: str, dry_run=False) -> str:
    if not phone.startswith("+91"):
        phone = "+91" + phone.lstrip("0").lstrip("+91")

    name_param = name.replace(" ", "+")
    url = f"{settings.BASE_URL}/voice/start?lead_name={name_param}"

    print(f"  → Calling {name} at {phone}")

    if dry_run:
        print(f"     [DRY RUN] Would call: {phone}")
        return "DRY_RUN"

    resp = requests.post(
        EXOTEL_API_URL,
        auth=(settings.EXOTEL_API_KEY, settings.EXOTEL_API_TOKEN),
        data={
            "From"          : settings.EXOTEL_VIRTUAL_NUMBER,
            "To"            : phone,
            "CallerId"      : settings.EXOTEL_VIRTUAL_NUMBER,
            "Url"           : url,
            "Method"        : "POST",
            "StatusCallback": f"{settings.BASE_URL}/voice/status",
            "TimeLimit"     : 300,  # max 5 min call
            "TimeOut"       : 30,   # ring for 30s
        },
        timeout=15,
    )

    if resp.status_code in (200, 201):
        data = resp.json()
        sid  = data.get("Call", {}).get("Sid", "unknown")
        print(f"     SID: {sid} | Status: {data.get('Call', {}).get('Status', '?')}")
        return sid
    else:
        print(f"     ERROR {resp.status_code}: {resp.text}")
        return ""


def get_leads():
    creds = Credentials.from_service_account_file(
        settings.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
        scopes=["https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"],
    )
    gc = gspread.authorize(creds)
    ws = gc.open_by_key(settings.GOOGLE_SHEET_ID).worksheet("Voice Leads")
    return [r for r in ws.get_all_records()
            if str(r.get("Status", "")).lower() in ("", "pending", "new") and r.get("Phone")]


def mark_called(phone: str):
    creds = Credentials.from_service_account_file(
        settings.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
        scopes=["https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"],
    )
    gc = gspread.authorize(creds)
    ws = gc.open_by_key(settings.GOOGLE_SHEET_ID).worksheet("Voice Leads")
    for i, row in enumerate(ws.get_all_values()[1:], 2):
        if str(row[1]).strip() == str(phone).strip():
            ws.update_cell(i, 3, "called")
            break


def main():
    p = argparse.ArgumentParser(description="WoodWaley Exotel Caller")
    p.add_argument("--phone")
    p.add_argument("--name", default="there")
    p.add_argument("--from-sheet", action="store_true")
    p.add_argument("--max", type=int, default=20)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    if args.phone:
        call_lead(args.phone, args.name, args.dry_run)

    elif args.from_sheet:
        leads = get_leads()
        print(f"Found {len(leads)} pending leads\n")
        for i, lead in enumerate(leads[:args.max]):
            name  = lead.get("Name", "there")
            phone = str(lead.get("Phone", "")).strip()
            call_lead(phone, name, args.dry_run)
            if not args.dry_run:
                mark_called(phone)
            if i + 1 < min(len(leads), args.max):
                print(f"     Waiting {DELAY_SEC}s...\n")
                time.sleep(DELAY_SEC)
    else:
        p.print_help()


if __name__ == "__main__":
    main()
