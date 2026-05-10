"""Groq conversation manager — free, ultra-fast, one session per call."""
import json
import re
from groq import Groq
from config import get_settings
from prompts import SYSTEM_PROMPT

settings = get_settings()
_client  = Groq(api_key=settings.GROQ_API_KEY)
_MODEL   = "llama-3.3-70b-versatile"

_sessions: dict[str, list[dict]] = {}


def init_session(call_sid: str):
    _sessions[call_sid] = []


def clear_session(call_sid: str):
    _sessions.pop(call_sid, None)


def _system() -> str:
    return SYSTEM_PROMPT.format(
        agent_name=settings.AGENT_NAME,
        business_name=settings.BUSINESS_NAME,
    )


def _extract_action(text: str) -> dict | None:
    match = re.search(r"##ACTION##\s*(\{.*?\})", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    return None


def _strip_action(text: str) -> str:
    return re.sub(r"##ACTION##.*$", "", text, flags=re.DOTALL).strip()


async def get_response(call_sid: str, user_input: str) -> tuple[str, dict | None]:
    history = _sessions.setdefault(call_sid, [])
    history.append({"role": "user", "content": user_input})

    resp = _client.chat.completions.create(
        model=_MODEL,
        messages=[{"role": "system", "content": _system()}, *history],
        max_tokens=300,
        temperature=0.7,
    )

    full  = resp.choices[0].message.content
    action = _extract_action(full)
    spoken = _strip_action(full)
    history.append({"role": "assistant", "content": full})
    return spoken, action
