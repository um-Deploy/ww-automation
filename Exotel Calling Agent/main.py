"""
WoodWaley — Exotel Voice Calling Agent
────────────────────────────────────────
Indian number (+91) + ElevenLabs Indian female voice + Groq AI + Groq Whisper STT

Call flow:
  1. make_call.py → Exotel dials lead with Indian number
  2. Lead picks up → /voice/start → plays ElevenLabs greeting
  3. Records lead's speech → /voice/transcribe
  4. Groq Whisper transcribes → Groq LLaMA responds → ElevenLabs speaks
  5. Loop until order/followup/hangup → log to Google Sheets
"""
import asyncio
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, tostring

import uvicorn
from fastapi import FastAPI, Request, Response, BackgroundTasks
from fastapi.responses import FileResponse

from config import get_settings
from conversation import init_session, get_response, clear_session
from tts import text_to_speech, cleanup_audio, AUDIO_DIR
from stt import transcribe_recording
from sheets import log_call
from prompts import GREETING

settings = get_settings()
app = FastAPI(title="WoodWaley Exotel Voice Agent")

_call_meta: dict[str, dict] = {}  # call_sid → {lead_name, phone}


# ── ExoML helpers ──────────────────────────────────────────────────────────────

def _exoml_play_and_record(audio_file: str) -> str:
    """Play audio then record lead's response."""
    response = Element("Response")

    play = SubElement(response, "Play")
    play.text = f"{settings.BASE_URL}/audio/{audio_file}"

    SubElement(response, "Record",
        action=f"{settings.BASE_URL}/voice/transcribe",
        method="POST",
        maxLength="15",
        timeout="3",
        playBeep="false",
        finishOnKey="",
    )
    return '<?xml version="1.0" encoding="UTF-8"?>' + tostring(response, encoding="unicode")


def _exoml_play_and_hangup(audio_file: str | None = None) -> str:
    """Play final message then hang up."""
    response = Element("Response")
    if audio_file:
        play = SubElement(response, "Play")
        play.text = f"{settings.BASE_URL}/audio/{audio_file}"
    SubElement(response, "Hangup")
    return '<?xml version="1.0" encoding="UTF-8"?>' + tostring(response, encoding="unicode")


def _exoml_hangup() -> str:
    response = Element("Response")
    SubElement(response, "Hangup")
    return '<?xml version="1.0" encoding="UTF-8"?>' + tostring(response, encoding="unicode")


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.post("/voice/start")
async def voice_start(request: Request):
    """Exotel calls this when lead picks up."""
    form      = await request.form()
    call_sid  = form.get("CallSid", "")
    to_number = form.get("To", "unknown")
    lead_name = request.query_params.get("lead_name", "").replace("+", " ").strip() or "there"

    _call_meta[call_sid] = {"lead_name": lead_name, "phone": to_number}
    init_session(call_sid)

    greeting = GREETING.format(
        lead_name=lead_name,
        agent_name=settings.AGENT_NAME,
        business_name=settings.BUSINESS_NAME,
    )
    audio = await text_to_speech(greeting)
    return Response(content=_exoml_play_and_record(audio), media_type="text/xml")


@app.post("/voice/transcribe")
async def voice_transcribe(request: Request, bg: BackgroundTasks):
    """Receives Exotel recording → transcribes → responds."""
    form          = await request.form()
    call_sid      = form.get("CallSid", "")
    recording_url = form.get("RecordingUrl", "")
    duration      = int(form.get("RecordingDuration", 0))
    meta          = _call_meta.get(call_sid, {})
    lead_name     = meta.get("lead_name", "Lead")
    phone         = meta.get("phone", "unknown")

    print(f"[Call] {call_sid} | Recording: {duration}s | URL: {recording_url}")

    # Too short = silence or noise
    if duration < 1 or not recording_url:
        audio = await text_to_speech("Sorry, I did not hear that. Could you please say that again?")
        return Response(content=_exoml_play_and_record(audio), media_type="text/xml")

    # Transcribe with Groq Whisper (free)
    transcript = await transcribe_recording(recording_url)

    if not transcript:
        audio = await text_to_speech("Sorry, I could not understand that clearly. Could you repeat please?")
        return Response(content=_exoml_play_and_record(audio), media_type="text/xml")

    # Get AI response from Groq LLaMA
    spoken, action = await get_response(call_sid, transcript)

    # Terminal action — log and end call
    if action and action.get("type") in ("order", "followup", "not_interested", "callback", "hangup"):
        audio = await text_to_speech(spoken) if spoken else None
        if action.get("type") != "hangup":
            farewell = await text_to_speech(
                "Thank you so much for your time! We will be in touch very soon. Have a wonderful day, goodbye!"
            )
            bg.add_task(_finish, call_sid, lead_name, phone, action, audio, farewell)
            response = Element("Response")
            if audio:
                p1 = SubElement(response, "Play")
                p1.text = f"{settings.BASE_URL}/audio/{audio}"
            p2 = SubElement(response, "Play")
            p2.text = f"{settings.BASE_URL}/audio/{farewell}"
            SubElement(response, "Hangup")
            xml = '<?xml version="1.0" encoding="UTF-8"?>' + tostring(response, encoding="unicode")
            return Response(content=xml, media_type="text/xml")
        bg.add_task(_finish, call_sid, lead_name, phone, action, None, None)
        return Response(content=_exoml_hangup(), media_type="text/xml")

    # Continue conversation
    audio = await text_to_speech(spoken)
    return Response(content=_exoml_play_and_record(audio), media_type="text/xml")


@app.post("/voice/status")
async def voice_status(request: Request):
    """Exotel status callback."""
    form     = await request.form()
    call_sid = form.get("CallSid", "")
    status   = form.get("Status", "")
    print(f"[Status] {call_sid} → {status}")
    if status in ("completed", "busy", "no-answer", "failed"):
        _call_meta.pop(call_sid, None)
        clear_session(call_sid)
    return Response(status_code=204)


@app.get("/audio/{filename}")
async def serve_audio(filename: str, bg: BackgroundTasks):
    path = AUDIO_DIR / filename
    if not path.exists():
        return Response(status_code=404)
    bg.add_task(_delayed_delete, filename)
    return FileResponse(path, media_type="audio/mpeg")


# ── Background helpers ─────────────────────────────────────────────────────────

async def _finish(call_sid, lead_name, phone, action, audio1, audio2):
    try:
        await log_call(lead_name, phone, call_sid, action)
    except Exception as e:
        print(f"[Sheets] {e}")
    clear_session(call_sid)
    _call_meta.pop(call_sid, None)
    await asyncio.sleep(15)
    if audio1: cleanup_audio(audio1)
    if audio2: cleanup_audio(audio2)


async def _delayed_delete(filename: str):
    await asyncio.sleep(60)
    cleanup_audio(filename)


# ── Entry ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=False)
