"""
Free TTS using Google Translate India voice (gTTS).
Uses tld='co.in' for distinctly Indian female accent.
No API key required.
"""
import re
import uuid
from pathlib import Path
from gtts import gTTS

from config import get_settings

settings = get_settings()

AUDIO_DIR = Path("audio_cache")
AUDIO_DIR.mkdir(exist_ok=True)


def _clean_text(text: str) -> str:
    """Strip markers, make text natural for speech."""
    text = re.sub(r"\.\.\.", " ", text)
    text = re.sub(r"—", ", ", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


async def text_to_speech(text: str) -> str:
    """Generate MP3 using Google India TTS. Returns filename."""
    audio_id = str(uuid.uuid4())
    file_path = AUDIO_DIR / f"{audio_id}.mp3"

    clean = _clean_text(text)

    # lang='en' + tld='co.in' = Google's Indian English voice (female, clearly Indian)
    tts = gTTS(text=clean, lang="en", tld="co.in", slow=False)
    tts.save(str(file_path))

    return f"{audio_id}.mp3"


def cleanup_audio(filename: str):
    try:
        (AUDIO_DIR / filename).unlink(missing_ok=True)
    except Exception:
        pass
