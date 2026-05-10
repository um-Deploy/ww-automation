"""
Free STT using Groq Whisper — transcribes Exotel call recordings.
Downloads recording from Exotel, transcribes with Whisper large-v3.
"""
import httpx
import tempfile
import os
from groq import Groq
from config import get_settings

settings = get_settings()
_client = Groq(api_key=settings.GROQ_API_KEY)


async def transcribe_recording(recording_url: str) -> str:
    """Download Exotel recording and transcribe with Groq Whisper (free)."""
    # Exotel recordings require Basic auth
    auth = (settings.EXOTEL_API_KEY, settings.EXOTEL_API_TOKEN)

    async with httpx.AsyncClient(timeout=30) as http:
        resp = await http.get(recording_url, auth=auth, follow_redirects=True)
        if resp.status_code != 200:
            print(f"[STT] Failed to download recording: {resp.status_code}")
            return ""
        audio_data = resp.content

    # Save to temp file and transcribe
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp.write(audio_data)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            transcription = _client.audio.transcriptions.create(
                file=f,
                model="whisper-large-v3",
                language="en",
                response_format="text",
            )
        transcript = transcription.strip() if isinstance(transcription, str) else transcription.text.strip()
        print(f"[STT] Transcript: '{transcript}'")
        return transcript
    except Exception as e:
        print(f"[STT] Error: {e}")
        return ""
    finally:
        os.unlink(tmp_path)
