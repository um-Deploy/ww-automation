from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Exotel
    EXOTEL_ACCOUNT_SID: str
    EXOTEL_API_KEY: str
    EXOTEL_API_TOKEN: str
    EXOTEL_VIRTUAL_NUMBER: str

    # AI
    GROQ_API_KEY: str

    # Voice
    ELEVENLABS_API_KEY: str
    ELEVENLABS_VOICE_ID: str

    # Sheets
    GOOGLE_SHEET_ID: str
    GOOGLE_SERVICE_ACCOUNT_KEY_PATH: str = "../credentials/ww-ai-automation-6e7f331fdd57.json"

    # Server
    BASE_URL: str
    PORT: int = 8000

    # Agent
    BUSINESS_NAME: str = "WoodWaley"
    AGENT_NAME: str = "Priya"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
