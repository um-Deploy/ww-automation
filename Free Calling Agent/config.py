from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str

    GROQ_API_KEY: str

    GOOGLE_SHEET_ID: str
    GOOGLE_SERVICE_ACCOUNT_KEY_PATH: str = "../credentials/google-service-account.json"

    BASE_URL: str
    PORT: int = 8000

    BUSINESS_NAME: str = "WoodWaley"
    AGENT_NAME: str = "Priya"

    # Microsoft Edge TTS — completely free, no key needed
    # Best Indian female voices:
    #   en-IN-NeerjaNeural   ← recommended (warm, natural)
    #   en-IN-AaravNeural    ← male alternative
    TTS_VOICE: str = "en-IN-NeerjaNeural"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
