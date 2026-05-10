"""Google Sheets logger."""
import asyncio
from datetime import datetime
import gspread
from google.oauth2.service_account import Credentials
from config import get_settings

settings = get_settings()
_SCOPES  = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
_SHEET   = "Voice Call Logs"
_HEADERS = ["Timestamp", "Lead Name", "Phone", "Call SID", "Outcome", "Quantity", "Occasion", "Budget", "Notes"]


def _get_sheet():
    creds = Credentials.from_service_account_file(settings.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes=_SCOPES)
    gc    = gspread.authorize(creds)
    ss    = gc.open_by_key(settings.GOOGLE_SHEET_ID)
    try:
        return ss.worksheet(_SHEET)
    except gspread.WorksheetNotFound:
        ws = ss.add_worksheet(_SHEET, rows=1000, cols=len(_HEADERS))
        ws.append_row(_HEADERS)
        return ws


def _log(lead_name, phone, call_sid, action):
    _get_sheet().append_row([
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        lead_name, phone, call_sid,
        action.get("type", "unknown"),
        action.get("quantity", ""),
        action.get("occasion", ""),
        action.get("budget", ""),
        action.get("notes", action.get("reason", action.get("time", ""))),
    ])


async def log_call(lead_name, phone, call_sid, action):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _log, lead_name, phone, call_sid, action)
