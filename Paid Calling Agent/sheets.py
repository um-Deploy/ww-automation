"""Google Sheets logger — appends call outcome rows."""
import asyncio
from datetime import datetime
import gspread
from google.oauth2.service_account import Credentials
from config import get_settings

settings = get_settings()

_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]
_SHEET_NAME = "Voice Call Logs"
_HEADERS = ["Timestamp", "Lead Name", "Phone", "Call SID", "Outcome", "Quantity", "Occasion", "Budget", "Notes"]


def _get_sheet():
    creds = Credentials.from_service_account_file(settings.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes=_SCOPES)
    gc = gspread.authorize(creds)
    spreadsheet = gc.open_by_key(settings.GOOGLE_SHEET_ID)
    try:
        return spreadsheet.worksheet(_SHEET_NAME)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(_SHEET_NAME, rows=1000, cols=len(_HEADERS))
        ws.append_row(_HEADERS)
        return ws


def _log_row(lead_name: str, phone: str, call_sid: str, action: dict):
    ws = _get_sheet()
    ws.append_row([
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        lead_name, phone, call_sid,
        action.get("type", "unknown"),
        action.get("quantity", ""),
        action.get("occasion", ""),
        action.get("budget", ""),
        action.get("notes", action.get("reason", action.get("time", ""))),
    ])


async def log_call(lead_name: str, phone: str, call_sid: str, action: dict):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _log_row, lead_name, phone, call_sid, action)
