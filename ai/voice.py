"""Server-side Gemini speech synthesis for stored assistant messages."""
import base64
import html
import os
import re

from django.conf import settings
from django.utils.html import strip_tags

from .services import GeminiProviderError, _gemini_provider_error

MAX_VOICE_CHARS = 2500
LANGUAGES = {"ru": "Russian", "tg": "Tajik", "en": "English"}


def synthesize_answer(answer, language):
    if language not in LANGUAGES:
        raise ValueError("Unsupported answer language")
    plain = re.sub(r"\s+", " ", html.unescape(strip_tags(answer))).strip()
    if not plain or len(plain) > MAX_VOICE_CHARS:
        raise ValueError("Answer is empty or exceeds the speech limit")
    key = os.environ.get("GEMINI_API_KEY", getattr(settings, "GEMINI_API_KEY", "")).strip()
    if not key:
        raise GeminiProviderError("AI_NOT_CONFIGURED", "Gemini speech is not configured on this server.", 503)
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=key, http_options=types.HttpOptions(timeout=min(120000, max(1000, settings.GEMINI_TIMEOUT_MS))))
        interaction = client.interactions.create(
            model=settings.GEMINI_TTS_MODEL,
            input=[{"type": "user_input", "content": [{"type": "text", "text": plain, "annotations": [{"type": "speech_metadata", "style": f"Read clearly in {LANGUAGES[language]}. Preserve the language and words of the text."}]}]}],
            response_format={"type": "audio"},
            generation_config={"speech_config": [{"voice": settings.GEMINI_TTS_VOICE}]},
        )
        audio_data = interaction.output_audio.data
        audio = base64.b64decode(audio_data, validate=True)
        if not audio.startswith(b"RIFF") or audio[8:12] != b"WAVE":
            raise ValueError("Gemini did not return WAV audio")
        return audio
    except GeminiProviderError:
        raise
    except Exception as exc:
        raise _gemini_provider_error(exc) from exc
