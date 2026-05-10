"""Spend monitoring — summaries and overspend alerts (amounts in account currency, INR for WoodWaley)."""
import reports
from config import get_settings

settings = get_settings()


def get_spend_summary() -> dict:
    def _spend(data: list[dict]) -> float:
        return float(data[0].get("spend", 0)) if data else 0.0

    return {
        "today": _spend(reports.get_account_insights("today")),
        "last_7d": _spend(reports.get_account_insights("last_7d")),
        "last_30d": _spend(reports.get_account_insights("last_30d")),
    }


def check_spend_alert(threshold: float | None = None) -> dict:
    threshold = threshold or settings.SPEND_ALERT_THRESHOLD_INR
    today_spend = get_spend_summary()["today"]
    alert = today_spend >= threshold
    return {
        "alert": alert,
        "today_spend": today_spend,
        "threshold": threshold,
        "message": (
            f"ALERT: Today's spend ₹{today_spend:.2f} exceeded threshold ₹{threshold:.2f}"
            if alert
            else f"Spend OK: ₹{today_spend:.2f} / ₹{threshold:.2f} threshold"
        ),
    }


def get_top_campaigns(date_preset: str = "last_7d", limit: int = 5) -> list[dict]:
    insights = reports.get_campaign_insights(date_preset)
    return sorted(insights, key=lambda x: float(x.get("spend", 0)), reverse=True)[:limit]
