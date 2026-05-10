"""
make_call.py — Initiate outbound calls to leads.

Usage:
  python make_call.py --phone +919876543210 --name "Rajesh Sharma"
  python make_call.py --from-sheet
  python make_call.py --from-sheet --dry-run --max 10
"""
import sys, time, argparse
import gspread
from google.oauth2.service_account import Credentials
from twilio.rest import Client
from dotenv import load_dotenv
load_dotenv()
from config import get_settings

settings  = get_settings()
DELAY_SEC = 30


def client():
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


def call_lead(c: Client, phone: str, name: str, dry_run=False) -> str:
    name_param = name.replace(" ", "+")
    url = f"{settings.BASE_URL}/voice/start?lead_name={name_param}"
    print(f"  → Calling {name} at {phone}")
    if dry_run:
        print("     [DRY RUN]")
        return "DRY_RUN"
    call = c.calls.create(
        to=phone,
        from_=settings.TWILIO_PHONE_NUMBER,
        url=url,
        method="POST",
        status_callback=f"{settings.BASE_URL}/voice/status",
        status_callback_method="POST",
        timeout=30,
        machine_detection="DetectMessageEnd",
    )
    print(f"     SID: {call.sid} | {call.status}")
    return call.sid


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
    p = argparse.ArgumentParser()
    p.add_argument("--phone")
    p.add_argument("--name", default="there")
    p.add_argument("--from-sheet", action="store_true")
    p.add_argument("--max", type=int, default=20)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    c = client()

    if args.phone:
        phone = args.phone if args.phone.startswith("+") else "+91" + args.phone
        call_lead(c, phone, args.name, args.dry_run)

    elif args.from_sheet:
        leads = get_leads()
        print(f"Found {len(leads)} pending leads\n")
        for i, lead in enumerate(leads[:args.max]):
            name  = lead.get("Name", "there")
            phone = str(lead.get("Phone", "")).strip()
            if not phone.startswith("+"): phone = "+91" + phone.lstrip("0")
            call_lead(c, phone, name, args.dry_run)
            if not args.dry_run: mark_called(phone)
            if i + 1 < min(len(leads), args.max):
                print(f"     Waiting {DELAY_SEC}s...\n")
                time.sleep(DELAY_SEC)
    else:
        p.print_help()


if __name__ == "__main__":
    main()
