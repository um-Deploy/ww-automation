"""Log every agent action to the 'Meta Ads Agent Log' sheet."""
from datetime import datetime
import gspread
from google.oauth2.service_account import Credentials
from config import get_settings

settings = get_settings()

_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]
_SHEET_NAME = "Meta Ads Agent Log"
_HEADERS = ["Timestamp", "Action", "Details", "Result"]


def _get_sheet():
    creds = Credentials.from_service_account_file(
        settings.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes=_SCOPES
    )
    gc = gspread.authorize(creds)
    spreadsheet = gc.open_by_key(settings.GOOGLE_SHEET_ID)
    try:
        ws = spreadsheet.worksheet(_SHEET_NAME)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(_SHEET_NAME, rows=1000, cols=len(_HEADERS))
        ws.append_row(_HEADERS)
    return ws


def log_action(action: str, details: str, result: str):
    try:
        _get_sheet().append_row([
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            action,
            details,
            result,
        ])
    except Exception:
        pass  # never crash the agent over a logging failure
