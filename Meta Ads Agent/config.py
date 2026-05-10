from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,   # ignore blank system env vars — use .env values
        extra="ignore",
    )

    META_ACCESS_TOKEN: str
    META_AD_ACCOUNT_ID: str          # format: act_XXXXXXXXX
    META_APP_ID: str = "1286187906991679"
    META_APP_SECRET: str = ""        # optional — only needed for token refresh

    ANTHROPIC_API_KEY: str

    GOOGLE_SHEET_ID: str
    GOOGLE_SERVICE_ACCOUNT_KEY_PATH: str = "../credentials/ww-ai-automation-6e7f331fdd57.json"

    SPEND_ALERT_THRESHOLD_INR: float = 2000.0   # in account currency (INR for WoodWaley)
    BUSINESS_NAME: str = "WoodWaley"


@lru_cache
def get_settings() -> Settings:
    return Settings()
