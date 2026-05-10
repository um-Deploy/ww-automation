"""
WoodWaley Voice Calling Agent
─────────────────────────────
FastAPI server that handles Twilio voice webhooks.

Flow per call:
  1. Twilio hits /voice/start  → agent greets lead (ElevenLabs audio)
  2. Twilio <Gather> captures lead's speech → sends transcript to /voice/respond
  3. Claude processes transcript → generates response
  4. ElevenLabs converts response to audio → served at /audio/<file>
  5. Loop until action=hangup/order/followup
"""
import asyncio
import json
import os
from pathlib import Path
from urllib.parse import urlencode

import aiofiles
import uvicorn
from fastapi import FastAPI, Request, Response, BackgroundTasks
from fastapi.responses import FileResponse
from twilio.twiml.voice_response import VoiceResponse, Gather

from config import get_settings
from conversation import init_session, get_response, clear_session
from tts import text_to_speech, cleanup_audio, AUDIO_DIR
from sheets import log_call
from prompts import GREETING, NOT_AVAILABLE

settings = get_settings()
app = FastAPI(title="WoodWaley Voice Agent")

# call_sid → {lead_name, phone}
_call_meta: dict[str, dict] = {}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _twiml_play_and_gather(audio_file: str, gather_action: str) -> str:
    response = VoiceResponse()
    gather = Gather(
        input="speech",
        action=gather_action,
        method="POST",
        timeout=10,
        speech_timeout="3",
        speech_model="experimental_conversations",
        language="en-IN",
        enhanced=True,
    )
    gather.play(f"{settings.BASE_URL}/audio/{audio_file}")
    response.append(gather)
    # Fallback: if no speech detected, redirect to silence handler
    response.redirect(f"{settings.BASE_URL}/voice/silence", method="POST")
    return str(response)


def _twiml_hangup(audio_file: str | None = None) -> str:
    response = VoiceResponse()
    if audio_file:
        response.play(f"{settings.BASE_URL}/audio/{audio_file}")
    response.hangup()
    return str(response)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/voice/start")
async def voice_start(request: Request):
    """Entry point — Twilio calls this when lead picks up."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    caller   = form.get("To", "unknown")          # outbound: 'To' is the lead

    # lead_name passed as query param by make_call.py
    lead_name = request.query_params.get("lead_name", "").replace("+", " ").strip() or "there"
    _call_meta[call_sid] = {"lead_name": lead_name, "phone": caller}

    init_session(call_sid, lead_name)

    greeting_text = GREETING.format(
        lead_name=lead_name,
        agent_name=settings.AGENT_NAME,
        business_name=settings.BUSINESS_NAME,
    )
    audio_file = await text_to_speech(greeting_text)
    twiml = _twiml_play_and_gather(audio_file, f"{settings.BASE_URL}/voice/respond")
    return Response(content=twiml, media_type="text/xml")


@app.post("/voice/respond")
async def voice_respond(request: Request, background_tasks: BackgroundTasks):
    """Called by Twilio with lead's speech transcript."""
    form = await request.form()
    call_sid   = form.get("CallSid", "")
    transcript = form.get("SpeechResult", "").strip()
    confidence = float(form.get("Confidence", 0))
    meta       = _call_meta.get(call_sid, {})
    lead_name  = meta.get("lead_name", "Lead")
    phone      = meta.get("phone", "unknown")

    # Low confidence or empty speech
    if not transcript or confidence < 0.1:
        audio_file = await text_to_speech(NOT_AVAILABLE)
        twiml = _twiml_play_and_gather(
            audio_file, f"{settings.BASE_URL}/voice/respond"
        )
        return Response(content=twiml, media_type="text/xml")

    spoken, action = await get_response(call_sid, transcript)

    # Handle terminal actions
    if action and action.get("type") == "hangup":
        audio_file = await text_to_speech(spoken) if spoken else None
        background_tasks.add_task(_cleanup_call, call_sid, lead_name, phone, action, audio_file)
        return Response(content=_twiml_hangup(audio_file), media_type="text/xml")

    if action and action.get("type") in ("order", "followup", "not_interested", "callback"):
        # Confirm, then hang up
        audio_file = await text_to_speech(spoken)
        background_tasks.add_task(_cleanup_call, call_sid, lead_name, phone, action, audio_file)
        farewell = await text_to_speech(
            "Thank you so much for your time! ... We'll be in touch very soon. Have a wonderful day, goodbye!"
        )
        response = VoiceResponse()
        response.play(f"{settings.BASE_URL}/audio/{audio_file}")
        response.play(f"{settings.BASE_URL}/audio/{farewell}")
        response.hangup()
        return Response(content=str(response), media_type="text/xml")

    # Continue conversation
    audio_file = await text_to_speech(spoken)
    twiml = _twiml_play_and_gather(audio_file, f"{settings.BASE_URL}/voice/respond")
    return Response(content=twiml, media_type="text/xml")


@app.post("/voice/silence")
async def voice_silence(request: Request):
    """Lead didn't say anything — give a gentle prompt."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    audio_file = await text_to_speech(
        "Hello? ... Are you still there? ... Just let me know if you'd like to hear more about our gifting options."
    )
    twiml = _twiml_play_and_gather(audio_file, f"{settings.BASE_URL}/voice/respond")
    return Response(content=twiml, media_type="text/xml")


@app.post("/voice/status")
async def voice_status(request: Request):
    """Twilio status callback — log when call ends unexpectedly."""
    form = await request.form()
    call_sid = form.get("CallSid", "")
    status   = form.get("CallStatus", "")
    if status in ("completed", "busy", "no-answer", "failed") and call_sid in _call_meta:
        meta = _call_meta.pop(call_sid, {})
        clear_session(call_sid)
    return Response(content="", status_code=204)


@app.get("/audio/{filename}")
async def serve_audio(filename: str, background_tasks: BackgroundTasks):
    """Serve generated ElevenLabs audio, then delete file."""
    path = AUDIO_DIR / filename
    if not path.exists():
        return Response(status_code=404)
    # Delete after 60s to ensure Twilio has fetched it
    background_tasks.add_task(_delayed_cleanup, filename)
    return FileResponse(path, media_type="audio/mpeg")


# ── Background helpers ────────────────────────────────────────────────────────

async def _cleanup_call(call_sid: str, lead_name: str, phone: str, action: dict, audio_file: str | None):
    try:
        await log_call(lead_name, phone, call_sid, action)
    except Exception as e:
        print(f"[Sheets] Failed to log call {call_sid}: {e}")
    clear_session(call_sid)
    _call_meta.pop(call_sid, None)
    if audio_file:
        await asyncio.sleep(10)
        cleanup_audio(audio_file)


async def _delayed_cleanup(filename: str):
    await asyncio.sleep(60)
    cleanup_audio(filename)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
