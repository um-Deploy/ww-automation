"""
WoodWaley Paid Voice Calling Agent
────────────────────────────────────
ElevenLabs Indian female voice + Claude AI + Twilio calls
"""
import asyncio
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request, Response, BackgroundTasks
from fastapi.responses import FileResponse
from twilio.twiml.voice_response import VoiceResponse, Gather

from config import get_settings
from conversation import init_session, get_response, clear_session
from tts import text_to_speech, cleanup_audio, AUDIO_DIR
from sheets import log_call
from prompts import GREETING

settings = get_settings()
app = FastAPI(title="WoodWaley Voice Agent — Paid")

_call_meta: dict[str, dict] = {}


# ── TwiML helpers ─────────────────────────────────────────────────────────────

def _gather(audio_file: str, action: str) -> str:
    response = VoiceResponse()
    gather = Gather(
        input="speech",
        action=action,
        method="POST",
        timeout=8,
        speech_timeout="auto",
        speech_model="experimental_conversations",
        language="en-IN",
        enhanced=True,
    )
    gather.play(f"{settings.BASE_URL}/audio/{audio_file}")
    response.append(gather)
    response.redirect(f"{settings.BASE_URL}/voice/silence", method="POST")
    return str(response)


def _hangup(audio_file: str | None = None) -> str:
    response = VoiceResponse()
    if audio_file:
        response.play(f"{settings.BASE_URL}/audio/{audio_file}")
    response.hangup()
    return str(response)


# ── Webhook routes ─────────────────────────────────────────────────────────────

@app.post("/voice/start")
async def voice_start(request: Request):
    form = await request.form()
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
    return Response(
        content=_gather(audio, f"{settings.BASE_URL}/voice/respond"),
        media_type="text/xml",
    )


@app.post("/voice/respond")
async def voice_respond(request: Request, bg: BackgroundTasks):
    form       = await request.form()
    call_sid   = form.get("CallSid", "")
    transcript = form.get("SpeechResult", "").strip()
    confidence = float(form.get("Confidence", 0))
    meta       = _call_meta.get(call_sid, {})
    lead_name  = meta.get("lead_name", "Lead")
    phone      = meta.get("phone", "unknown")

    print(f"[STT] '{transcript}' (confidence: {confidence:.2f})")

    if not transcript or confidence < 0.1:
        audio = await text_to_speech("Sorry, I didn't catch that. Could you say that again?")
        return Response(content=_gather(audio, f"{settings.BASE_URL}/voice/respond"), media_type="text/xml")

    spoken, action = await get_response(call_sid, transcript)

    # Terminal actions — log and hang up
    if action and action.get("type") in ("order", "followup", "not_interested", "callback", "hangup"):
        audio = await text_to_speech(spoken) if spoken else None
        if action.get("type") != "hangup":
            farewell_audio = await text_to_speech("Thank you so much for your time! We will be in touch very soon. Have a wonderful day, goodbye!")
            bg.add_task(_finish_call, call_sid, lead_name, phone, action, audio, farewell_audio)
            response = VoiceResponse()
            if audio:
                response.play(f"{settings.BASE_URL}/audio/{audio}")
            response.play(f"{settings.BASE_URL}/audio/{farewell_audio}")
            response.hangup()
            return Response(content=str(response), media_type="text/xml")
        bg.add_task(_finish_call, call_sid, lead_name, phone, action, audio, None)
        return Response(content=_hangup(audio), media_type="text/xml")

    audio = await text_to_speech(spoken)
    return Response(content=_gather(audio, f"{settings.BASE_URL}/voice/respond"), media_type="text/xml")


@app.post("/voice/silence")
async def voice_silence(request: Request):
    audio = await text_to_speech("Hello, are you still there? Just let me know if you would like to hear more.")
    form = await request.form()
    call_sid = form.get("CallSid", "")
    return Response(content=_gather(audio, f"{settings.BASE_URL}/voice/respond"), media_type="text/xml")


@app.post("/voice/status")
async def voice_status(request: Request):
    form     = await request.form()
    call_sid = form.get("CallSid", "")
    status   = form.get("CallStatus", "")
    print(f"[Call] {call_sid} → {status}")
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


# ── Background tasks ───────────────────────────────────────────────────────────

async def _finish_call(call_sid, lead_name, phone, action, audio1, audio2):
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


# ── Start ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=False)
