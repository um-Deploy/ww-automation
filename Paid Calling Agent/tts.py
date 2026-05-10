"""
ElevenLabs TTS — human-like Indian female voice.
Uses eleven_turbo_v2_5 for low latency on phone calls.
"""
import re
import uuid
import asyncio
from pathlib import Path
from elevenlabs import ElevenLabs, VoiceSettings
from config import get_settings

settings = get_settings()

AUDIO_DIR = Path("audio_cache")
AUDIO_DIR.mkdir(exist_ok=True)

_client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)

# Tuned for natural Indian female phone voice
_VOICE_SETTINGS = VoiceSettings(
    stability=0.40,          # lower = more expressive & natural
    similarity_boost=0.80,
    style=0.35,              # adds warmth and personality
    use_speaker_boost=True,
)


def _clean(text: str) -> str:
    """Strip action tags, clean up text for speech."""
    text = re.sub(r"##ACTION##.*$", "", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def _generate(text: str) -> bytes:
    audio = _client.text_to_speech.convert(
        voice_id=settings.ELEVENLABS_VOICE_ID,
        text=text,
        model_id="eleven_turbo_v2_5",
        voice_settings=_VOICE_SETTINGS,
        output_format="mp3_44100_128",
    )
    return b"".join(audio)


async def text_to_speech(text: str) -> str:
    """Generate audio, return filename (served at /audio/<file>)."""
    audio_id = str(uuid.uuid4())
    file_path = AUDIO_DIR / f"{audio_id}.mp3"
    clean = _clean(text)
    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(None, _generate, clean)
    file_path.write_bytes(data)
    return f"{audio_id}.mp3"


def cleanup_audio(filename: str):
    try:
        (AUDIO_DIR / filename).unlink(missing_ok=True)
    except Exception:
        pass
