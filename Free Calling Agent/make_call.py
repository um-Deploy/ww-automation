"""
make_call.py — Initiate outbound calls to leads.

Usage:
  # Call a single lead
  python make_call.py --phone +919876543210 --name "Rajesh Sharma"

  # Call all leads from Google Sheets (column A=name, B=phone, C=status)
  python make_call.py --from-sheet

  # Dry run (no actual calls)
  python make_call.py --from-sheet --dry-run
"""
import sys
import time
import argparse
import gspread
from google.oauth2.service_account import Credentials
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()
from config import get_settings

settings = get_settings()

LEADS_SHEET = "Voice Leads"
DELAY_BETWEEN_CALLS = 30   # seconds between calls to avoid spam flags


def get_twilio_client() -> Client:
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


def make_single_call(client: Client, phone: str, lead_name: str, dry_run: bool = False):
    """Initiate one outbound call to a lead."""
    twiml_url = f"{settings.BASE_URL}/voice/start"
    status_url = f"{settings.BASE_URL}/voice/status"

    print(f"  → Calling {lead_name} at {phone} ...")
    if dry_run:
        print(f"     [DRY RUN] Would call: {phone}")
        return "DRY_RUN_SID"

    # Store lead metadata so /voice/start can greet by name
    # We pass it via status callback parameters
    call = client.calls.create(
        to=phone,
        from_=settings.TWILIO_PHONE_NUMBER,
        url=f"{twiml_url}?lead_name={lead_name.replace(' ', '+')}",
        method="POST",
        status_callback=status_url,
        status_callback_method="POST",
        status_callback_event=["completed", "busy", "no-answer", "failed"],
        timeout=30,           # ring for 30s before giving up
        machine_detection="DetectMessageEnd",   # skip voicemail
    )
    print(f"     SID: {call.sid}  Status: {call.status}")
    return call.sid


def get_leads_from_sheet() -> list[dict]:
    """Read leads from Google Sheets tab 'Voice Leads'."""
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_file(
        settings.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes=scopes
    )
    gc = gspread.authorize(creds)
    spreadsheet = gc.open_by_key(settings.GOOGLE_SHEET_ID)

    try:
        ws = spreadsheet.worksheet(LEADS_SHEET)
    except gspread.WorksheetNotFound:
        print(f"[Error] Sheet '{LEADS_SHEET}' not found.")
        print("Create a sheet with columns: Name | Phone | Status")
        sys.exit(1)

    rows = ws.get_all_records()
    # Filter to only 'pending' leads (or blank status)
    leads = [
        r for r in rows
        if str(r.get("Status", "")).lower() in ("", "pending", "new")
        and r.get("Phone")
    ]
    return leads


def mark_called(lead_name: str, phone: str):
    """Update lead status to 'called' in Sheets."""
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_file(
        settings.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes=scopes
    )
    gc = gspread.authorize(creds)
    spreadsheet = gc.open_by_key(settings.GOOGLE_SHEET_ID)
    ws = spreadsheet.worksheet(LEADS_SHEET)
    rows = ws.get_all_values()
    for i, row in enumerate(rows[1:], start=2):   # skip header
        if str(row[1]).strip() == str(phone).strip():
            ws.update_cell(i, 3, "called")
            break


def run_batch(dry_run: bool = False, max_calls: int = 20):
    client = get_twilio_client()
    leads  = get_leads_from_sheet()

    if not leads:
        print("[Info] No pending leads found in Google Sheets.")
        return

    print(f"[Voice Agent] Found {len(leads)} pending leads. Max this run: {max_calls}\n")
    count = 0

    for lead in leads[:max_calls]:
        name  = lead.get("Name", "there")
        phone = str(lead.get("Phone", "")).strip()
        if not phone.startswith("+"):
            phone = "+91" + phone.lstrip("0")   # default India country code

        make_single_call(client, phone, name, dry_run)
        if not dry_run:
            mark_called(name, phone)
        count += 1

        if count < min(len(leads), max_calls):
            print(f"     Waiting {DELAY_BETWEEN_CALLS}s before next call...")
            time.sleep(DELAY_BETWEEN_CALLS)

    print(f"\n[Done] Called {count} lead(s).")


def main():
    parser = argparse.ArgumentParser(description="WoodWaley Voice Calling Agent")
    parser.add_argument("--phone",       help="Single lead phone number (e.g. +919876543210)")
    parser.add_argument("--name",        default="there", help="Lead name for single call")
    parser.add_argument("--from-sheet",  action="store_true", help="Call all pending leads from Google Sheets")
    parser.add_argument("--max",         type=int, default=20, help="Max calls per run (default: 20)")
    parser.add_argument("--dry-run",     action="store_true", help="Simulate without making real calls")
    args = parser.parse_args()

    if args.from_sheet:
        run_batch(dry_run=args.dry_run, max_calls=args.max)
    elif args.phone:
        client = get_twilio_client()
        make_single_call(client, args.phone, args.name, args.dry_run)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
